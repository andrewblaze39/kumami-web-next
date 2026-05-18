// Seed data + date helpers + localStorage persistence for the Kumami Roadmap.
// Drop at src/components/roadmap/data.ts
//
// To swap to Firestore later, replace ROADMAP_STORE with a Firestore subscriber.
// Schema suggestion: a single doc at `system/roadmap` holding the full RoadmapState.

import type {
  BucketColor,
  DeadlineBucket,
  RoadmapItem,
  RoadmapState,
} from './types';

// ── Seed ──────────────────────────────────────────────────────────────────
// Replace these dates with real targets as plans firm up.
export const ROADMAP_SEED: RoadmapState = {
  version: 1,
  updatedAt: '2026-05-18',
  categories: [
    {
      id: 'news-portal',
      name: 'News Portal',
      items: [
        { id: 'np-1', text: 'Education kebawah di remove', deadline: '2026-05-19', done: false },
      ],
    },
    {
      id: 'education-portal',
      name: 'Education Portal',
      items: [
        {
          id: 'ep-1',
          text: 'Make the education article more slim to be easily readable — follow Investopedia design',
          deadline: '2026-05-24',
          done: false,
        },
      ],
    },
    {
      id: 'portfolio-manager',
      name: 'Pro · Portfolio Manager',
      items: [
        {
          id: 'pm-1',
          text: 'Add Kuma AI analysis box — 2-column grid: holdings left, Kuma AI box right',
          deadline: '2026-05-31',
          done: false,
        },
        {
          id: 'pm-2',
          text: 'Kuma AI chat bubble can read & analyze user portfolio + market movement → bite-sized feedback',
          deadline: '2026-06-15',
          done: false,
        },
      ],
    },
    {
      id: 'alpha-room',
      name: 'Pro · Alpha Room',
      items: [],
    },
    {
      id: 'market-analysis',
      name: 'Pro · Market Analysis',
      items: [
        { id: 'ma-1', text: 'Market analysis new design revamp', deadline: '2026-05-24', done: false },
      ],
    },
    {
      id: 'kuma-chatroom',
      name: 'Pro · Kuma AI Chatroom',
      items: [
        {
          id: 'kc-1',
          text: 'Kuma AI chatroom becomes the homepage of Kumami Pro — welcome + built-in buttons to other tabs / discover features',
          deadline: '2026-05-31',
          done: false,
        },
        {
          id: 'kc-2',
          text: 'Kuma AI chatroom revamp to look like Claude or Elfa AI',
          deadline: '2026-05-24',
          done: false,
        },
        {
          id: 'kc-3',
          text: 'Address tracker — finalize which Alchemy API functions to bring into the tracker',
          deadline: '2026-05-31',
          done: false,
        },
      ],
    },
  ],
};

// ── Persistence (localStorage; swap to Firestore later) ───────────────────
const STORAGE_KEY = 'kumami-roadmap-v1';

export const roadmapStore = {
  load(): RoadmapState | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as RoadmapState) : null;
    } catch {
      return null;
    }
  },
  save(state: RoadmapState): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota etc — silently fail */
    }
  },
  reset(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  },
};

// ── Date helpers ──────────────────────────────────────────────────────────
function parse(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  // Use noon to avoid timezone-edge-day issues
  return new Date(`${d}T12:00:00`);
}

export const dateUtil = {
  parse,

  /** Days from today (00:00) to the given date. */
  daysFromNow(d: string | Date | null | undefined): number | null {
    const x = parse(d);
    if (!x) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(x);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86_400_000);
  },

  /** Friendly label + colour bucket for a deadline. */
  bucket(d: string | Date | null | undefined): DeadlineBucket {
    if (!d) return { label: 'No date', color: 'neutral', diff: null, urgent: false };
    const diff = this.daysFromNow(d);
    if (diff === null) return { label: 'No date', color: 'neutral', diff: null, urgent: false };
    if (diff < 0) return { label: `${-diff}d overdue`, color: 'red', diff, urgent: true };
    if (diff === 0) return { label: 'Today', color: 'amber', diff, urgent: true };
    if (diff === 1) return { label: 'Tomorrow', color: 'amber', diff, urgent: true };
    if (diff <= 7) return { label: `In ${diff} days`, color: 'amber', diff, urgent: false };
    if (diff <= 14) return { label: `In ${diff} days`, color: 'mint', diff, urgent: false };
    if (diff <= 30) return { label: `In ${diff} days`, color: 'mint', diff, urgent: false };
    return { label: `In ${diff} days`, color: 'dim', diff, urgent: false };
  },

  short(d: string | Date | null | undefined): string {
    const x = parse(d);
    return x ? x.toLocaleString('en-US', { month: 'short', day: 'numeric' }) : '—';
  },

  full(d: string | Date | null | undefined): string {
    const x = parse(d);
    return x ? x.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  },

  /** "Today" / "This week" / "Next week" / "Later this month" / "Beyond" / "Overdue" / "No date" */
  groupFor(diff: number | null): string {
    if (diff === null) return 'No date';
    if (diff < 0) return 'Overdue';
    if (diff === 0) return 'Today';
    if (diff <= 7) return 'This week';
    if (diff <= 14) return 'Next week';
    if (diff <= 30) return 'Later this month';
    return 'Beyond';
  },

  iso(d: string | Date | null | undefined): string {
    const x = parse(d);
    if (!x) return '';
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const day = String(x.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },
};

/** Stable ish-unique id for new categories & items */
export const createId = (prefix = 'id'): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// ── Bucket → tailwind/style colour map ────────────────────────────────────
export const BUCKET_STYLES: Record<
  BucketColor,
  { fg: string; bg: string; border: string }
> = {
  red:     { fg: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.45)' },
  amber:   { fg: '#FACC15', bg: 'rgba(250,204,21,0.12)',  border: 'rgba(250,204,21,0.45)' },
  mint:    { fg: '#96EDD6', bg: 'rgba(150,237,214,0.10)', border: 'rgba(150,237,214,0.45)' },
  dim:     { fg: 'rgba(255,255,255,0.65)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.12)' },
  neutral: { fg: 'rgba(255,255,255,0.40)', bg: 'transparent', border: 'rgba(255,255,255,0.10)' },
};

export type { RoadmapItem };
