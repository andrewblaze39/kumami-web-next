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
  version: 2,
  updatedAt: '2026-10-11',
  categories: [],
};

// ── Additions after launch ────────────────────────────────────────────────
// Items added to the roadmap after browsers already saved their own copy.
// load() merges each one in once (tracked in state.seededIds), so it appears
// for everyone but stays deleted if an admin removes it.
export const ROADMAP_ADDITIONS: { categoryId: string; categoryName: string; item: RoadmapItem }[] = [
  { categoryId: 'kuma-ai-knowledge', categoryName: 'Kuma AI · Knowledge', item: { id: 'kk-1', text: 'Refresh Kuma AI’s company-knowledge PDF in n8n from the current product spec (tiers, Plus/Pro tools, Pro content, how to get Pro) so answers are smarter — later, after the Plus/Pro work', deadline: null, done: false } },
  { categoryId: 'site-polish', categoryName: 'Website polish · launch checklist', item: { id: 'sp-1', text: 'Share image (Open Graph) for every link preview — the referenced og-default.png was missing', deadline: null, done: false } },
  { categoryId: 'site-polish', categoryName: 'Website polish · launch checklist', item: { id: 'sp-2', text: 'robots.txt + sitemap.xml', deadline: null, done: false } },
  { categoryId: 'site-polish', categoryName: 'Website polish · launch checklist', item: { id: 'sp-3', text: 'Custom branded 404 page', deadline: null, done: false } },
  { categoryId: 'site-polish', categoryName: 'Website polish · launch checklist', item: { id: 'sp-4', text: 'Meta title + description on every page', deadline: null, done: false } },
  { categoryId: 'site-polish', categoryName: 'Website polish · launch checklist', item: { id: 'sp-5', text: 'Alt text on every image', deadline: null, done: false } },
  { categoryId: 'site-polish', categoryName: 'Website polish · launch checklist', item: { id: 'sp-6', text: 'Web app manifest (installable icon set)', deadline: null, done: false } },
  { categoryId: 'site-polish', categoryName: 'Website polish · launch checklist', item: { id: 'sp-7', text: 'Public Terms page (legal pages must not need a login)', deadline: null, done: false } },
  { categoryId: 'site-polish', categoryName: 'Website polish · launch checklist', item: { id: 'sp-8', text: 'Privacy policy page — draft from what the app collects, Andrew/lawyer to review', deadline: null, done: false } },
  { categoryId: 'site-polish', categoryName: 'Website polish · launch checklist', item: { id: 'sp-9', text: 'Cookie consent banner — analytics off until accepted', deadline: null, done: false } },
  { categoryId: 'site-polish', categoryName: 'Website polish · launch checklist', item: { id: 'sp-10', text: 'Real contact email + business address in the footer / About', deadline: null, done: false } },
  { categoryId: 'site-polish', categoryName: 'Website polish · launch checklist', item: { id: 'sp-11', text: 'Decide which pages are public for Google (news, research, blogs, education articles) — today every /world page needs a login', deadline: null, done: false } },
  { categoryId: 'pro-airdrops', categoryName: 'Pro · Airdrops & Whitelist', item: { id: 'al-1', text: 'Airdrop & whitelist cards: optional logo upload in the admin form (coloured letter stays as fallback)', deadline: null, done: false } },
];

// Items Andrew scrapped (11 Oct 2026). Removed from saved roadmaps too, and their
// categories disappear once empty.
export const ROADMAP_RETIRED_IDS = ['np-1', 'ep-1', 'pm-1', 'pm-2', 'ma-1', 'kc-1', 'kc-2', 'kc-3'];
const RETIRED_CATEGORY_IDS = ['news-portal', 'education-portal', 'portfolio-manager', 'alpha-room', 'market-analysis', 'kuma-chatroom'];

export function withAdditions(input: RoadmapState): RoadmapState {
  const retired = new Set(ROADMAP_RETIRED_IDS);
  const state: RoadmapState = {
    ...input,
    categories: input.categories
      .map((c) => ({ ...c, items: c.items.filter((i) => !retired.has(i.id)) }))
      .filter((c) => !(RETIRED_CATEGORY_IDS.includes(c.id) && c.items.length === 0)),
  };
  const seeded = new Set(state.seededIds ?? []);
  const pending = ROADMAP_ADDITIONS.filter((a) => !seeded.has(a.item.id));
  if (!pending.length) return state;
  const categories = state.categories.map((c) => ({ ...c, items: [...c.items] }));
  for (const { categoryId, categoryName, item } of pending) {
    let cat = categories.find((c) => c.id === categoryId);
    if (!cat) { cat = { id: categoryId, name: categoryName, items: [] }; categories.push(cat); }
    if (!cat.items.some((i) => i.id === item.id)) cat.items.push({ ...item });
  }
  return { ...state, categories, seededIds: [...seeded, ...pending.map((a) => a.item.id)] };
}

// ── Persistence (localStorage; swap to Firestore later) ───────────────────
const STORAGE_KEY = 'kumami-roadmap-v1';

export const roadmapStore = {
  load(): RoadmapState | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? withAdditions(JSON.parse(raw) as RoadmapState) : null;
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
