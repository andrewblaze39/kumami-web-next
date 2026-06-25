# TipTap Integration Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix TipTap so it's fully separate from classic mode — no data loss, sections always populated, progress tracking works identically in both modes.

**Architecture:** When saving a TipTap article, derive a `sections` array from the TipTap JSONContent (split on H2 headings) and save BOTH `tiptapContent` AND `sections` to Firestore. This means every article always has a valid `sections` array regardless of editor mode. The course page, progress tracking, and article renderer all continue to use `sections` as the single source of truth for structure. TipTap only changes the admin editing experience.

**Tech Stack:** Next.js 16, React 19, TipTap, Firebase Firestore, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/tiptapToSections.ts` | CREATE | Pure utility: convert TipTap JSONContent → classic sections array |
| `src/components/admin/PublishEducation.tsx` | MODIFY | On save with TipTap mode: derive sections from tiptapContent, save BOTH |
| `src/components/admin/EditEducation.tsx` | MODIFY | Same as Publish. Add warning on BOTH direction switches. Never clear sections. |
| `src/components/education/EducationArticleRenderer.tsx` | MODIFY | Remove `tiptapToSections` inline function (moved to shared util). Remove tiptap-specific imports. Always use `article.sections`. |
| `src/components/education/TipTapRenderer.tsx` | DELETE | Orphaned, never used |
| `scripts/remigrateTiptap.ts` | CREATE | One-time script: re-derive sections for all existing tiptap articles |

Files that need NO changes (they already work with `sections`):
- `src/app/education/[phase]/page.tsx` — already reads `article.sections`
- `src/hooks/useEducationProgress.ts` — already tracks by section index
- `src/app/education/dashboard/page.tsx` — already counts sections
- `src/components/education/EducationSidebar.tsx` — no change needed

---

### Task 1: Create shared tiptapToSections utility

**Files:**
- Create: `src/lib/tiptapToSections.ts`

- [ ] **Step 1: Create the utility file**

This is a pure function — no React, no hooks, no imports from admin components. Extract and improve the `tiptapToSections` logic currently inline in `EducationArticleRenderer.tsx`.

```typescript
// src/lib/tiptapToSections.ts

interface SectionContent {
  type: 'paragraph' | 'image' | 'youtube' | 'table'
  text?: string
  src?: string
  alt?: string
  caption?: string
  videoId?: string
  title?: string
  headers?: string[]
  rows?: string[][]
  rowsJson?: string
}

interface Section {
  title: string
  content: SectionContent[]
}

/**
 * Convert TipTap JSONContent to classic sections array.
 * Splits on H2 headings — each H2 starts a new section.
 * Content before the first H2 goes into a section titled "Introduction".
 */
