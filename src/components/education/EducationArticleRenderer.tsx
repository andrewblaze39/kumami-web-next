'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ChevronRight, Check } from 'lucide-react'
import { PHASES } from '@/data/educationPhases'
import { resolveLevelNumber } from '@/lib/educationUtils'
import { useEducationProgress } from '@/hooks/useEducationProgress'

interface ArticleSectionContent {
  type: 'paragraph' | 'image' | 'youtube'
  text?: string
  src?: string
  alt?: string
  caption?: string
  videoId?: string
  title?: string
}

interface ArticleSection {
  title: string
  content: ArticleSectionContent[]
}

export interface EducationArticleContentProps {
  article: {
    title: string
    description?: string
    author?: string
    level?: number | string
    chapterIndex?: number
    thumbnail?: string
    sections?: ArticleSection[]
    blurb?: string
    minutes?: number
  }
  articleId: string
  prevArticleId: string | null
  nextArticleId: string | null
  levelNum?: number
  chapterName?: string
  chapterIndex?: number
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function parseMarkdown(text: string | undefined): string {
  if (!text) return ''
  const escaped = escapeHtml(text)
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
}

export default function EducationArticleRenderer({
  article,
  prevArticleId,
  nextArticleId,
  levelNum: levelNumProp,
  chapterName: chapterNameProp,
  chapterIndex: chapterIndexProp,
}: EducationArticleContentProps) {
  const sections = article.sections || []
  const totalSections = sections.length

  const levelNum = levelNumProp ?? resolveLevelNumber(article.level) ?? null
  const levelData = levelNum ? PHASES.find(p => p.n === levelNum) : null
  const levelTitle = levelData?.title ?? ''

  const resolvedChapterIndex = chapterIndexProp ?? article.chapterIndex
  const chapterName = chapterNameProp
    ?? (levelData && resolvedChapterIndex !== undefined
        ? levelData.chapters[resolvedChapterIndex]
        : undefined)

  // Progress hook — only meaningful when we have a level and chapterIndex
  const progressLevelNum = levelNum ?? 0
  const {
    loaded: progressLoaded,
    markSectionVisited,
    markChapterComplete,
    getChapterSectionProgress,
  } = useEducationProgress(progressLevelNum)

  // Current section index (0 = intro/header, 1..N = section content)
  const [currentStep, setCurrentStep] = useState(0)
  // Track which sections the user has visited (pre-filled from Firestore/LS after load)
  const [visitedSections, setVisitedSections] = useState<Set<number>>(new Set([0]))

  // Pre-fill visitedSections once progress is loaded from Firestore/localStorage
  useEffect(() => {
    if (!progressLoaded) return
    if (resolvedChapterIndex === undefined) return
    const saved = getChapterSectionProgress(resolvedChapterIndex)
    if (saved.length > 0) {
      // saved contains 0-based section indices (0 = intro, 1..N = sections)
      setVisitedSections(prev => {
        const next = new Set(prev)
        saved.forEach(s => next.add(s + 1)) // saved are 0-based sections, steps are 1-based
        next.add(0) // intro is always visited
        return next
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressLoaded])

  // Progress: 0 = intro only, then each section adds to progress
  // When all sections visited + on last section = 100%
  const progressPercent = totalSections === 0
    ? 100
    : Math.round((visitedSections.size / (totalSections + 1)) * 100)

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step)
    setVisitedSections(prev => new Set(prev).add(step))
    // Only persist actual content sections (step 1..N → sectionIndex 0..N-1), not intro (step 0)
    if (step > 0 && resolvedChapterIndex !== undefined && levelNum !== null) {
      markSectionVisited(resolvedChapterIndex, step - 1)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [resolvedChapterIndex, levelNum, markSectionVisited])

  const goNext = useCallback(() => {
    if (currentStep < totalSections) {
      goToStep(currentStep + 1)
    }
  }, [currentStep, totalSections, goToStep])

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1)
    }
  }, [currentStep, goToStep])

  // Called when user clicks "Mark complete & continue" in the rail
  const handleMarkComplete = useCallback(() => {
    if (resolvedChapterIndex !== undefined && levelNum !== null) {
      // Mark chapter complete WITH all sections in one atomic write
      markChapterComplete(resolvedChapterIndex, totalSections)
      // Update local UI
      setVisitedSections(() => {
        const all = new Set<number>()
        for (let i = 0; i <= totalSections; i++) all.add(i)
        return all
      })
    }
  }, [resolvedChapterIndex, levelNum, totalSections, markChapterComplete])

  const isIntro = currentStep === 0
  const isLastSection = currentStep === totalSections
  const currentSection = !isIntro ? sections[currentStep - 1] : null

  return (
    <div className="edu-content">
      <div className="edu-lesson-grid">

        {/* ── ARTICLE CONTENT ── */}
        <article className="edu-article">

          {/* Breadcrumb */}
          <div style={{ marginBottom: 20 }}>
            <nav style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 13 }}>
              <Link href="/education" className="edu-crumb" style={{ textDecoration: 'none' }}>
                Education
              </Link>
              {levelNum && (
                <>
                  <ChevronRight size={12} style={{ color: 'var(--muted-2)', flexShrink: 0 }} />
                  <Link
                    href={`/education/${levelNum}`}
                    className="edu-crumb"
                    style={{ textDecoration: 'none' }}
                  >
                    Level {levelNum}{levelTitle ? `: ${levelTitle}` : ''}
                  </Link>
                </>
              )}
              {chapterName && resolvedChapterIndex !== undefined && (
                <>
                  <ChevronRight size={12} style={{ color: 'var(--muted-2)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>
                    Chapter {resolvedChapterIndex + 1}: {chapterName}
                  </span>
                </>
              )}
            </nav>
          </div>

          {/* Progress bar */}
          {totalSections > 0 && (
            <div className="edu-step-progress">
              <div className="edu-step-progress-row">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="edu-step-progress-bar">
                <div
                  className="edu-step-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="edu-step-progress-label">
                {isIntro ? 'Introduction' : `Section ${currentStep} of ${totalSections}`}
              </div>
            </div>
          )}

          {/* ── INTRO PAGE (step 0) ── */}
          {isIntro && (
            <>
              {/* Header */}
              <div className="edu-l-head">
                {levelNum && (
                  <span className="edu-lv-tag" style={{ fontSize: 12 }}>
                    Level {levelNum}{levelTitle ? `: ${levelTitle}` : ''}
                  </span>
                )}
                <h1>{article.title}</h1>
                <div className="edu-l-meta">
                  <span style={{ fontSize: 13.5, color: 'var(--muted)' }}>
                    By {article.author || 'Kumami Team'}
                  </span>
                  {article.minutes && article.minutes > 0 ? (
                    <span style={{ fontSize: 13.5, color: 'var(--muted)' }}>
                      · {article.minutes} min read
                    </span>
                  ) : null}
                </div>
                {article.blurb && (
                  <p style={{ color: 'var(--muted)', fontSize: 14.5, lineHeight: 1.6, marginTop: 8 }}>
                    {article.blurb}
                  </p>
                )}
              </div>

              {/* Thumbnail */}
              {article.thumbnail && (
                <div
                  style={{
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                    marginBottom: 28,
                    aspectRatio: '16 / 7',
                    backgroundImage: `url(${article.thumbnail})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '1px solid var(--border)',
                  }}
                />
              )}

              {/* Section overview */}
              {totalSections > 0 && (
                <div className="edu-step-overview">
                  <h3>What you&apos;ll learn in this chapter</h3>
                  <div className="edu-step-overview-list">
                    {sections.map((section, si) => (
                      <button
                        key={si}
                        onClick={() => goToStep(si + 1)}
                        className={`edu-step-overview-item${visitedSections.has(si + 1) ? ' edu-step-visited' : ''}`}
                      >
                        <div className={`edu-step-overview-no${visitedSections.has(si + 1) ? ' edu-step-overview-done' : ''}`}>
                          {visitedSections.has(si + 1) ? <Check size={12} /> : si + 1}
                        </div>
                        <span>{section.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Start button */}
              {totalSections > 0 && (
                <div className="edu-step-start">
                  <button onClick={goNext} className="edu-btn edu-btn-primary edu-btn-lg">
                    Start chapter <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── SECTION CONTENT (step 1..N) ── */}
          {!isIntro && currentSection && (
            <>
              <div className="edu-art-body">
                <div className="edu-step-section-header">
                  <span className="edu-step-section-num">Section {currentStep} of {totalSections}</span>
                  <h2>{currentSection.title}</h2>
                </div>
                {currentSection.content.map((item, ii) => {
                  if (item.type === 'paragraph') {
                    return (
                      <p
                        key={ii}
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(item.text) }}
                      />
                    )
                  }
                  if (item.type === 'image') {
                    return (
                      <div key={ii} className="edu-art-img-wrap">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.src}
                          alt={item.alt || ''}
                          className="edu-art-img"
                        />
                        {item.caption && (
                          <p className="edu-art-caption">{item.caption}</p>
                        )}
                      </div>
                    )
                  }
                  if (item.type === 'youtube') {
                    return (
                      <div key={ii} className="edu-art-video-wrap">
                        <iframe
                          className="edu-art-video"
                          src={`https://www.youtube.com/embed/${item.videoId}`}
                          title={item.title || 'YouTube video'}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                        {item.caption && (
                          <p className="edu-art-caption">{item.caption}</p>
                        )}
                      </div>
                    )
                  }
                  return null
                })}
              </div>

              {/* Section navigation */}
              <div className="edu-step-nav">
                <button
                  onClick={goPrev}
                  className="edu-btn edu-btn-ghost"
                >
                  <ArrowLeft size={14} /> {currentStep === 1 ? 'Back to intro' : 'Previous section'}
                </button>

                {!isLastSection ? (
                  <button
                    onClick={goNext}
                    className="edu-btn edu-btn-primary"
                  >
                    Next section <ArrowRight size={14} />
                  </button>
                ) : (
                  /* Last section — show chapter navigation */
                  <div style={{ display: 'flex', gap: 10 }}>
                    {nextArticleId ? (
                      <Link
                        href={`/education/article/${nextArticleId}`}
                        className="edu-btn edu-btn-primary"
                        onClick={handleMarkComplete}
                      >
                        Next chapter <ArrowRight size={14} />
                      </Link>
                    ) : levelNum ? (
                      <Link
                        href={`/education/${levelNum}`}
                        className="edu-btn edu-btn-primary"
                        onClick={handleMarkComplete}
                      >
                        Back to Level {levelNum} <ArrowRight size={14} />
                      </Link>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Chapter complete message */}
              {isLastSection && progressPercent === 100 && (
                <div className="edu-step-complete">
                  <Check size={20} />
                  <div>
                    <strong>Chapter complete!</strong>
                    <p>You&apos;ve read all sections in this chapter.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* No content */}
          {totalSections === 0 && (
            <div className="edu-art-no-content">
              <p>This article has no content yet.</p>
            </div>
          )}

          {/* Prev / Next chapter navigation (only on intro) */}
          {isIntro && (
            <div className="edu-art-nav">
              {prevArticleId ? (
                <Link
                  href={`/education/article/${prevArticleId}`}
                  className="edu-btn edu-btn-ghost"
                >
                  <ArrowLeft size={14} /> Previous chapter
                </Link>
              ) : (
                <span />
              )}
              {nextArticleId ? (
                <Link
                  href={`/education/article/${nextArticleId}`}
                  className="edu-btn edu-btn-ghost"
                >
                  Next chapter <ArrowRight size={14} />
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}
        </article>

        {/* ── RAIL (section progress) ── */}
        <aside className="edu-rail">
          {totalSections > 0 && (
            <>
              <div className="edu-rail-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>In this chapter</span>
                <span style={{ color: 'var(--mint)', fontWeight: 800 }}>{progressPercent}%</span>
              </div>

              {/* Intro link */}
              <button
                onClick={() => goToStep(0)}
                className={`edu-rail-item${currentStep === 0 ? ' edu-rail-active' : ''}`}
                style={{
                  background: 'none',
                  border: currentStep === 0 ? '1px solid var(--border)' : '1px solid transparent',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <div className={`edu-rail-no${visitedSections.has(0) && currentStep !== 0 ? ' edu-rail-no-done' : ''}`}>
                  {visitedSections.has(0) && currentStep !== 0 ? <Check size={10} /> : '○'}
                </div>
                <span style={{ flex: 1 }}>Introduction</span>
              </button>

              {sections.map((section, si) => {
                const stepIdx = si + 1
                const isVisited = visitedSections.has(stepIdx)
                const isCurrent = currentStep === stepIdx
                return (
                  <button
                    key={si}
                    onClick={() => goToStep(stepIdx)}
                    className={`edu-rail-item${isCurrent ? ' edu-rail-active' : ''}`}
                    style={{
                      background: 'none',
                      border: isCurrent ? '1px solid var(--border)' : '1px solid transparent',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div className={`edu-rail-no${isVisited && !isCurrent ? ' edu-rail-no-done' : ''}`}>
                      {isVisited && !isCurrent ? <Check size={10} /> : stepIdx}
                    </div>
                    <span style={{ flex: 1 }}>{section.title}</span>
                    <span className="edu-ptype">Read</span>
                  </button>
                )
              })}

              {/* Mark complete & continue — shown at bottom of rail */}
              {nextArticleId && (
                <div style={{ marginTop: 16 }}>
                  <Link
                    href={`/education/article/${nextArticleId}`}
                    className="edu-btn edu-btn-primary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: 13, padding: '10px 14px' }}
                    onClick={handleMarkComplete}
                  >
                    Mark complete &amp; continue <ArrowRight size={13} />
                  </Link>
                </div>
              )}
              {!nextArticleId && levelNum && (
                <div style={{ marginTop: 16 }}>
                  <Link
                    href={`/education/${levelNum}`}
                    className="edu-btn edu-btn-primary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: 13, padding: '10px 14px' }}
                    onClick={handleMarkComplete}
                  >
                    Complete level <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </>
          )}

          {levelNum && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <Link
                href={`/education/${levelNum}`}
                className="edu-rail-item"
                style={{ textDecoration: 'none' }}
              >
                <ChevronRight size={14} style={{ color: 'var(--muted-2)' }} />
                <span>Back to Level {levelNum}</span>
              </Link>
              <Link
                href="/education"
                className="edu-rail-item"
                style={{ textDecoration: 'none' }}
              >
                <ChevronRight size={14} style={{ color: 'var(--muted-2)' }} />
                <span>All levels</span>
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
