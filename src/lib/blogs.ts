/**
 * src/lib/blogs.ts — server-only Firestore helpers for the `blogs` collection.
 * Uses firebase-admin (server SDK). Import only in Server Components / Route Handlers.
 *
 * Field names sourced from src/components/BlogArticleView.tsx / BlogsGrid.tsx.
 */

import 'server-only';
import { adminDb } from '@/lib/firebase-admin';

// ---------- Types ----------

export interface BlogPost {
  id: string;
  title?: string;
  summary?: string;
  category?: string;
  imageUrl?: string;
  thumbnailImageUrl?: string;
  status?: string;
  /** Firestore Timestamp serialised to millis (date || timestamp) */
  createdAt: number;
}

/** Full blog document — detail-page fields on top of the card fields. */
export interface BlogPostDetail extends BlogPost {
  content1?: string;
  content?: string;
  content2?: string;
  detailImageUrl?: string;
  detailImage2Url?: string;
  isPremium?: boolean;
  author?: string;
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

function toMillis(raw: unknown): number {
  const ts = raw as { toMillis?: () => number } | undefined;
  return ts?.toMillis ? ts.toMillis() : 0;
}

// ---------- Queries ----------

/**
 * Fetch a single blog post by document id. Returns null when missing,
 * on error, or when the admin SDK is unavailable.
 * Timestamp resolution mirrors BlogArticleView: date || timestamp.
 */
export async function getBlogById(id: string): Promise<BlogPostDetail | null> {
  const db = safeDb();
  if (!db) return null;

  try {
    const snap = await db.collection('blogs').doc(id).get();
    if (!snap.exists) return null;

    const data = snap.data() as Record<string, unknown>;
    return {
      id: snap.id,
      title: data.title as string | undefined,
      summary: data.summary as string | undefined,
      category: data.category as string | undefined,
      imageUrl: data.imageUrl as string | undefined,
      thumbnailImageUrl: data.thumbnailImageUrl as string | undefined,
      status: data.status as string | undefined,
      content1: data.content1 as string | undefined,
      content: data.content as string | undefined,
      content2: data.content2 as string | undefined,
      detailImageUrl: data.detailImageUrl as string | undefined,
      detailImage2Url: data.detailImage2Url as string | undefined,
      isPremium: data.isPremium as boolean | undefined,
      author: data.author as string | undefined,
      createdAt: toMillis(data.date || data.timestamp),
    };
  } catch (error) {
    console.error('[blogs] getBlogById failed:', error);
    return null;
  }
}

/**
 * Fetch latest published blog posts ordered by timestamp desc.
 * Mirrors BlogArticleView's related query: excludes status === 'draft'.
 * Returns empty array (never throws) so pages render gracefully during build.
 */
export async function getLatestBlogs(count = 6): Promise<BlogPost[]> {
  const db = safeDb();
  if (!db) return [];

  try {
    const snap = await db
      .collection('blogs')
      .orderBy('timestamp', 'desc')
      .limit(count)
      .get();

    return snap.docs
      .map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return {
          id: doc.id,
          title: data.title as string | undefined,
          summary: data.summary as string | undefined,
          category: data.category as string | undefined,
          imageUrl: data.imageUrl as string | undefined,
          thumbnailImageUrl: data.thumbnailImageUrl as string | undefined,
          status: data.status as string | undefined,
          createdAt: toMillis(data.date || data.timestamp),
        };
      })
      .filter((post) => post.status !== 'draft');
  } catch (error) {
    console.error('[blogs] getLatestBlogs failed:', error);
    return [];
  }
}
