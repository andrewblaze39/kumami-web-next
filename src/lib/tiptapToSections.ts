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

    if (nodeType === 'heading' && (node.attrs as Record<string, unknown>)?.level === 2) {
      if (currentSection.title || currentSection.content.length > 0) {
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

    if (nodeType === 'paragraph') {
      const text = nodeToMarkdown(node)
      if (text.trim()) {
        currentSection.content.push({ type: 'paragraph', text })
      }
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
      currentSection.content.push({
        type: 'image',
        src: attrs?.src || '',
        alt: attrs?.alt || '',
        caption: attrs?.title || '',
      })
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
