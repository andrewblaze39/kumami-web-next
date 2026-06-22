'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { notFound, useRouter } from 'next/navigation'
import { Info, ArrowRight, ArrowLeft } from 'lucide-react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { PHASES } from '@/data/educationPhases'

interface Props {
  params: Promise<{ phase: string; lesson: string }>
}

export default function LessonPage({ params }: Props) {
  const { phase, lesson } = use(params)
  const levelNum = parseInt(phase)
  const lessonIdx = parseInt(lesson)
  const levelData = PHASES.find(p => p.n === levelNum)
  if (!levelData) notFound()

  const chapter = levelData.chapters[lessonIdx]
  if (!chapter) notFound()

  const isLab = chapter.startsWith('HANDS-ON')
  const title = isLab ? chapter.replace('HANDS-ON: ', '') : chapter

  const router = useRouter()
  const [checked, setChecked] = useState(false)

  // On mount: check Firestore for a published article at this level+chapterIndex
  // If found, redirect to the article page
  useEffect(() => {
    const checkForArticle = async () => {
      try {
        const q = query(
          collection(db, 'education_articles'),
          where('level', '==', levelNum),
          where('chapterIndex', '==', lessonIdx),
          where('status', '==', 'published')
        )
        const snap = await getDocs(q)
        const match = snap.docs.find(d => {
          const data = d.data()
          return !data.comingSoon && data.sections?.length > 0
        })
        if (match) {
          router.replace(`/education/article/${match.id}`)
          return
        }
      } catch { /* ignore */ }
      setChecked(true)
    }
    checkForArticle()
  }, [levelNum, lessonIdx, router])

  // Adjacent chapters for navigation
  const prevChapter = lessonIdx > 0 ? { levelN: levelNum, idx: lessonIdx - 1 } : null
  const nextChapter =
    lessonIdx < levelData.chapters.length - 1
      ? { levelN: levelNum, idx: lessonIdx + 1 }
      : levelNum < 5
      ? { levelN: levelNum + 1, idx: 0 }
      : null

  // Show a minimal loading state while checking Firestore
  if (!checked) {
    return (
      <div className="edu-content">
        <div className="edu-art-loading">
          <div className="edu-art-spinner" />
          <span>Loading…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="edu-content">
      <div className="edu-lesson-grid">
        <article className="edu-article">

          {/* Header */}
          <div className="edu-l-head">
            <span
              className="edu-lv-tag"
              style={{ color: levelData.hex, fontSize: 12 }}
            >
              Level {levelNum} · {levelData.title} · Chapter {lessonIdx + 1}
            </span>
            <h1>{title}</h1>
          </div>

          {/* Coming soon banner */}
          <div className="edu-coming-soon-banner">
            <Info size={16} style={{ flexShrink: 0 }} />
            <div>
              <b>Coming soon</b>
              <p>
                This chapter hasn&apos;t been published yet. Check back soon — we&apos;re working on it.
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="edu-art-nav">
            {prevChapter ? (
              <Link
                href={`/education/${prevChapter.levelN}/${prevChapter.idx}`}
                className="edu-btn edu-btn-ghost"
              >
                <ArrowLeft size={14} /> Previous chapter
              </Link>
            ) : (
              <Link href={`/education/${levelNum}`} className="edu-btn edu-btn-ghost">
                <ArrowLeft size={14} /> Back to Level {levelNum}
              </Link>
            )}
            {nextChapter ? (
              <Link
                href={`/education/${nextChapter.levelN}/${nextChapter.idx}`}
                className="edu-btn edu-btn-primary"
              >
                Next chapter <ArrowRight size={14} />
              </Link>
            ) : (
              <span />
            )}
          </div>
        </article>

        {/* ── RAIL ── */}
        <aside className="edu-rail">
          <div className="edu-rail-title">Course outline</div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--muted-2)',
              marginBottom: 12,
              padding: '0 4px',
            }}
          >
            Level {levelNum} · {levelData.title}
          </div>

          {levelData.chapters.map((ch, ci) => {
            const chIsLab = ch.startsWith('HANDS-ON')
            const chTitle = chIsLab ? ch.replace('HANDS-ON: ', '') : ch
            const chActive = ci === lessonIdx

            return (
              <Link
                key={ci}
                href={`/education/${levelData.n}/${ci}`}
                className={`edu-rail-item${chActive ? ' edu-rail-active' : ''}`}
              >
                <div
                  className="edu-rail-no"
                  style={
                    chActive
                      ? ({ background: levelData.hex, color: '#06241a' } as React.CSSProperties)
                      : {}
                  }
                >
                  {ci + 1}
                </div>
                <span
                  style={{
                    flex: 1,
                    fontSize: 12.5,
                    lineHeight: 1.35,
                    color: chActive ? 'var(--text)' : 'var(--muted)',
                  }}
                >
                  {chIsLab ? '⚡ ' : ''}
                  {chTitle}
                </span>
              </Link>
            )
          })}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <Link
              href={`/education/${levelNum}`}
              className="edu-rail-item"
              style={{ textDecoration: 'none' }}
            >
              <ArrowLeft size={13} style={{ color: 'var(--muted-2)' }} />
              <span>Back to Level {levelNum}</span>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
