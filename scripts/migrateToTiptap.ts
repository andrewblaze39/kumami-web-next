/**
 * Migrates existing classic-format education articles to also have tiptapContent.
 * Does NOT remove the classic sections — both formats coexist.
 * Sets editorMode to 'tiptap' so the article renders with TipTap by default.
 *
 * Usage:
 *   npx ts-node scripts/migrateToTiptap.ts --dry-run
 *   npx ts-node scripts/migrateToTiptap.ts
 *   npx ts-node scripts/migrateToTiptap.ts --keyfile prod.json
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

// ── Convert classic sections to TipTap JSONContent ──

interface ClassicContentItem {
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

interface ClassicSection {
  title: string
  content: ClassicContentItem[]
}

interface TipTapNode {
  type: string
  attrs?: Record<string, unknown>
  content?: TipTapNode[]
  marks?: { type: string }[]
  text?: string
}

function parseMarkdownToTiptap(text: string): TipTapNode[] {
  if (!text) return [{ type: 'text', text: ' ' }]

  const nodes: TipTapNode[] = []

  // Split by lines to handle bullet points
  const lines = text.split('\n')

  let bulletBuffer: string[] = []

  function flushBullets() {
    if (bulletBuffer.length === 0) return
    const listItems: TipTapNode[] = bulletBuffer.map(line => ({
      type: 'listItem',
      content: [{ type: 'paragraph', content: parseInlineMarks(line) }],
    }))
    nodes.push({ type: 'bulletList', content: listItems })
    bulletBuffer = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flushBullets()
      continue
    }

    // Check for bullet
    const bulletMatch = trimmed.match(/^[•\-]\s+(.+)$/)
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1])
      continue
    }

    flushBullets()
    // Regular paragraph line
    nodes.push({
      type: 'paragraph',
      content: parseInlineMarks(trimmed),
    })
  }

  flushBullets()

  return nodes.length > 0 ? nodes : [{ type: 'paragraph', content: [{ type: 'text', text: ' ' }] }]
}

function parseInlineMarks(text: string): TipTapNode[] {
  const nodes: TipTapNode[] = []

  // Simple regex-based parser for **bold**, *italic*, __underline__
  // Process in order: bold first, then underline, then italic
  const regex = /(\*\*(.+?)\*\*|__(.+?)__|_(.+?)_|\*(.+?)\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    // Add plain text before the match
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }

    if (match[2] !== undefined) {
      // **bold**
      nodes.push({ type: 'text', text: match[2], marks: [{ type: 'bold' }] })
    } else if (match[3] !== undefined) {
      // __underline__
      nodes.push({ type: 'text', text: match[3], marks: [{ type: 'underline' }] })
    } else if (match[4] !== undefined) {
      // _italic_
      nodes.push({ type: 'text', text: match[4], marks: [{ type: 'italic' }] })
    } else if (match[5] !== undefined) {
      // *italic*
      nodes.push({ type: 'text', text: match[5], marks: [{ type: 'italic' }] })
    }

    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < text.length) {
    nodes.push({ type: 'text', text: text.slice(lastIndex) })
  }

  return nodes.length > 0 ? nodes : [{ type: 'text', text: ' ' }]
}

function convertSectionsToTiptap(sections: ClassicSection[]): TipTapNode {
  const doc: TipTapNode = {
    type: 'doc',
    content: [],
  }

  for (const section of sections) {
    // Section title as H2
    if (section.title) {
      doc.content!.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: section.title }],
      })
    }

    for (const item of section.content) {
      if (item.type === 'paragraph' && item.text) {
        const paragraphNodes = parseMarkdownToTiptap(item.text)
        doc.content!.push(...paragraphNodes)
      } else if (item.type === 'image' && item.src) {
        doc.content!.push({
          type: 'image',
          attrs: {
            src: item.src,
            alt: item.alt || '',
            title: item.caption || '',
          },
        })
        if (item.caption) {
          doc.content!.push({
            type: 'paragraph',
            content: [{ type: 'text', text: item.caption, marks: [{ type: 'italic' }] }],
          })
        }
      } else if (item.type === 'youtube' && item.videoId) {
        doc.content!.push({
          type: 'youtube',
          attrs: {
            src: `https://www.youtube.com/watch?v=${item.videoId}`,
            width: 640,
            height: 480,
          },
        })
      } else if (item.type === 'table' && item.headers) {
        const rows: string[][] = item.rows?.length
          ? item.rows
          : item.rowsJson
            ? (() => { try { return JSON.parse(item.rowsJson) } catch { return [] } })()
            : []

        const headerRow: TipTapNode = {
          type: 'tableRow',
          content: item.headers.map(h => ({
            type: 'tableHeader',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: h || ' ' }] }],
          })),
        }

        const dataRows: TipTapNode[] = rows.map(row => ({
          type: 'tableRow',
          content: row.map(cell => ({
            type: 'tableCell',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: cell || ' ' }] }],
          })),
        }))

        doc.content!.push({
          type: 'table',
          content: [headerRow, ...dataRows],
        })
      }
    }
  }

  // Ensure doc has at least one node
  if (!doc.content!.length) {
    doc.content!.push({ type: 'paragraph', content: [{ type: 'text', text: ' ' }] })
  }

  return doc
}

// ── Main ──

async function migrate() {
  if (!DRY_RUN) initFirebase()
  const db = DRY_RUN ? null : admin.firestore()
  const col = db?.collection('education_articles')

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Migrating classic articles to TipTap...`)
  console.log('─'.repeat(60))

  let migrated = 0
  let skipped = 0

  if (DRY_RUN) {
    console.log('  (dry run — no Firestore access)')
    console.log('  Would migrate all articles with sections and no tiptapContent')
    return
  }

  const snap = await col!.get()

  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    const title = data.title || 'Untitled'
    const sections = data.sections as ClassicSection[] | undefined

    // Skip if already has tiptapContent
    if (data.tiptapContent) {
      console.log(`  SKIP (already has tiptap): ${title}`)
      skipped++
      continue
    }

    // Skip if no sections (coming soon articles)
    if (!sections || sections.length === 0) {
      console.log(`  SKIP (no sections): ${title}`)
      skipped++
      continue
    }

    // Convert
    const tiptapContent = convertSectionsToTiptap(sections)

    await docSnap.ref.update({
      tiptapContent,
      editorMode: 'tiptap',
    })

    console.log(`  ✓ MIGRATED: ${title} (${sections.length} sections → tiptap)`)
    migrated++
  }

  console.log('─'.repeat(60))
  console.log(`Done. Migrated: ${migrated} | Skipped: ${skipped}`)
}

migrate().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
