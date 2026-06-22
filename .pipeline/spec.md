# Education System Revamp -- Implementation Spec

## OPEN QUESTIONS (non-blocking, decisions noted inline)

1. **Sidebar scope**: Should the sidebar show all 65 chapters across all 5 levels, or just the current level? **Decision**: Show only the current level's chapters. Cross-level navigation uses the level list at the top.
2. **`/education/all` page**: Keep or merge? **Decision**: Keep as-is. It serves a different purpose (flat search/filter view). Update it to handle both string and number `level` fields.

---

## INCONSISTENCIES FOUND (must fix during implementation)

1. **`level` field is string everywhere, but will become number.** The `EducationArticleRenderer` reads `article.level` as a string and parses it with regex. The `[phase]/page.tsx` also regex-parses. The admin writes `"Level 1"` as a string. All read paths must handle both `"Level 1"` (string) and `1` (number).

2. **`EducationGrid.tsx` duplicates level data.** It has its own `LEVELS` array (lines 23-44) with `num`, `name`, `emoji`, `color`, `blurb`, `skills` -- much of which duplicates `educationPhases.ts` `PHASES`. These must be unified.

3. **`AllEducationArticles.tsx` level filter uses exact string match** (`a.level === levelFilter` where `levelFilter` is `"Level 1"`). This will break when `level` becomes a number. Must use `parseLevelNumber()`.

4. **`fetchSiblingIds` in `article/[id]/page.tsx` orders by `__name__`** (document ID) for prev/next. This is alphabetical, not `chapterIndex` order. Once `chapterIndex` exists, ordering must use it.

5. **`[phase]/page.tsx` matches articles to chapters by title** (`articleMap.get(title)`). This is fragile -- a title change breaks the link. The new `chapterIndex` field replaces this entirely.

6. **`EditEducation.tsx` is missing fields**: no `blurb`, `minutes`, `featured`, `description`, `chapterIndex` -- and the youtube item editor is missing `caption` and `title` fields (only has `videoId`). The image editor is missing `alt` and `caption` in the edit view (only has `src`).

7. **`EducationGrid.tsx` LessonCard color lookup**: `LEVELS.find(l => "Level " + l.num === article.level)` -- hardcodes string format. Will break with number `level`.

---

## Terminology Mapping

| Old (retire) | New (use everywhere) |
|---|---|
| Phase | Level |
| `phase` (URL param) | `level` (keep URL as `/education/[phase]` to avoid breaking links, but all UI text and variable names say "level") |
| `phaseData` | `levelData` |
| `phaseNum` | `levelNum` |

**URL routes stay the same** (`/education/1`, `/education/1/0`) to avoid breaking existing links. Only internal variable names and UI labels change.

---

## Firestore Schema: `education_articles` Collection

### New fields to add

```typescript
interface EducationArticleDoc {
  // Existing (keep as-is)
  title: string
  author: string
  thumbnail: string
  sections: ArticleSection[]
  status: 'published' | 'draft'
  createdAt: Timestamp

  // CHANGED: was string "Level 1", now number 1
  // Read logic must handle both during transition
  level: number | string

  // NEW fields
  chapterIndex: number       // 0-based, which chapter slot in the level
  blurb: string              // 1-2 sentence summary for cards
  minutes: number            // estimated read time
  featured: boolean          // show in "Featured Lessons" on homepage
  description: string        // SEO meta description
}
```

### Transition strategy for `level` field

```typescript
// Canonical helper -- use everywhere a level number is needed
function resolveLevelNumber(level: unknown): number | null {
  if (typeof level === 'number') return level
  if (typeof level === 'string') {
    const m = level.match(/\bLevel\s*0?(\d+)\b/i)
    return m ? Number(m[1]) : null
  }
  return null
}
```

Admin going forward writes `level` as a **number** (1-5). All read paths use `resolveLevelNumber()`.

---

## Shared Types File (NEW)

### Create: `src/types/education.ts`

