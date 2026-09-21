/**
 * /world/intel — no longer a standalone Plus tab (removed from the latest
 * mockup's Plus nav; Calendar takes its former slot). The underlying
 * Intelligence data/builder stays alive — it still feeds Fear & Greed's
 * News Tone sub-metric — this route just isn't nav-reachable anymore.
 * Redirects for anyone with an old link or bookmark.
 */

import { redirect } from 'next/navigation';

export default function IntelPage() {
  redirect('/world/console');
}
