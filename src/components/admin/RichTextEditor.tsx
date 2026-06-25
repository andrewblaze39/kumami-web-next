'use client'

import { useRef, useEffect, useCallback } from 'react'

export interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

// Convert markdown-like text to HTML for display
function markdownToHtml(text: string): string {
  if (!text) return ''
  // Escape HTML first but preserve our markers
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Underline: __text__
  html = html.replace(/__(.+?)__/g, '<u>$1</u>')
  // Italic: *text* (after bold so ** is already consumed)
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // Bullet points: lines starting with •
  html = html.replace(/^•\s*(.*)$/gm, '<li>$1</li>')
  // Newlines to <br>
  html = html.replace(/\n/g, '<br>')
  // Clean up <br> around <li>
  html = html.replace(/<br>\s*(<li>)/g, '$1')
  html = html.replace(/(<\/li>)\s*<br>/g, '$1')

  return html
}

// Convert innerHTML back to markdown-like text
function htmlToMarkdown(html: string): string {
  if (!html) return ''

  let text = html

  // Normalize self-closing br tags
  text = text.replace(/<br\s*\/?>/gi, '\n')

  // Convert formatting tags
  text = text.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
  text = text.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
  text = text.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, '__$1__')
  text = text.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
  text = text.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')

  // Convert list items
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '• $1\n')
  // Remove ul/ol wrappers
  text = text.replace(/<\/?ul[^>]*>/gi, '')
  text = text.replace(/<\/?ol[^>]*>/gi, '')

  // Remove <div> tags (replace block-level divs with newlines)
  text = text.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1\n')

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')

  // Collapse 3+ consecutive newlines to 2
  text = text.replace(/\n{3,}/g, '\n\n')
  // Trim trailing newline
  text = text.replace(/\n+$/, '')

  return text
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  rows = 3,
}: RichTextEditorProps) {
  const divRef = useRef<HTMLDivElement>(null)
  // Track whether the div is currently focused so we don't clobber the cursor
  const isFocused = useRef(false)
  // Track the last markdown we set so we can avoid unnecessary re-renders
  const lastMarkdown = useRef(value)

  // Sync external value → innerHTML only when not focused and value changed
  useEffect(() => {
    const el = divRef.current
    if (!el) return
    if (isFocused.current) return
    if (value === lastMarkdown.current) return
    lastMarkdown.current = value
    el.innerHTML = markdownToHtml(value)
  }, [value])

  // Initial mount: set HTML from value
  useEffect(() => {
    const el = divRef.current
    if (!el) return
    el.innerHTML = markdownToHtml(value)
    lastMarkdown.current = value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleInput = useCallback(() => {
    const el = divRef.current
    if (!el) return
    const markdown = htmlToMarkdown(el.innerHTML)
    lastMarkdown.current = markdown
    onChange(markdown)
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        document.execCommand('bold', false)
        handleInput()
        return
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault()
        document.execCommand('italic', false)
        handleInput()
        return
      }
      if (e.key === 'u' || e.key === 'U') {
        e.preventDefault()
        document.execCommand('underline', false)
        handleInput()
        return
      }
    }
  }, [handleInput])

  const applyFormat = (command: string) => {
    divRef.current?.focus()
    document.execCommand(command, false)
    handleInput()
  }

  const insertBullet = () => {
    const el = divRef.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    range.deleteContents()
    const textNode = document.createTextNode('• ')
    range.insertNode(textNode)
    range.setStartAfter(textNode)
    range.setEndAfter(textNode)
    sel.removeAllRanges()
    sel.addRange(range)
    handleInput()
  }

  const minHeight = `${rows * 1.75}rem`

  return (
    <div className="rich-text-editor-wrap" style={{ border: '1px solid #d1d5db', borderRadius: 6, overflow: 'hidden', background: '#fff' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          padding: '4px 6px',
          background: '#f3f4f6',
          borderBottom: '1px solid #e5e7eb',
        }}
        onMouseDown={e => e.preventDefault()} // prevent focus loss on toolbar click
      >
        <button
          type="button"
          title="Bold (Ctrl+B)"
          onClick={() => applyFormat('bold')}
          style={{
            fontWeight: 700,
            fontSize: 13,
            padding: '2px 8px',
            borderRadius: 4,
            border: '1px solid #d1d5db',
            background: '#fff',
            cursor: 'pointer',
            color: '#111',
            lineHeight: 1.4,
          }}
        >B</button>
        <button
          type="button"
          title="Italic (Ctrl+I)"
          onClick={() => applyFormat('italic')}
          style={{
            fontStyle: 'italic',
            fontSize: 13,
            padding: '2px 8px',
            borderRadius: 4,
            border: '1px solid #d1d5db',
            background: '#fff',
            cursor: 'pointer',
            color: '#111',
            lineHeight: 1.4,
          }}
        >I</button>
        <button
          type="button"
          title="Underline (Ctrl+U)"
          onClick={() => applyFormat('underline')}
          style={{
            textDecoration: 'underline',
            fontSize: 13,
            padding: '2px 8px',
            borderRadius: 4,
            border: '1px solid #d1d5db',
            background: '#fff',
            cursor: 'pointer',
            color: '#111',
            lineHeight: 1.4,
          }}
        >U</button>
        <button
          type="button"
          title="Bullet point"
          onClick={insertBullet}
          style={{
            fontSize: 13,
            padding: '2px 8px',
            borderRadius: 4,
            border: '1px solid #d1d5db',
            background: '#fff',
            cursor: 'pointer',
            color: '#111',
            lineHeight: 1.4,
          }}
        >•</button>
      </div>

      {/* Editable area */}
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => { isFocused.current = true }}
        onBlur={() => {
          isFocused.current = false
          handleInput()
        }}
        data-placeholder={placeholder}
        style={{
          minHeight,
          padding: '8px',
          outline: 'none',
          color: '#111',
          fontSize: 14,
          lineHeight: 1.6,
          fontFamily: 'inherit',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
        className="rich-text-editor-content"
      />

      <style>{`
        .rich-text-editor-content:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
