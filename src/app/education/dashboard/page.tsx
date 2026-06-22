'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { useEducationProgress } from '@/hooks/useEducationProgress'
import { PHASES } from '@/data/educationPhases'
import { resolveLevelNumber } from '@/lib/educationUtils'
import {
  CheckCircle2,
  BookOpen,
  Clock,
  Trophy,
  Lock,
  Check,
  Play,
  ArrowRight,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ArticleDoc {
  id: string
  title: string
  level: number | string
  chapterIndex?: number
  sections?: { title: string; content: unknown[] }[]
  minutes?: number
  createdAt?: unknown
  comingSoon?: boolean
  blurb?: string
}

// ── Per-level progress sub-component (one hook call per level) ────────────────

interface LevelStats {
  levelNum: number
  completedChapters: number[]
  sectionProgress: { [ci: number]: number[] }
  totalChapters: number
  loaded: boolean
}

function useLevelStats(levelNum: number): LevelStats {
  const { progress, loaded } = useEducationProgress(levelNum)
  const phase = PHASES.find(p => p.n === levelNum)!
  return {
    levelNum,
    completedChapters: progress.completedChapters,
    sectionProgress: progress.sectionProgress,
    totalChapters: phase.chapters.length,
    loaded,
  }
}

// ── Helper: level color var ───────────────────────────────────────────────────

function levelColor(n: number): string {
  const map: Record<number, string> = {
    1: 'var(--l1)',
    2: 'var(--l2)',
    3: 'var(--l3)',
    4: 'var(--l4)',
    5: 'var(--l5)',
  }
  return map[n] ?? 'var(--mint)'
}

function levelHex(n: number): string {
  const phase = PHASES.find(p => p.n === n)
  return phase?.hex ?? '#5ee9a8'
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="edu-progress">
      <i style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// ── Dashboard inner — has access to all 5 level hooks ────────────────────────

function DashboardInner() {
  const { currentUser } = useAuth()
  const displayName = currentUser?.displayName || 'Learner'

  const l1 = useLevelStats(1)
  const l2 = useLevelStats(2)
  const l3 = useLevelStats(3)
  const l4 = useLevelStats(4)
  const l5 = useLevelStats(5)
  const allLevels = [l1, l2, l3, l4, l5]

  // Articles fetched from Firestore
  const [articles, setArticles] = useState<ArticleDoc[]>([])
  const [articlesLoaded, setArticlesLoaded] = useState(false)

  useEffect(() => {
    async function fetchArticles() {
      try {
        const q = query(
          collection(db, 'education_articles'),
          where('status', '==', 'published'),
          orderBy('createdAt', 'desc')
        )
        const snap = await getDocs(q)
        const docs = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as ArticleDoc))
          .filter(a => a.comingSoon !== true)
        setArticles(docs)
      } catch {
        // Fallback: fetch without orderBy if index missing
        try {
          const snap = await getDocs(collection(db, 'education_articles'))
          const docs = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as ArticleDoc))
            .filter(a => a.comingSoon !== true)
          setArticles(docs)
        } catch {
          setArticles([])
        }
      } finally {
        setArticlesLoaded(true)
      }
    }
    fetchArticles()
  }, [])

  // ── Derived stats ──────────────────────────────────────────────────────────

  const allLoaded = allLevels.every(l => l.loaded)

  // Levels completed = all chapters done
  const levelsCompleted = allLevels.filter(
    l => l.completedChapters.length === l.totalChapters && l.totalChapters > 0
  ).length

  // Sections completed = sum of visited section indices across all levels & chapters
  const sectionsCompleted = allLevels.reduce((sum, l) => {
    return sum + Object.values(l.sectionProgress).reduce((s, arr) => s + arr.length, 0)
  }, 0)

  // Time learning = minutes for all articles in completed chapters
  const timeLearningMinutes = allLevels.reduce((sum, l) => {
    const phase = PHASES.find(p => p.n === l.levelNum)!
    const completedSet = new Set(l.completedChapters)
    // For each completed chapter, find matching article minutes
    phase.chapters.forEach((_, ci) => {
      if (completedSet.has(ci)) {
        const article = articles.find(a => {
          const ln = resolveLevelNumber(a.level)
          return ln === l.levelNum && (a.chapterIndex ?? -1) === ci
        })
        if (article?.minutes) sum += article.minutes
      }
    })
    return sum
  }, 0)

  const timeLearningHours = Math.floor(timeLearningMinutes / 60)
  const timeLearningMins = timeLearningMinutes % 60

  // Achievements earned = levelsCompleted (one badge per level)
  const achievementsEarned = levelsCompleted

  // ── Current level & chapter for "Continue Learning" ───────────────────────

  // Find first incomplete level
  const currentLevelStats = allLevels.find(
    l => l.completedChapters.length < l.totalChapters
  ) ?? allLevels[allLevels.length - 1]

  const currentPhase = PHASES.find(p => p.n === currentLevelStats.levelNum)!
  const completedSet = new Set(currentLevelStats.completedChapters)

  // First incomplete chapter index
  const currentChapterIdx = currentPhase.chapters.findIndex(
    (_, ci) => !completedSet.has(ci)
  )
  const resolvedChapterIdx = currentChapterIdx === -1 ? 0 : currentChapterIdx
  const currentChapterName = currentPhase.chapters[resolvedChapterIdx] ?? currentPhase.chapters[0]

  // Level progress pct — based on sections visited, not chapters completed (consistent with course page)
  function getLevelSectionPct(levelStats: LevelStats): number {
    const levelArticles = articles.filter(a => resolveLevelNumber(a.level) === levelStats.levelNum)
    const totalSections = levelArticles.reduce((s, a) => s + (a.sections?.length ?? 0), 0)
    const visitedSections = Object.values(levelStats.sectionProgress).reduce((s, arr) => s + arr.length, 0)
    return totalSections > 0 ? Math.round((visitedSections / totalSections) * 100) : 0
  }

  const levelProgressPct = getLevelSectionPct(currentLevelStats)

  // Overall progress pct (across all sections in all levels)
  const totalSectionsAll = articles.reduce((s, a) => s + (a.sections?.length ?? 0), 0)
  const visitedSectionsAll = allLevels.reduce((s, l) =>
    s + Object.values(l.sectionProgress).reduce((ss, arr) => ss + arr.length, 0), 0)
  const overallPct = totalSectionsAll > 0 ? Math.round((visitedSectionsAll / totalSectionsAll) * 100) : 0

  // Find article for current chapter
  const currentArticle = articles.find(a => {
    const ln = resolveLevelNumber(a.level)
    return ln === currentLevelStats.levelNum && (a.chapterIndex ?? -1) === resolvedChapterIdx
  }) ?? null

  // ── New & updated lessons (3 most recent with content) ────────────────────
  const newLessons = articlesLoaded ? articles.slice(0, 3) : []

  const cColor = levelColor(currentLevelStats.levelNum)
  const cHex = levelHex(currentLevelStats.levelNum)

  return (
    <div className="edu-content">

      {/* ── A. Welcome header ── */}
      <div className="edu-dash-welcome">
        <h1 className="edu-dash-welcome-title">
          Welcome back, <span style={{ color: cColor }}>{displayName}</span>
        </h1>
        <p className="edu-dash-welcome-sub">
          {allLoaded
            ? `You're ${overallPct}% through Level ${currentLevelStats.levelNum}. Pick up where you left off.`
            : 'Loading your progress…'}
        </p>
      </div>

      {/* ── B + C. Continue + Stats row ── */}
      <div className="edu-dash-top-row">

        {/* ── B. Continue Learning ── */}
        <div
          className="edu-dash-continue"
          style={{ borderLeftColor: cHex }}
        >
          <div className="edu-dash-continue-eyebrow">
            <span className="edu-eyebrow" style={{ fontSize: 10 }}>
              <span className="edu-dia" style={{ background: cColor }} />
              Continue Learning · Level 0{currentLevelStats.levelNum}
            </span>
          </div>

          <h2 className="edu-dash-continue-chapter">{currentChapterName}</h2>
          <p className="edu-dash-continue-meta">
            {currentPhase.title} · Chapter {resolvedChapterIdx + 1} of{' '}
            {currentPhase.chapters.length}
          </p>

          <div className="edu-dash-continue-prog">
            <div className="edu-prog-row">
              <span>Your progress</span>
              <span style={{ color: cColor, fontWeight: 700 }}>{levelProgressPct}%</span>
            </div>
            <ProgressBar pct={levelProgressPct} color={cHex} />
          </div>

          <div className="edu-dash-continue-actions">
            {currentArticle ? (
              <Link
                href={`/education/article/${currentArticle.id}`}
                className="edu-btn edu-btn-primary"
                style={{ background: cHex }}
              >
                <Play size={15} strokeWidth={2.5} fill="currentColor" />
                Resume chapter
              </Link>
            ) : (
              <Link
                href={`/education/${currentLevelStats.levelNum}/${resolvedChapterIdx}`}
                className="edu-btn edu-btn-primary"
                style={{ background: cHex }}
              >
                <Play size={15} strokeWidth={2.5} fill="currentColor" />
                Start chapter
              </Link>
            )}
            <Link
              href={`/education/${currentLevelStats.levelNum}`}
              className="edu-btn edu-btn-ghost"
            >
              View level overview
            </Link>
          </div>
        </div>

        {/* ── C. My Insights ── */}
        <div className="edu-dash-stats">
          <div className="edu-dash-stat">
            <div className="edu-dash-stat-icon" style={{ color: 'var(--mint)' }}>
              <CheckCircle2 size={20} strokeWidth={1.8} />
            </div>
            <div className="edu-dash-stat-value">{sectionsCompleted}</div>
            <div className="edu-dash-stat-label">Sections completed</div>
            <div className="edu-dash-stat-sub">counted per section</div>
          </div>

          <div className="edu-dash-stat">
            <div className="edu-dash-stat-icon" style={{ color: 'var(--l2)' }}>
              <BookOpen size={20} strokeWidth={1.8} />
            </div>
            <div className="edu-dash-stat-value">{levelsCompleted} <span className="edu-dash-stat-of">/ 5</span></div>
            <div className="edu-dash-stat-label">Levels completed</div>
            <div className="edu-dash-stat-sub">one per level</div>
          </div>

          <div className="edu-dash-stat">
            <div className="edu-dash-stat-icon" style={{ color: 'var(--l3)' }}>
              <Clock size={20} strokeWidth={1.8} />
            </div>
            <div className="edu-dash-stat-value">
              {timeLearningHours > 0 ? `${timeLearningHours}h ` : ''}
              {timeLearningMins}m
            </div>
            <div className="edu-dash-stat-label">Time learning</div>
            <div className="edu-dash-stat-sub">estimated</div>
          </div>

          <div className="edu-dash-stat">
            <div className="edu-dash-stat-icon" style={{ color: 'var(--l4)' }}>
              <Trophy size={20} strokeWidth={1.8} />
            </div>
            <div className="edu-dash-stat-value">{achievementsEarned} <span className="edu-dash-stat-of">of 5</span></div>
            <div className="edu-dash-stat-label">Achievements</div>
            <div className="edu-dash-stat-sub">earned</div>
          </div>
        </div>
      </div>

      {/* ── D + E. History + Achievements row ── */}
      <div className="edu-dash-history">

        {/* Learning history */}
        <div className="edu-dash-history-main">
          <div className="edu-dash-section-head">
            <span className="edu-dash-section-title">Learning history</span>
            <Link href="/education" className="edu-dash-see-all">
              See full history <ArrowRight size={13} />
            </Link>
          </div>

          <div className="edu-dash-history-list">
            {allLevels.map(l => {
              const phase = PHASES.find(p => p.n === l.levelNum)!
              const pct = getLevelSectionPct(l)
              const color = levelColor(l.levelNum)
              const hex = levelHex(l.levelNum)
              return (
                <Link
                  key={l.levelNum}
                  href={`/education/${l.levelNum}`}
                  className="edu-dash-history-item"
                >
                  <span
                    className="edu-dash-history-num"
                    style={{ background: hex + '22', color: hex, border: `1.5px solid ${hex}55` }}
                  >
                    {l.levelNum}
                  </span>
                  <div className="edu-dash-history-info">
                    <span className="edu-dash-history-name">{phase.title}</span>
                    <span className="edu-dash-history-meta">
                      {Object.values(l.sectionProgress).reduce((s, arr) => s + arr.length, 0)}/{articles.filter(a => resolveLevelNumber(a.level) === l.levelNum).reduce((s, a) => s + (a.sections?.length ?? 0), 0)} sections ·{' '}
                      <span style={{ color: hex }}>{phase.tag}</span>
                    </span>
                  </div>
                  <div className="edu-dash-history-right">
                    <span className="edu-dash-history-pct" style={{ color: color }}>
                      {pct}%
                    </span>
                    <div className="edu-dash-history-bar">
                      <ProgressBar pct={pct} color={hex} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Achievements */}
        <div className="edu-dash-achievements">
          <div className="edu-dash-section-head">
            <span className="edu-dash-section-title">Achievements</span>
            <Link href="/education/achievements" className="edu-dash-see-all">
              {achievementsEarned} of 5 earned
            </Link>
          </div>

          <div className="edu-dash-badges">
            {allLevels.map(l => {
              const phase = PHASES.find(p => p.n === l.levelNum)!
              const earned =
                l.totalChapters > 0 &&
                l.completedChapters.length === l.totalChapters
              const hex = levelHex(l.levelNum)
              return (
                <Link
                  key={l.levelNum}
                  href={`/education/achievements`}
                  className="edu-dash-badge"
                  title={earned ? `${phase.badge} — Earned` : `Complete Level ${l.levelNum} to unlock`}
                >
                  <div
                    className="edu-dash-badge-circle"
                    style={{
                      background: earned ? hex : 'var(--surface-3)',
                      border: `2px solid ${earned ? hex : 'var(--border-2)'}`,
                      color: earned ? '#06241a' : 'var(--muted-2)',
                    }}
                  >
                    {earned ? (
                      <Check size={18} strokeWidth={2.8} />
                    ) : (
                      <Lock size={14} strokeWidth={1.8} />
                    )}
                  </div>
                  <span
                    className="edu-dash-badge-name"
                    style={{ color: earned ? hex : 'var(--muted-2)' }}
                  >
                    {phase.badge}
                  </span>
                  <span className="edu-dash-badge-status">
                    {earned ? 'Earned' : `Level ${l.levelNum}`}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── F. New & updated lessons ── */}
      <div className="edu-dash-lessons">
        <div className="edu-dash-section-head">
          <span className="edu-dash-section-title">New &amp; updated lessons</span>
          <Link href="/education" className="edu-dash-see-all">
            All levels <ArrowRight size={13} />
          </Link>
        </div>

        {!articlesLoaded ? (
          <div style={{ color: 'var(--muted)', fontSize: 14, padding: '20px 0' }}>
            Loading lessons…
          </div>
        ) : newLessons.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 14, padding: '20px 0' }}>
            No published lessons yet.
          </div>
        ) : (
          <div className="edu-dash-lessons-grid">
            {newLessons.map(article => {
              const ln = resolveLevelNumber(article.level) ?? 1
              const phase = PHASES.find(p => p.n === ln)
              const hex = levelHex(ln)
              const sectionCount = article.sections?.length ?? 0
              return (
                <Link
                  key={article.id}
                  href={`/education/article/${article.id}`}
                  className="edu-dash-lesson-card"
                >
                  <div className="edu-dash-lesson-top">
                    <span
                      className="edu-dash-lesson-tag"
                      style={{ background: hex + '20', color: hex, borderColor: hex + '44' }}
                    >
                      Level {ln}
                    </span>
                  </div>
                  <h3 className="edu-dash-lesson-title">{article.title}</h3>
                  {article.blurb && (
                    <p className="edu-dash-lesson-blurb">{article.blurb}</p>
                  )}
                  <div className="edu-dash-lesson-meta">
                    {sectionCount > 0 && (
                      <span>{sectionCount} section{sectionCount !== 1 ? 's' : ''}</span>
                    )}
                    {article.minutes != null && article.minutes > 0 && (
                      <span>{article.minutes}m</span>
                    )}
                    {phase && (
                      <span style={{ marginLeft: 'auto', color: hex, fontWeight: 700 }}>
                        {phase.tag}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return <DashboardInner />
}
