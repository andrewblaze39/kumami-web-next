/**
 * POST /api/v1/cron/collect   header: x-cron-secret: <CRON_SECRET>
 * Cloud Scheduler → Kumami, every 60 s: the background collector
 * (lib/market/collector.ts, Rachelle v1.15 Platform). Not for browsers or apps.
 * 503 when CRON_SECRET isn't configured; 401 on a wrong / missing secret.
 */
import { fail, handler, ok } from '@/lib/api/v1';
import { secretMatches } from '@/lib/api/cronSecret';
import { runCollector } from '@/lib/market/collector';
import { recordFearGreedDay } from '@/lib/market/fearGreedDaily';
import { runPriceAlerts } from '@/lib/pro/alertRunner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handler('cron/collect', async (req: Request) => {
  const expected = process.env.CRON_SECRET ?? '';
  if (!expected) return fail('not_configured', 503, 'CRON_SECRET is not set.');
  if (!secretMatches(req.headers.get('x-cron-secret'), expected)) return fail('unauthorized', 401);
  const collector = await runCollector();
  // Once a UTC day: save Kumami's Fear & Greed score (v1.17 Plus §4). Never fails the run.
  const fearGreedDay = await recordFearGreedDay().catch((e) => `error: ${e instanceof Error ? e.message : 'unknown'}`);
  // Every run: check Pro users' price alerts (v1.18 Following & Alerts). Never fails the run.
  const alerts = await runPriceAlerts().catch((e) => ({ error: e instanceof Error ? e.message : 'unknown' }));
  return ok({ ...(collector ?? { skipped: true }), fearGreedDay, alerts });
});