```typescript
export interface ArticleSectionContent {
  type: 'paragraph' | 'image' | 'youtube'
  text?: string
  src?: string
  alt?: string
  caption?: string
  videoId?: string
  title?: string
}

export interface ArticleSection {
  title: string
  content: ArticleSectionContent[]
}

export interface EducationArticleDoc {
  title: string
  author: string
  level: number | string      // number going forward, string legacy
  chapterIndex: number
  thumbnail: string
  sections: ArticleSection[]
  status: 'published' | 'draft'
  blurb: string
  minutes: number
  featured: boolean
  description: string
  createdAt: unknown           // Firestore Timestamp
}

// Hydrated version with Firestore doc ID
export interface EducationArticle extends EducationArticleDoc {
  id: string
}
```

---

## Shared Utility File (NEW)

### Create: `src/lib/educationUtils.ts`

```typescript
import { PHASES } from '@/data/educationPhases'

/**
 * Resolve any level representation to a number 1-5, or null.
 * Handles: number 1, string "Level 1", string "Level 01", string "level 1"
 */
export function resolveLevelNumber(level: unknown): number | null

/**
 * Format a level number for display: "Level 1", "Level 2", etc.
 */
export function formatLevelLabel(levelNum: number): string

/**
 * Get the Phase data from educationPhases.ts for a given level number.
 */
export function getLevelData(levelNum: number): Phase | undefined

/**
 * Get the chapter name for a given level + chapterIndex from PHASES.
 */
export function getChapterName(levelNum: number, chapterIndex: number): string | undefined

/**
 * Get all chapter names for a level.
 */
export function getChaptersForLevel(levelNum: number): string[]

/**
 * Get the level color hex from PHASES.
 */
export function getLevelColor(levelNum: number): string
```

---

## Files to Modify

### 1. `src/components/admin/PublishEducation.tsx`

**Changes:**
- Add state for new fields: `blurb`, `minutes`, `featured`, `description`, `chapterIndex`
- Change `level` state from string `"Level 1"` to number `1`
- Replace level `<select>` with a 1-5 number dropdown labeled "Level 1 -- Start Here", "Level 2 -- Understand What You Just Bought", etc. (pull titles from `PHASES`)
- Add `chapterIndex` picker: when level is selected, show a `<select>` of chapter names from `PHASES[level-1].chapters`, each option value is the 0-based index, label is `"Chapter {i+1}: {chapterName}"`
- Add `blurb` textarea (max ~200 chars suggested, not enforced)
- Add `minutes` number input
- Add `featured` checkbox
- Add `description` textarea (for SEO)
- Add section reordering: up/down arrow buttons on each section to swap position
- Add item reordering: up/down arrow buttons on each content item within a section
- Restore alt text + caption inputs on image items (already present -- verify they render)
- Restore caption input on YouTube items (currently missing in the form)
- Add live preview panel: split the form into a 2-column layout on desktop. Left = form, Right = `<EducationArticleRenderer>` rendered with current form data. Update on every state change.
- On save, write `level` as number, include `chapterIndex`, `blurb`, `minutes`, `featured`, `description`
- Add duplicate `level+chapterIndex` validation: before publish, query Firestore for published articles with same `level` + `chapterIndex`. If found, show a warning (yellow banner) but allow save.

**Firestore write shape:**
```typescript
{
  title, level: number, chapterIndex: number, author, thumbnail,
  sections, status, blurb, minutes, featured, description,
  createdAt: serverTimestamp()
}
```

### 2. `src/components/admin/EditEducation.tsx`

**Changes:**
- Mirror all PublishEducation changes for the edit form
- Add same new fields to `formData` state and edit UI
- Add section reordering (up/down buttons)
- Add item reordering within sections (up/down buttons)
- Restore image alt/caption fields, YouTube caption field in edit mode
- Add live preview panel (same as Publish)
- On load, read existing doc fields including new ones. For legacy docs without `chapterIndex`, default to `0`. For legacy `level` strings, display them but convert to number on save.
- Add duplicate `level+chapterIndex` validation on update (exclude current doc ID from the check)
- Update the `LEVELS` constant to use numbers: remove old `['Level 1', ...]` array, replace with `[1,2,3,4,5]` and render labels from `PHASES`

### 3. `src/app/education/[phase]/page.tsx`

