/**
 * src/lib/research.ts — server-only Firestore helpers for the `research_articles` collection.
 * Uses firebase-admin (server SDK). Import only in Server Components / Route Handlers.
 *
 * The marketing-site ResearchGrid uses the client-side Firebase SDK (getDocs) directly.
 * This module mirrors the news.ts admin-SDK approach so the World Education tab can
 * fetch research server-side without shipping the client bundle.
 *
 * Field names sourced from src/components/ResearchGrid.tsx.
 */

import 'server-only';
import { adminDb } from '@/lib/firebase-admin';

// ---------- Types ----------

export interface ResearchArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  status?: string;
  twitterLink?: string;
  discordLink?: string;
  telegramLink?: string;
  websiteLink?: string;
  /** Firestore Timestamp serialised to millis */
  createdAt: number;
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

// ---------- Queries ----------

/**
 * Fetch published research articles, ordered by createdAt desc.
 * Returns empty array (never throws) so pages render gracefully during build.
 *
 * Mirrors the client-side ResearchGrid filter: status !== 'draft'.
 * Note: The marketing ResearchGrid doesn't store a "published" status — it
 * simply excludes docs where status === 'draft'. We replicate that here with
 * an in-memory filter since there's no composite index requirement for this pattern.
 */
export async function getPublishedResearch(limit = 30): Promise<ResearchArticle[]> {
  const db = safeDb();
  if (!db) return [];

  try {
    const snapshot = await db
      .collection('research_articles')
      .orderBy('createdAt', 'desc')
      .limit(limit * 2) // fetch extra to account for draft filtering
      .get();

    return snapshot.docs
      .map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const createdAtRaw = data.createdAt as { toMillis?: () => number } | undefined;
        return {
          id: doc.id,
          title: (data.title as string) || 'Untitled Research',
          description: (data.description as string) || '',
          category: (data.category as string) || 'Uncategorized',
          imageUrl: (data.imageUrl as string) || 'https://kumami.world/og-default.png',
          status: data.status as string | undefined,
          twitterLink: data.twitterLink as string | undefined,
          discordLink: data.discordLink as string | undefined,
          telegramLink: data.telegramLink as string | undefined,
          websiteLink: data.websiteLink as string | undefined,
          createdAt: createdAtRaw?.toMillis ? createdAtRaw.toMillis() : 0,
        } satisfies ResearchArticle;
      })
      .filter((a) => a.status !== 'draft')
      .slice(0, limit);
  } catch (err) {
    console.error('[research.ts] getPublishedResearch error:', err);
    return [];
  }
}
