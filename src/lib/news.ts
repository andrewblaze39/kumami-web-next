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

    let articles: NewsArticle[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<NewsArticle, 'id'>),
    }));

    // Category filter — apply server-side via Firestore if possible,
    // but keep the post-filter here as a fallback for case mismatch.
    if (category) {
      const cat = category.toLowerCase();
      articles = articles.filter(
        (a) => (a.category ?? '').toLowerCase() === cat
      );
    }

    return articles;
  } catch (err) {
    console.error('[news.ts] getPublishedNews error:', err);
    return [];
  }
}

/**
 * Fetch a single article by id.
 * Returns null if not found or if an error occurs.
 */
export async function getNewsById(id: string): Promise<NewsArticle | null> {
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
}
