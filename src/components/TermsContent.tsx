'use client'

import { useEffect, useState } from 'react'
import { Loader } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ---------- Lightweight markdown to HTML ----------

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function parseInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_(?!\s)([^_\n]+?)_(?!_)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, href: string) => {
      const safeHref = href.replace(/"/g, '&quot;')
      return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="text-[#40e0d0] hover:underline">${label}</a>`
    })
}

function renderMarkdown(text: string | undefined): string {
  if (!text) return ''
  const normalized = text
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')

  const blocks = normalized.split(/\n{2,}/)
  return blocks
    .map((block) => {
      const lines = block.split('\n')
      const isBulletBlock = lines.every(
        (l) => /^\s*[-*\u2022]\s+/.test(l) || l.trim() === ''
      )
      if (isBulletBlock && lines.some((l) => /^\s*[-*\u2022]\s+/.test(l))) {
        const items = lines
          .filter((l) => /^\s*[-*\u2022]\s+/.test(l))
          .map(
            (l) =>
              `<li>${parseInline(
                escapeHtml(l.replace(/^\s*[-*\u2022]\s+/, ''))
              )}</li>`
          )
          .join('')
        return `<ul class="list-disc list-outside ml-6 my-3 space-y-1">${items}</ul>`
      }

      const heading = block.match(/^(#{1,6})\s+(.*)$/)
      if (heading) {
        const level = heading[1].length
        const body = parseInline(escapeHtml(heading[2]))
        const size =
          level <= 2
            ? 'text-2xl md:text-3xl'
            : level === 3
            ? 'text-xl md:text-2xl'
            : 'text-lg'
        return `<h${level} class="${size} font-bold mt-8 mb-3 text-white">${body}</h${level}>`
      }

      return `<p class="mb-4 leading-relaxed text-gray-200">${parseInline(
        escapeHtml(block).replace(/\n/g, '<br />')
      )}</p>`
    })
    .join('')
}

// ---------- Component ----------

export default function TermsContent() {
  const [title, setTitle] = useState('Terms & Conditions')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const ref = doc(db, 'app_config', 'terms_and_conditions')
        const snap = await getDoc(ref)

        if (!snap.exists()) {
          setLoadError(
            'Missing Firestore document: app_config/terms_and_conditions'
          )
          setContent('Terms & Conditions are currently unavailable.')
          return
        }

        const data = snap.data()
        if (typeof data?.title === 'string' && data.title.trim()) {
          setTitle(data.title)
        }

        const nextContent =
          typeof data?.content === 'string' ? data.content : ''
        if (nextContent.trim()) {
          setContent(nextContent)
          setLoadError('')
          return
        }

        setLoadError(
          'Firestore Terms document has empty or non-string `content` field.'
        )
        setContent('Terms & Conditions are currently unavailable.')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('Error loading Terms & Conditions:', err)
        setLoadError(message)
        setContent('Terms & Conditions are currently unavailable.')
      } finally {
        setLoading(false)
      }
    }

    fetchTerms()
  }, [])

  if (loading) {
    return (
      <div className="min-h-[70vh] bg-[#101010] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-[#40e0d0]" />
          <p className="text-xl text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  const bodyHtml = renderMarkdown(content)

  return (
    <div className="min-h-[70vh] bg-[#101010] text-white px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-center text-3xl md:text-4xl font-bold text-[#40e0d0] mb-8">
          {title}
        </h1>
        <div className="bg-[#102425] border border-white/10 rounded-2xl p-6">
          {loadError ? (
            <div className="text-xs text-white/70 mb-4 break-words">
              {loadError}
            </div>
          ) : null}
          <div
            className="markdown-content text-base leading-relaxed text-gray-200"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </div>
      </div>
    </div>
  )
}
