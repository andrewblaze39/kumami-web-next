/**
 * POST /api/v1/cron/collect   header: x-cron-secret: <CRON_SECRET>
 * Cloud Scheduler → Kumami, every 60 s: the background collector
 * (lib/market/collector.ts, Rachelle v1.15 Platform). Not for browsers or apps.
 * 503 when CRON_SECRET isn't configured; 401 on a wrong / missing secret.
 */
import { fail, handler, ok } from '@/lib/api/v1';
import { secretMatches } from '@/lib/api/cronSecret';
import { runCollector } from '@/lib/market/collector';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handler('cron/collect', async (req: Request) => {
  const expected = process.env.CRON_SECRET ?? '';
  if (!expected) return fail('not_configured', 503, 'CRON_SECRET is not set.');
  if (!secretMatches(req.headers.get('x-cron-secret'), expected)) return fail('unauthorized', 401);
  return ok(await runCollector());
});