**Changes:**
- Rename all `phase`/`phaseData`/`phaseNum` variables to `level`/`levelData`/`levelNum` internally (keep `params.phase` as-is since it's the URL param)
- Replace `fetchArticlesForLevel()` -- instead of returning `Map<title, id>`, return `Map<chapterIndex, EducationArticle>` keyed by `chapterIndex`
- Firestore query: fetch all docs from `education_articles`, filter client-side to `resolveLevelNumber(doc.level) === levelNum && doc.status === 'published'`
- Build chapter list from `PHASES[levelNum-1].chapters`, ordered by array index (which IS the chapterIndex)
- For each chapter slot `ci`:
  - Look up `articleMap.get(ci)` to find linked article
  - Show: chapter name from PHASES, article title + thumbnail if linked, "Start" button linking to `/education/article/{id}` if article exists, otherwise `/education/{levelNum}/{ci}` placeholder
  - Remove the fragile title-matching logic entirely
- Remove `chapterParts()`, `PARTS_POOL`, `TYPE_POOL` usage -- these are placeholder filler and should be removed now that real articles fill the slots
- Keep the accordion UI but simplify: each chapter shows its name, linked article title/blurb if available, and a single "Start chapter" / "Coming soon" button. No fake "parts" breakdown.

### 4. `src/app/education/[phase]/[lesson]/page.tsx`

**Changes:**
- On load, query Firestore for article where `resolveLevelNumber(level) === levelNum` AND `chapterIndex === lessonIdx` AND `status === 'published'`
- If found: `redirect('/education/article/' + doc.id)` (use Next.js `redirect()` from `next/navigation`)
- If not found: show the placeholder "coming soon" UI with chapter name from `PHASES[levelNum-1].chapters[lessonIdx]`
- Simplify the placeholder UI: remove fake video player, fake article body, and fake "parts" breakdown. Keep: chapter title, breadcrumb, "Coming soon" banner, link back to level, link to next/prev chapter that exists
- Rename internal variables from `phase` to `level`

### 5. `src/app/education/article/[id]/page.tsx`

**Changes:**
- Update `ArticleDoc` interface to include new fields: `chapterIndex`, `blurb`, `minutes`, `featured`, `description`
- Update `fetchSiblingIds()`:
  - Use `resolveLevelNumber()` instead of `parseLevelNumber()`
  - Filter to same level AND `status === 'published'`
  - Sort by `chapterIndex` ASC (not `__name__`)
  - Find current article's position, return prev/next IDs
- Pass `chapterIndex` and level number to `EducationArticleRenderer` for breadcrumb rendering
- Update `generateMetadata()` to use `description` field if available (already partially done)

**Updated props passed to renderer:**
```typescript
{
  article: {
    title, description, author, level, chapterIndex, thumbnail,
    sections, blurb, minutes
  },
  articleId,
  prevArticleId,
  nextArticleId,
  levelNum,     // resolved number
  chapterName,  // from PHASES
}
```

### 6. `src/components/education/EducationArticleRenderer.tsx`

**Changes:**
- Update `EducationArticleContentProps` to include `levelNum`, `chapterName`, `chapterIndex`
- Replace the "Back to Level X" breadcrumb with a proper breadcrumb: `Education > Level {levelNum}: {levelTitle} > Chapter {chapterIndex+1}: {chapterName}`
- Each breadcrumb segment is a link (Education -> /education, Level -> /education/{levelNum})
- Show `article.blurb` under the title if present
- Show read time from `article.minutes` if present (currently shows author only)
- Keep the section-based ToC in the rail
- Add chapter-level prev/next (already has article prev/next -- keep as-is but labels change to "Previous chapter" / "Next chapter")

### 7. `src/components/EducationGrid.tsx`

**Changes:**
- Delete the local `LEVELS` array (lines 23-44)
- Import `PHASES` from `@/data/educationPhases` and derive level data from it
- Use `resolveLevelNumber()` for color lookups and level matching
- Featured lessons section: filter articles where `featured === true`, sort by `resolveLevelNumber(level)` then `chapterIndex`
- Level journey section: iterate `PHASES` instead of `LEVELS`, use `PHASES[i].hex` for colors, `PHASES[i].tag` for tag names, `PHASES[i].title` for titles, `PHASES[i].blurb` for blurbs
- "Start Level 1" button: link to `/education/1` (unchanged)
- Remove the `skills` array hover display from `LevelMarker` (it was hardcoded/duplicated). Replace with: show `PHASES[i].outcomes` (first 3 items) on hover.
- Update `LessonCard` color lookup to use `resolveLevelNumber()`
- Update the `EducationArticle` interface at the top to match the shared type (import from `src/types/education.ts`)

### 8. `src/components/AllEducationArticles.tsx`

**Changes:**
- Import `resolveLevelNumber` from `src/lib/educationUtils`
- Update the level filter to work with both string and number `level` fields:
  - Filter buttons still labeled "Level 1" through "Level 5"
  - Comparison uses `resolveLevelNumber(a.level) === filterNum` instead of `a.level === filterString`
- Remove the hardcoded `LEVELS` and `LEVEL_COLORS` arrays, derive from `PHASES`
- Update the `Article` interface to include `chapterIndex`

### 9. `src/components/education/EducationSidebar.tsx`

**Changes:**
- Add a "Levels" nav group below "Learn" that shows all 5 levels as links: `Level 1: Start Here`, `Level 2: Understand...`, etc.
- Each links to `/education/{n}`
- Highlight the current level based on pathname parsing
- Import `PHASES` from `@/data/educationPhases`

### 10. `src/components/education/EducationTopbar.tsx`

**Changes:**
- Update breadcrumb to show "Level X" instead of `phase.level` (which was "LEVEL 01")
- For article pages: breadcrumb should be `Education > Level {n}: {title}` (chapter name is handled by the renderer)
- Use `resolveLevelNumber()` for parsing

### 11. `src/data/educationPhases.ts`

**Changes:**
- Rename `Phase` interface to `Level` (keep `Phase` as a type alias for backward compat during migration)
- Change `level` field from `'LEVEL 01'` to just the number `n` (the string format is no longer needed -- `formatLevelLabel()` handles display)
- Actually: **keep the file as-is structurally** but export a `Phase` type alias. The `level` string field (`"LEVEL 01"`) is only used in a few UI spots and those will switch to using `formatLevelLabel()`. No structural change needed to the data file.
- Remove `chapterParts()`, `PARTS_POOL`, `TYPE_POOL` exports (placeholder content no longer needed)

### 12. `src/app/education/page.tsx` (Journey page)

**Changes:**
- Replace `{phase.level}` display text (shows "LEVEL 01") with `Level {phase.n}` for cleaner display
- No other structural changes needed -- this page already uses `PHASES` correctly

---

## Files to Create

### 1. `src/types/education.ts`
Shared TypeScript interfaces (see above).

### 2. `src/lib/educationUtils.ts`
Shared utility functions (see above).

---

## Firestore Query Patterns

### Fetch articles for a level (used in [phase]/page.tsx)
```typescript
// No composite index needed -- fetch all, filter client-side
const snap = await getDocs(collection(db, 'education_articles'))
const articles = snap.docs
  .map(d => ({ id: d.id, ...d.data() } as EducationArticle))
  .filter(a => a.status === 'published' && resolveLevelNumber(a.level) === levelNum)
  .sort((a, b) => (a.chapterIndex ?? 0) - (b.chapterIndex ?? 0))
```

### Fetch article by level + chapterIndex (used in [phase]/[lesson]/page.tsx)
```typescript
const snap = await getDocs(collection(db, 'education_articles'))
const match = snap.docs.find(d => {
  const data = d.data()
  return data.status === 'published'
    && resolveLevelNumber(data.level) === levelNum
    && data.chapterIndex === chapterIndex
})
```

### Fetch siblings for prev/next (used in article/[id]/page.tsx)
```typescript
const snap = await getDocs(collection(db, 'education_articles'))
const sameLevel = snap.docs
  .map(d => ({ id: d.id, ...d.data() }))
  .filter(a => a.status === 'published' && resolveLevelNumber(a.level) === levelNum)
  .sort((a, b) => (a.chapterIndex ?? 0) - (b.chapterIndex ?? 0))
const idx = sameLevel.findIndex(a => a.id === articleId)
const prevId = idx > 0 ? sameLevel[idx - 1].id : null
const nextId = idx < sameLevel.length - 1 ? sameLevel[idx + 1].id : null
```

### Fetch featured articles (used in EducationGrid.tsx)
```typescript
const snap = await getDocs(collection(db, 'education_articles'))
const featured = snap.docs
  .map(d => ({ id: d.id, ...d.data() }))
  .filter(a => a.status === 'published' && a.featured === true)
  .sort((a, b) => {
    const la = resolveLevelNumber(a.level) ?? 99
    const lb = resolveLevelNumber(b.level) ?? 99
    if (la !== lb) return la - lb
    return (a.chapterIndex ?? 0) - (b.chapterIndex ?? 0)
  })
```

### Duplicate check for admin (used in PublishEducation/EditEducation)
```typescript
const snap = await getDocs(collection(db, 'education_articles'))
const conflict = snap.docs.find(d => {
  const data = d.data()
  return d.id !== excludeId  // null for new docs
    && data.status === 'published'
    && resolveLevelNumber(data.level) === level
    && data.chapterIndex === chapterIndex
})
if (conflict) {
  // Show warning: "Another published article already occupies Level {level}, Chapter {chapterIndex+1}"
  // Do NOT block save
}
```

---

## Edge Cases

1. **Legacy articles without `chapterIndex`**: Default to `undefined`/`null`. They appear at the end of sorted lists. The admin can assign them a chapterIndex during editing.
2. **Legacy articles with string `level`**: `resolveLevelNumber()` handles this. Admin re-saving converts to number.
3. **Multiple articles with same `level+chapterIndex`**: Warn in admin but allow. On the public level page, show the first one found (lowest doc ID as tiebreaker).
4. **Level with no published articles**: Show all chapters as "Coming soon" on the level page. This already works.
5. **Article with `level` outside 1-5**: `resolveLevelNumber()` returns null. Article won't appear in any level page but will still be accessible via direct link.
6. **Chapter name in PHASES changes after article is linked**: No impact -- linking is by `chapterIndex` not by name. The chapter name displayed comes from PHASES at render time.
7. **`featured` field missing on old docs**: Default to `false` (`data.featured || false`).
8. **`minutes` field missing on old docs**: Default to `0`. Also check for legacy `readTime` field.
9. **Admin saves article with no chapterIndex selected**: Require chapterIndex in form validation before save (both Publish and Edit).
10. **`/education/article/[id]` for a draft article**: Currently shows the article. Keep this behavior (no status check on direct ID access) -- drafts are only hidden from listings.

---

## Implementation Order

1. `src/types/education.ts` -- shared types (no dependencies)
2. `src/lib/educationUtils.ts` -- shared helpers (depends on types + educationPhases)
3. `src/data/educationPhases.ts` -- remove `chapterParts`, `PARTS_POOL`, `TYPE_POOL`
4. `src/components/admin/PublishEducation.tsx` -- new fields + reordering + preview
5. `src/components/admin/EditEducation.tsx` -- same changes as Publish
6. `src/app/education/article/[id]/page.tsx` -- new sibling logic with chapterIndex
7. `src/components/education/EducationArticleRenderer.tsx` -- breadcrumb + new props
8. `src/app/education/[phase]/page.tsx` -- chapterIndex-based article linking
9. `src/app/education/[phase]/[lesson]/page.tsx` -- redirect or placeholder
10. `src/components/EducationGrid.tsx` -- unify with PHASES, fix level resolution
11. `src/components/AllEducationArticles.tsx` -- fix level filter
12. `src/components/education/EducationSidebar.tsx` -- add level links
13. `src/components/education/EducationTopbar.tsx` -- update breadcrumb text
14. `src/app/education/page.tsx` -- minor label update

---

## Patterns to Follow

- **Admin component pattern**: Follow existing `PublishEducation.tsx` for form structure, state management, and Firestore write pattern. The `EditEducation.tsx` follows the same pattern with an article list + inline edit form.
- **Firestore fetch pattern**: Follow `EducationGrid.tsx` lines 444-473 for client-side fetching with `getDocs` + manual filtering (avoids composite index requirements).
- **CSS**: All education styles are in `src/app/education/education.css` using the `edu-` prefix. Admin components use Tailwind classes directly.
- **URL structure**: No URL changes. All routes remain as-is.
