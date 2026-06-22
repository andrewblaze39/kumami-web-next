'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'

// ── Types ────────────────────────────────────────────────────────────────────

interface LevelProgress {
  completedChapters: number[]
  sectionProgress: { [chapterIndex: number]: number[] }
  updatedAt?: unknown
}

const EMPTY_PROGRESS: LevelProgress = {
  completedChapters: [],
  sectionProgress: {},
}

const LS_KEY = 'kumami_edu_progress'

// ── LocalStorage helpers ─────────────────────────────────────────────────────

function lsRead(): { [levelNum: number]: LevelProgress } {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function lsWrite(all: { [levelNum: number]: LevelProgress }) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(all))
  } catch {
    // ignore quota errors
  }
}

function lsGetLevel(levelNum: number): LevelProgress {
  const all = lsRead()
  return all[levelNum] ?? { ...EMPTY_PROGRESS }
}

function lsSetLevel(levelNum: number, progress: LevelProgress) {
  const all = lsRead()
  all[levelNum] = progress
  lsWrite(all)
}

// ── Firestore helpers ────────────────────────────────────────────────────────

function fsDocRef(uid: string, levelNum: number) {
  return doc(db, 'users', uid, 'education_progress', String(levelNum))
}

async function fsGetLevel(uid: string, levelNum: number): Promise<LevelProgress> {
  try {
    const snap = await getDoc(fsDocRef(uid, levelNum))
    if (snap.exists()) {
      const data = snap.data() as LevelProgress
      return {
        completedChapters: data.completedChapters ?? [],
        sectionProgress: data.sectionProgress ?? {},
      }
    }
  } catch (err) {
    console.error('[edu-progress] Firestore read failed:', err)
  }
  return { ...EMPTY_PROGRESS }
}

async function fsSetLevel(uid: string, levelNum: number, progress: LevelProgress) {
  try {
    await setDoc(
      fsDocRef(uid, levelNum),
      { ...progress, updatedAt: serverTimestamp() },
      { merge: true }
    )
  } catch (err) {
    console.error('[edu-progress] Firestore write failed:', err)
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useEducationProgress(levelNum: number) {
  const { currentUser } = useAuth()
  const uid = currentUser?.uid ?? null

  const [progress, setProgress] = useState<LevelProgress>({ ...EMPTY_PROGRESS })
  const [loaded, setLoaded] = useState(false)

  // Keep a ref so callbacks don't close over stale progress
  const progressRef = useRef(progress)
  progressRef.current = progress

  // Load on mount / when uid or levelNum changes
  useEffect(() => {
    let cancelled = false

    async function load() {
      const p = uid
        ? await fsGetLevel(uid, levelNum)
        : lsGetLevel(levelNum)
      if (!cancelled) {
        setProgress(p)
        setLoaded(true)
      }
    }

    load()
    return () => { cancelled = true }
  }, [uid, levelNum])

  // ── Write helpers ──────────────────────────────────────────────────────────

  const persist = useCallback(
    (next: LevelProgress) => {
      setProgress(next)
      if (uid) {
        fsSetLevel(uid, levelNum, next)
      } else {
        lsSetLevel(levelNum, next)
      }
    },
    [uid, levelNum]
  )

  // ── Public API ─────────────────────────────────────────────────────────────

  const markSectionVisited = useCallback(
    (chapterIndex: number, sectionIndex: number) => {
      const prev = progressRef.current
      const existing = prev.sectionProgress[chapterIndex] ?? []
      if (existing.includes(sectionIndex)) return // already recorded
      const next: LevelProgress = {
        ...prev,
        sectionProgress: {
          ...prev.sectionProgress,
          [chapterIndex]: [...existing, sectionIndex],
        },
      }
      persist(next)
    },
    [persist]
  )

  const markChapterComplete = useCallback(
    (chapterIndex: number, totalSections?: number) => {
      const prev = progressRef.current
      let next = { ...prev }

      // If totalSections provided, mark all sections as visited in one batch
      if (totalSections !== undefined && totalSections > 0) {
        const existing = prev.sectionProgress[chapterIndex] ?? []
        const allSections = Array.from({ length: totalSections }, (_, i) => i)
        const merged = [...new Set([...existing, ...allSections])]
        next = {
          ...next,
          sectionProgress: {
            ...next.sectionProgress,
            [chapterIndex]: merged,
          },
        }
      }

      // Mark chapter as complete
      if (!next.completedChapters.includes(chapterIndex)) {
        next = {
          ...next,
          completedChapters: [...next.completedChapters, chapterIndex],
        }
      }

      persist(next)
    },
    [persist]
  )

  const isChapterComplete = useCallback(
    (chapterIndex: number): boolean => {
      return progressRef.current.completedChapters.includes(chapterIndex)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [progress] // re-derive when progress changes
  )

  const getChapterSectionProgress = useCallback(
    (chapterIndex: number): number[] => {
      return progressRef.current.sectionProgress[chapterIndex] ?? []
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [progress]
  )

  const getProgress = useCallback((): LevelProgress => {
    return progressRef.current
  }, [])

  return {
    progress,
    loaded,
    markSectionVisited,
    markChapterComplete,
    isChapterComplete,
    getChapterSectionProgress,
    getProgress,
  }
}
