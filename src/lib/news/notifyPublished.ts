'use client';
import { v1 } from '@/lib/billing/clientApi';

/**
 * Push "new article" to the mobile app for a just-published news doc
 * (POST /api/v1/admin/news/{id}/notify — sends once; repeats are ignored).
 * Fire-and-forget: publishing never fails because a push failed.
 */
export function notifyNewsPublished(newsId: string): void {
  void v1(`/admin/news/${encodeURIComponent(newsId)}/notify`, { method: 'POST' }).catch((e) =>
    console.warn('[news] push notification not sent:', e),
  );
}