export function tiptapToSections(tiptapContent: unknown): Section[] {
  const doc = tiptapContent as { type?: string; content?: Array<Record<string, unknown>> }
  if (!doc?.content) return []

  const sections: Section[] = []
  let currentSection: Section = { title: '', content: [] }

  for (const node of doc.content) {
    const nodeType = node.type as string

    // H2 headings start a new section
    if (nodeType === 'heading' && (node.attrs as Record<string, unknown>)?.level === 2) {
      if (currentSection.title || currentSection.content.length > 0) {
        // Give untitled first section a default name
        if (!currentSection.title && sections.length === 0) {
          currentSection.title = 'Introduction'
        }
        sections.push(currentSection)
      }
      const textContent = ((node.content as Array<{ text?: string }>) || [])
        .map(n => n.text || '').join('')
      currentSection = { title: textContent, content: [] }
      continue
    }

    // Paragraphs
    if (nodeType === 'paragraph') {
      const text = nodeToMarkdown(node)
      if (text.trim()) {
        currentSection.content.push({ type: 'paragraph', text })
      }
      continue
    }

    // Bullet/ordered lists
    if (nodeType === 'bulletList' || nodeType === 'orderedList') {
      const items = (node.content as Array<Record<string, unknown>>) || []
      const lines = items.map(li => {
        const liContent = (li.content as Array<Record<string, unknown>>) || []
        return `• ${liContent.map(p => nodeToMarkdown(p)).join('')}`
      })
      currentSection.content.push({ type: 'paragraph', text: lines.join('\n') })
      continue
    }

    // H1/H3 headings as bold paragraph
    if (nodeType === 'heading') {
      const text = ((node.content as Array<{ text?: string }>) || []).map(n => n.text || '').join('')
      currentSection.content.push({ type: 'paragraph', text: `**${text}**` })
      continue
    }

    // Images
    if (nodeType === 'image') {
      const attrs = node.attrs as Record<string, string> | undefined
      currentSection.content.push({
        type: 'image',
        src: attrs?.src || '',
        alt: attrs?.alt || '',
        caption: attrs?.title || '',
      })
      continue
    }

    // YouTube
    if (nodeType === 'youtube') {
      const attrs = node.attrs as Record<string, string> | undefined
      const src = attrs?.src || ''
      const videoId = src.match(/(?:v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1] || src
      currentSection.content.push({ type: 'youtube', videoId, title: '' })
      continue
    }

    // Tables
    if (nodeType === 'table') {
      const rows = (node.content as Array<Record<string, unknown>>) || []
      const headers: string[] = []
      const dataRows: string[][] = []
      rows.forEach((row, ri) => {
        const cells = (row.content as Array<Record<string, unknown>>) || []
        const cellTexts = cells.map(cell => {
          const cellContent = (cell.content as Array<Record<string, unknown>>) || []
          return cellContent.map(p => nodeToMarkdown(p)).join('')
        })
        if (ri === 0) headers.push(...cellTexts)
        else dataRows.push(cellTexts)
      })
      currentSection.content.push({ type: 'table', headers, rows: dataRows })
      continue
    }
  }

  // Push last section
  if (currentSection.title || currentSection.content.length > 0) {
    if (!currentSection.title && sections.length === 0) {
      currentSection.title = 'Introduction'
    }
    sections.push(currentSection)
  }

  return sections
}

function nodeToMarkdown(node: Record<string, unknown>): string {
  const content = (node.content as Array<Record<string, unknown>>) || []
  return content.map(n => {
    const text = (n.text as string) || ''
    const marks = (n.marks as Array<{ type: string }>) || []
    let result = text
    for (const mark of marks) {
      if (mark.type === 'bold') result = `**${result}**`
      else if (mark.type === 'italic') result = `*${result}*`
      else if (mark.type === 'underline') result = `__${result}__`
    }
    return result
  }).join('')
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/lib/tiptapToSections.ts`
Or just: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/tiptapToSections.ts
git commit -m "feat: extract tiptapToSections utility"
```

---

### Task 2: Fix PublishEducation — save sections alongside tiptapContent

**Files:**
- Modify: `src/components/admin/PublishEducation.tsx`

- [ ] **Step 1: Import the utility**

Add at top of file:
```typescript
import { tiptapToSections } from '@/lib/tiptapToSections';
```

- [ ] **Step 2: Fix the save logic — derive sections from TipTap on save**

Find the block (around line 163-182):
```typescript
if (editorMode === 'tiptap') {
  docData.tiptapContent = tiptapContent ?? {};
  docData.sections = [];  // ← THIS IS THE BUG
}
```

Replace with:
```typescript
if (editorMode === 'tiptap') {
  docData.tiptapContent = tiptapContent ?? {};
  // Derive sections from TipTap content so course page, progress, etc. all work
  const derivedSections = tiptapToSections(tiptapContent);
  docData.sections = derivedSections.map(s => ({
    title: s.title,
    content: s.content.map(({ type, text, src, alt, caption, videoId, title: t, headers, rows }) =>
      type === 'paragraph' ? { type, text }
      : type === 'image' ? { type, src, alt, caption }
      : type === 'table' ? { type, headers, rowsJson: JSON.stringify(rows || []) }
      : { type, videoId, title: t, caption }
    ),
  }));
}
```

- [ ] **Step 3: Add warning when switching modes (both directions)**

Find the mode toggle buttons. Add confirmation when switching FROM tiptap TO classic:
```typescript
<button
  type="button"
  onClick={() => {
    if (editorMode === 'tiptap' && tiptapContent) {
      if (!window.confirm('Switch to Classic? Your TipTap content will still be saved, but you will edit using the section builder.')) return;
    }
    setEditorMode('classic');
  }}
  ...
>Classic</button>
<button
  type="button"
  onClick={() => {
    if (editorMode === 'classic' && sections.some(s => s.content.length > 0)) {
      if (!window.confirm('Switch to TipTap? Your classic sections will still be saved, but you will edit using the TipTap editor.')) return;
    }
    setEditorMode('tiptap');
  }}
  ...
>TipTap</button>
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: Clean compile, no errors

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/PublishEducation.tsx
git commit -m "fix: PublishEducation derives sections from TipTap on save"
```

---

### Task 3: Fix EditEducation — same treatment, never destroy data

**Files:**
- Modify: `src/components/admin/EditEducation.tsx`

- [ ] **Step 1: Import the utility**

```typescript
import { tiptapToSections } from '@/lib/tiptapToSections';
```

- [ ] **Step 2: Fix handleUpdate — derive sections from TipTap, keep both formats**

Find the block in `handleUpdate` (around line 186-207):
```typescript
if (editorMode === 'tiptap') {
  updatePayload.tiptapContent = tiptapContent ?? {};
  updatePayload.sections = [];  // ← BUG: clears sections
} else {
  // ...
  updatePayload.tiptapContent = null;  // ← BUG: destroys tiptap content
}
```

Replace with:
```typescript
if (editorMode === 'tiptap') {
  updatePayload.tiptapContent = tiptapContent ?? {};
  // Derive sections from TipTap content
  const derivedSections = tiptapToSections(tiptapContent);
  updatePayload.sections = derivedSections.map(s => ({
    title: s.title,
    content: s.content.map(({ type, text, src, alt, caption, videoId, title: t, headers, rows }) =>
      type === 'paragraph' ? { type, text: text || '' }
      : type === 'image' ? { type, src: src || '', alt: alt || '', caption: caption || '' }
      : type === 'table' ? { type, headers: headers || [], rowsJson: JSON.stringify(rows || []) }
      : { type, videoId: videoId || '', title: t || '', caption: caption || '' }
    ),
  }));
} else {
  const cleanedSections = sections
    .filter(s => s.title || s.content.length > 0)
    .map(s => ({
      title: s.title,
      content: s.content.map(({ type, text, src, alt, caption, videoId, title: t, headers, rows }) =>
        type === 'paragraph' ? { type, text: text || '' }
        : type === 'image' ? { type, src: src || '', alt: alt || '', caption: caption || '' }
        : type === 'table' ? { type, headers: headers || [], rowsJson: JSON.stringify(rows || []) }
        : { type, videoId: videoId || '', title: t || '', caption: caption || '' }
      ),
    }));
  updatePayload.sections = cleanedSections;
  // DO NOT clear tiptapContent — keep it so user can switch back
}
```

- [ ] **Step 3: Add symmetric warnings on mode switch**

Same pattern as Task 2 Step 3 — warn in BOTH directions, but never block. The warning says "content will still be saved" not "content will not transfer".

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: Clean compile

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/EditEducation.tsx
git commit -m "fix: EditEducation derives sections from TipTap, never destroys data"
```

---

### Task 4: Clean up EducationArticleRenderer — remove inline converter, always use sections

**Files:**
- Modify: `src/components/education/EducationArticleRenderer.tsx`

- [ ] **Step 1: Remove the inline tiptapToSections function and helper**

Delete the entire `tiptapToSections()` function and `tiptapNodeToText()` helper that are defined inline in this file (they've been moved to `src/lib/tiptapToSections.ts`).

- [ ] **Step 2: Simplify sections derivation**

Since sections are now ALWAYS populated (even for TipTap articles), change:
```typescript
const sections = (article.sections && article.sections.length > 0)
  ? article.sections
  : article.tiptapContent
    ? tiptapToSections(article.tiptapContent)
    : []
```

To simply:
```typescript
const sections = article.sections || []
```

- [ ] **Step 3: Remove unused imports**

Remove these if present (they were for the deleted TipTap branch):
- `import type { JSONContent } from '@tiptap/react'`
- `import dynamic from 'next/dynamic'`
- `const TipTapRenderer = dynamic(...)`
- Any reference to `article.tiptapContent` in the render logic
- Any reference to `article.editorMode` in the render logic

The `tiptapContent` and `editorMode` fields can also be removed from the `EducationArticleContentProps` interface in this file since the renderer no longer cares about them.

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: Clean compile

- [ ] **Step 5: Commit**

```bash
git add src/components/education/EducationArticleRenderer.tsx
git commit -m "fix: renderer always uses sections, remove tiptap-specific code"
```

---

### Task 5: Delete orphaned TipTapRenderer

**Files:**
- Delete: `src/components/education/TipTapRenderer.tsx`

- [ ] **Step 1: Verify no imports reference it**

Run: `grep -r "TipTapRenderer" src/ --include="*.tsx" --include="*.ts"`
Expected: No matches (if any found, remove the import line first)

- [ ] **Step 2: Delete the file**

```bash
rm src/components/education/TipTapRenderer.tsx
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: Clean compile

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove orphaned TipTapRenderer"
```

---

### Task 6: Re-migrate existing TipTap articles to have sections

**Files:**
- Create: `scripts/remigrateTiptap.ts`

- [ ] **Step 1: Create the script**

```typescript
/**
 * Re-derives sections for all TipTap articles that currently have sections: [].
 * This fixes the "0 sections" bug for already-migrated articles.
 *
 * Usage:
 *   npx ts-node scripts/remigrateTiptap.ts --dry-run
 *   npx ts-node scripts/remigrateTiptap.ts
 */

import admin from 'firebase-admin'
import path from 'path'
import fs from 'fs'
import { config } from 'dotenv'

// Copy the tiptapToSections function inline (to avoid TS module issues with ts-node)
// ... (paste the full function from src/lib/tiptapToSections.ts)

const envPath = path.resolve(import.meta.dirname ?? process.cwd(), '../.env.local')
config({ path: envPath })

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const keyfileIdx = args.indexOf('--keyfile')
const KEYFILE: string | null = keyfileIdx !== -1 ? args[keyfileIdx + 1] : null

function initFirebase() {
  if (KEYFILE) {
    const sa = JSON.parse(fs.readFileSync(KEYFILE, 'utf8'))
    admin.initializeApp({ credential: admin.credential.cert(sa) })
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    admin.initializeApp({ credential: admin.credential.cert(sa) })
  } else {
    throw new Error('No credentials found.')
  }
}

async function remigrate() {
  if (!DRY_RUN) initFirebase()
  const db = DRY_RUN ? null : admin.firestore()

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Re-deriving sections for TipTap articles...`)

  if (DRY_RUN) { console.log('  (dry run)'); return }

  const snap = await db!.collection('education_articles').get()
  let fixed = 0, skipped = 0

  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    const title = data.title || 'Untitled'

    if (!data.tiptapContent) { skipped++; continue }

    const sections = tiptapToSections(data.tiptapContent)

    if (sections.length === 0) {
      console.log(`  SKIP (no sections derived): ${title}`)
      skipped++
      continue
    }

    // Serialize tables
    const serialized = sections.map(s => ({
      title: s.title,
      content: s.content.map(item =>
        item.type === 'table'
          ? { ...item, rows: undefined, rowsJson: JSON.stringify(item.rows || []) }
          : item
      ),
    }))

    await docSnap.ref.update({ sections: serialized })
    console.log(`  ✓ FIXED: ${title} (${sections.length} sections)`)
    fixed++
  }

  console.log(`\nDone. Fixed: ${fixed} | Skipped: ${skipped}`)
}

remigrate().catch(err => { console.error('Fatal:', err); process.exit(1) })
```

- [ ] **Step 2: Run it**

```bash
npx ts-node scripts/remigrateTiptap.ts
```

Expected: All 11 migrated articles get their sections array populated.

- [ ] **Step 3: Commit**

```bash
git add scripts/remigrateTiptap.ts
git commit -m "fix: re-derive sections for existing tiptap articles"
```

---

### Task 7: End-to-end verification

- [ ] **Step 1: Build**

```bash
npm run build
```
Expected: Clean compile, 80 routes

- [ ] **Step 2: Manual testing checklist**

1. Open `/education/1` — all 7 chapters should show section count > 0 and read time
2. Click into a chapter article — step-by-step navigation works, progress bar shows, rail has sections
3. Complete some sections — progress saves, survives page refresh
4. Go to `/education/dashboard` — progress % matches course page
5. Go to admin → Edit Education → pick a TipTap article → verify TipTap editor loads with content
6. Switch to Classic → warning shown → sections appear in section builder
7. Switch back to TipTap → warning shown → TipTap content still there
8. Save in TipTap mode → verify Firestore has BOTH tiptapContent AND sections (non-empty)
9. Create new article in Classic mode → verify it works as before
10. Create new article in TipTap mode → verify sections derived on save

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "fix: tiptap integration — sections always derived, no data loss"
```
