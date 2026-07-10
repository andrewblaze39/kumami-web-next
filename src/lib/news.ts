/**
 * src/lib/news.ts — server-only Firestore helpers for the `news` collection.
 * Uses firebase-admin (server SDK). Import only in Server Components / Route Handlers.
 *
 * Field names verified from:
 *   - src/components/NewsGrid.tsx        (title, excerpt, summary, category, imageUrl, isPremium, status, timestamp)
 *   - src/components/NewsArticleView.tsx (above + content, author, kumamiInsight, date)
 *   - src/app/news/[id]/page.tsx         (above)
 *
 * Tier tags (advanced, pro) are not yet in the Firestore schema — typed optional.
 */

import 'server-only';
import { cache } from 'react';
import { adminDb } from '@/lib/firebase-admin';

// ---------- Types ----------

export interface FirestoreTimestampLike {
  seconds?: number;
  nanoseconds?: number;
}

export interface NewsArticle {
  id: string;
  title?: string;
  /** Short teaser copy shown in cards */
  excerpt?: string;
  /** Longer teaser / pull-quote shown in article view */
  summary?: string;
  /** Full body — stored as markdown string or TipTap JSON string */
  content?: string;
  category?: string;
  imageUrl?: string;
  author?: string;
  /** Legacy premium flag (maps to "PRO" tier for now) */
  isPremium?: boolean;
  status?: string;
  /** Primary timestamp field */
  timestamp?: FirestoreTimestampLike;
  /** Alternate date field used in some older documents */
  date?: FirestoreTimestampLike;
  /** Kumami AI insight text */
  kumamiInsight?: string;
  /** Advanced-tier tag — deep-links to /world/intel/[id] */
  isAdvanced?: boolean;
  /** PRO-tier tag — blurs body, gate → /world/pro */
  isPro?: boolean;
  /** Source publication name */
  source?: string;
  /** Array of string tags */
  tags?: string[];
}

// ---------- Helpers ----------

/** Safely call adminDb() — returns null if env var is absent (build-time safety). */
function safeDb() {
  try {
    return adminDb();
  } catch {
    return null;
  }
}

/** Resolve the best timestamp object from a document. */
export function resolveTimestamp(
  article: Pick<NewsArticle, 'timestamp' | 'date'>
): FirestoreTimestampLike | undefined {
  return article.timestamp || article.date;
}

/** Convert Firestore timestamp-like to a JS Date. */
export function timestampToDate(ts: FirestoreTimestampLike | undefined): Date | null {
  if (!ts) return null;
  if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
  return null;
}

/**
 * Derive the category capsule list from real articles (pure helper).
 * Distinct, non-empty, trimmed `category` values ordered by
 * frequency desc, then alphabetically.
 */
export function getNewsCategories(
  articles: Pick<NewsArticle, 'category'>[]
): string[] {
  const counts = new Map<string, number>();
  for (const article of articles) {
    const cat = (article.category ?? '').trim();
    if (!cat) continue;
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([cat]) => cat);
}

// ---------- Queries ----------

interface GetPublishedNewsOptions {
  category?: string;
  limit?: number;
  /** ISO date string or Firestore timestamp seconds for cursor pagination */
  cursorSeconds?: number;
}

/**
 * Fetch published news articles, ordered by timestamp desc.
 * Returns empty array (never throws) so pages render gracefully during build.
 */
export async function getPublishedNews({
  category,
  limit: limitVal = 30,
  cursorSeconds,
}: GetPublishedNewsOptions = {}): Promise<NewsArticle[]> {
  const db = safeDb();
  if (!db) return [];

  // When a category is requested, attempt a composite index query first.
  if (category) {
    try {
      // Requires composite index: status ASC, category ASC, timestamp DESC.
      // Create it in the Firebase console if Firestore throws FAILED_PRECONDITION.
      let q = db
        .collection('news')
        .where('status', '==', 'published')
        .where('category', '==', category)
        .orderBy('timestamp', 'desc')
        .limit(limitVal);

      if (cursorSeconds !== undefined) {
        const { Timestamp } = await import('firebase-admin/firestore');
        q = q.startAfter(Timestamp.fromMillis(cursorSeconds * 1000));
      }

      const snapshot = await q.get();
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<NewsArticle, 'id'>),
      }));
    } catch (err: unknown) {
      // FAILED_PRECONDITION means the composite index doesn't exist yet.
      // Fall back to a larger in-memory filter so the page still works.
      const code = (err as { code?: string | number })?.code;
      if (code === 'failed-precondition' || code === 9) {
        console.warn(
          '[news.ts] getPublishedNews: composite index missing for ' +
            '(status ASC, category ASC, timestamp DESC). ' +
            'Create it in the Firebase console to enable efficient category queries. ' +
            'Falling back to in-memory filter (limit 100).'
        );
        // Fall through to the in-memory fallback below.
      } else {
        console.error('[news.ts] getPublishedNews (category) error:', err);
        return [];
      }
    }

    // In-memory fallback: fetch a larger batch and filter client-side.
    try {
      const cat = category.toLowerCase();
      let q = db
        .collection('news')
        .where('status', '==', 'published')
        .orderBy('timestamp', 'desc')
        .limit(100);

      if (cursorSeconds !== undefined) {
        const { Timestamp } = await import('firebase-admin/firestore');
        q = q.startAfter(Timestamp.fromMillis(cursorSeconds * 1000));
      }

      const snapshot = await q.get();
      return snapshot.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<NewsArticle, 'id'>) }))
        .filter((a) => (a.category ?? '').toLowerCase() === cat);
    } catch (err) {
      console.error('[news.ts] getPublishedNews fallback error:', err);
      return [];
    }
  }

  // No category filter — simple status + timestamp query.
  try {
    let q = db
      .collection('news')
      .where('status', '==', 'published')
      .orderBy('timestamp', 'desc')
      .limit(limitVal);

    if (cursorSeconds !== undefined) {
      // Firestore Admin uses Timestamp objects for startAfter
      const { Timestamp } = await import('firebase-admin/firestore');
      q = q.startAfter(Timestamp.fromMillis(cursorSeconds * 1000));
    }

    const snapshot = await q.get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<NewsArticle, 'id'>),
    }));
  } catch (err) {
    console.error('[news.ts] getPublishedNews error:', err);
    return [];
  }
}

// ---------- YouTube Shorts ----------

export interface YoutubeShort {
  id: string;
  videoId?: string;
  title?: string;
  isActive?: boolean;
  order?: number;
}

/**
 * Fetch active YouTube shorts, ordered by `order` asc.
 * Mirrors the legacy NewsGrid query (collection `youtube_shorts`).
 * Returns empty array (never throws).
 */
export async function getYoutubeShorts(limitVal = 50): Promise<YoutubeShort[]> {
  const db = safeDb();
  if (!db) return [];

  try {
    const snapshot = await db.collection('youtube_shorts').limit(limitVal).get();
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<YoutubeShort, 'id'>) }))
      .filter((s) => s.isActive !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (err) {
    console.error('[news.ts] getYoutubeShorts error:', err);
    return [];
  }
}

/**
 * Fetch a single article by id.
 * Wrapped in React cache() so generateMetadata + page share the same read
 * within a single request without hitting Firestore twice.
 * Returns null if not found or if an error occurs.
 */
export const getNewsById = cache(async (id: string): Promise<NewsArticle | null> => {
  const db = safeDb();
  if (!db) return null;

  try {
    const snap = await db.collection('news').doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...(snap.data() as Omit<NewsArticle, 'id'>) };
  } catch (err) {
    console.error('[news.ts] getNewsById error:', err);
    return null;
  }
});
