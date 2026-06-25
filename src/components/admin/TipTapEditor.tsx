'use client'

import { useRef } from 'react'
import './tiptap-editor.css'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import Underline from '@tiptap/extension-underline'
import Youtube from '@tiptap/extension-youtube'
import Placeholder from '@tiptap/extension-placeholder'

interface TipTapEditorProps {
  content: JSONContent | null
  onChange: (content: JSONContent) => void
}

type ToolbarButtonProps = {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
  disabled?: boolean
}

function ToolbarButton({ onClick, active, title, children, disabled }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`tiptap-toolbar-btn${active ? ' tiptap-toolbar-btn-active' : ''}${disabled ? ' tiptap-toolbar-btn-disabled' : ''}`}
    >
      {children}
    </button>
  )
}

export default function TipTapEditor({ content, onChange }: TipTapEditorProps) {
  // Ref for image upload handler so editorProps callbacks can access it
  const handleImageUploadRef = useRef<(file: File) => void>(() => {})

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Youtube.configure({ controls: true }),
      Placeholder.configure({ placeholder: 'Start writing your article…' }),
    ],
    content: content ?? undefined,
    onUpdate({ editor }) {
      onChange(editor.getJSON())
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor-area',
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files
        if (files?.length) {
          const file = files[0]
          if (file.type.startsWith('image/')) {
            event.preventDefault()
            handleImageUploadRef.current(file)
            return true
          }
        }
        return false
      },
      handlePaste(view, event) {
        const files = event.clipboardData?.files
        if (files?.length) {
          const file = files[0]
          if (file.type.startsWith('image/')) {
            event.preventDefault()
            handleImageUploadRef.current(file)
            return true
          }
        }
        return false
      },
    },
    immediatelyRender: false,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Keep ref updated so editorProps callbacks can call it
  handleImageUploadRef.current = async (file: File) => {
    if (!file.type.startsWith('image/') || !editor) return
    try {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const storageRef = ref(storage, `education-assets/${id}`)
      const snap = await uploadBytes(storageRef, file, { contentType: file.type })
      const url = await getDownloadURL(snap.ref)
      editor.chain().focus().setImage({ src: url }).run()
    } catch (err) {
      console.error('Image upload failed:', err)
      alert('Image upload failed')
    }
  }

  if (!editor) return null

  const insertImage = () => {
    fileInputRef.current?.click()
  }

  const insertYoutube = () => {
    const url = window.prompt('YouTube URL:')
    if (url) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run()
    }
  }

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  return (
    <div className="tiptap-editor-wrap">
      {/* Toolbar row 1: Section + Insert */}
      <div className="tiptap-toolbar" style={{ borderBottom: 'none', paddingBottom: 2 }}>
        <button
          type="button"
          onClick={() => {
            editor.chain().focus()
              .insertContent([
                { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'New section' }] },
                { type: 'paragraph' },
              ])
              .run()
          }}
          title="Add new section"
          className="tiptap-section-btn"
        >
          + Add Section
        </button>

        <div style={{ flex: 1 }} />

        <ToolbarButton onClick={insertImage} title="Upload image">
          Image
        </ToolbarButton>
        <ToolbarButton onClick={insertYoutube} title="Insert YouTube video">
          YouTube
        </ToolbarButton>
        <ToolbarButton onClick={insertTable} title="Insert table">
          Table
        </ToolbarButton>

        <div className="tiptap-divider" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
          disabled={!editor.can().undo()}
        >
          Undo
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
          disabled={!editor.can().redo()}
        >
          Redo
        </ToolbarButton>
      </div>

      {/* Toolbar row 2: Text formatting */}
      <div className="tiptap-toolbar">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline (Ctrl+U)"
        >
          <span style={{ textDecoration: 'underline' }}>U</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        >
          <span style={{ textDecoration: 'line-through' }}>S</span>
        </ToolbarButton>

        <div className="tiptap-divider" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Sub-heading"
        >
          Heading
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        >
          Bullets
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered list"
        >
          Numbers
        </ToolbarButton>

        {editor.isActive('table') && (
          <>
            <div className="tiptap-divider" />
            <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Add row">+Row</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} title="Delete row">-Row</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add column">+Col</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete column">-Col</ToolbarButton>
          </>
        )}
      </div>

      {/* Editor content area */}
      <EditorContent editor={editor} />

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleImageUploadRef.current(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
