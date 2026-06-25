/**
 * Re-derives sections for all TipTap articles that currently have empty sections.
 * This fixes the "0 sections" bug for already-migrated articles.
 *
 * Usage:
 *   npx ts-node scripts/remigrateTiptap.ts --dry-run
 *   npx ts-node scripts/remigrateTiptap.ts
 *   npx ts-node scripts/remigrateTiptap.ts --keyfile prod.json
 */

import admin from 'firebase-admin'
import path from 'path'
import fs from 'fs'
import { config } from 'dotenv'

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

// ── Inlined tiptapToSections (same as src/lib/tiptapToSections.ts) ──

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
}

interface Section {
  title: string
  content: SectionContent[]
}

function tiptapToSections(tiptapContent: unknown): Section[] {
  const doc = tiptapContent as { type?: string; content?: Array<Record<string, unknown>> }
  if (!doc?.content) return []
  const sections: Section[] = []
  let currentSection: Section = { title: '', content: [] }
  for (const node of doc.content) {
    const nodeType = node.type as string
    if (nodeType === 'heading' && (node.attrs as Record<string, unknown>)?.level === 2) {
      if (currentSection.title || currentSection.content.length > 0) {
        if (!currentSection.title && sections.length === 0) currentSection.title = 'Introduction'
        sections.push(currentSection)
      }
      const textContent = ((node.content as Array<{ text?: string }>) || []).map(n => n.text || '').join('')
      currentSection = { title: textContent, content: [] }
      continue
    }
    if (nodeType === 'paragraph') {
      const text = nodeToMarkdown(node)
      if (text.trim()) currentSection.content.push({ type: 'paragraph', text })
      continue
    }
    if (nodeType === 'bulletList' || nodeType === 'orderedList') {
      const items = (node.content as Array<Record<string, unknown>>) || []
      const lines = items.map(li => {
        const liContent = (li.content as Array<Record<string, unknown>>) || []
        return `• ${liContent.map(p => nodeToMarkdown(p)).join('')}`
      })
      currentSection.content.push({ type: 'paragraph', text: lines.join('\n') })
      continue
    }
    if (nodeType === 'heading') {
      const text = ((node.content as Array<{ text?: string }>) || []).map(n => n.text || '').join('')
      currentSection.content.push({ type: 'paragraph', text: `**${text}**` })
      continue
    }
    if (nodeType === 'image') {
      const attrs = node.attrs as Record<string, string> | undefined
      currentSection.content.push({ type: 'image', src: attrs?.src || '', alt: attrs?.alt || '', caption: attrs?.title || '' })
      continue
    }
    if (nodeType === 'youtube') {
      const attrs = node.attrs as Record<string, string> | undefined
      const src = attrs?.src || ''
      const videoId = src.match(/(?:v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1] || src
      currentSection.content.push({ type: 'youtube', videoId, title: '' })
      continue
    }
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
  if (currentSection.title || currentSection.content.length > 0) {
    if (!currentSection.title && sections.length === 0) currentSection.title = 'Introduction'
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

// ── Main ──

async function remigrate() {
  if (!DRY_RUN) initFirebase()
  const db = DRY_RUN ? null : admin.firestore()

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Re-deriving sections for TipTap articles...`)
  console.log('─'.repeat(60))

  if (DRY_RUN) {
    console.log('  (dry run — no Firestore access)')
    return
  }

  const snap = await db!.collection('education_articles').get()
  let fixed = 0
  let skipped = 0

  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    const title = data.title || 'Untitled'

    if (!data.tiptapContent) {
      skipped++
      continue
    }

    const sections = tiptapToSections(data.tiptapContent)

    if (sections.length === 0) {
      console.log(`  SKIP (no sections derived): ${title}`)
      skipped++
      continue
    }

    // Serialize table rows to avoid nested arrays in Firestore
    const serialized = sections.map(s => ({
      title: s.title,
      content: s.content.map(item =>
        item.type === 'table'
          ? { type: item.type, headers: item.headers, rowsJson: JSON.stringify(item.rows || []) }
          : item
      ),
    }))

    await docSnap.ref.update({ sections: serialized })
    console.log(`  ✓ FIXED: ${title} (${sections.length} sections)`)
    fixed++
  }

  console.log('─'.repeat(60))
  console.log(`Done. Fixed: ${fixed} | Skipped: ${skipped}`)
}

remigrate().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
