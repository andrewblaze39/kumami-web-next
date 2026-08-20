/**
 * Live Intelligence payload.
 *
 * Merges three CoinGlass feeds into ranked briefs, each tiered A/B/C by the
 * intelTier rule engine:
 *   news        ← /api/article/list
 *   macro events← /api/calendar/economic-data (importance-filtered)
 *   unlocks     ← /api/coin/unlock-list
 *
 * The AI "pro interpretation" text is a separate TODO (no Anthropic key yet),
 * so hasProInterpretation is false on every brief for now — verdicts/tiers are
 * fully live regardless.
 */

import type { IntelligencePayload } from '../contracts';
import { computeIntelTier, type IntelImpact, type IntelTiming } from '../rules/intelTier';
import { articleList, economicCalendar, coinUnlocks } from './cg-endpoints';
import { tsToIso } from './helpers';

const ASSET_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'AVAX', 'LINK', 'ADA', 'SUI', 'ARB', 'ARB', 'MATIC', 'AVAX'];

/** Never surface the upstream data aggregator as a source in the UI. */
function cleanSource(s: string): string {
  return /coin\s*glass/i.test(s) ? 'Market Wire' : (s || 'Market Wire');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function detectAssets(text: string): string[] {
  const upper = text.toUpperCase();
  const found = new Set<string>();
  for (const s of ASSET_SYMBOLS) {
    if (new RegExp(`\\b${s}\\b`).test(upper)) found.add(s);
  }
  return [...found].slice(0, 4);
}

const HIGH_KW = ['sec', 'regulat', 'etf', 'hack', 'exploit', 'fed', 'cpi', 'rate cut', 'rate hike', 'lawsuit', 'ban'];
const MED_KW = ['upgrade', 'partnership', 'listing', 'delisting', 'unlock', 'mainnet', 'launch', 'integration'];

function articleImpact(title: string, body: string): IntelImpact {
  const t = (title + ' ' + body).toLowerCase();
  if (HIGH_KW.some((k) => t.includes(k))) return 'high';
  if (MED_KW.some((k) => t.includes(k))) return 'medium';
  return 'low';
}

const CATEGORY_KW: [string, string[]][] = [
  ['Macro', ['fed', 'cpi', 'rate', 'inflation', 'gdp', 'jobs', 'fomc', 'economy']],
  ['Regulatory', ['sec', 'regulat', 'lawsuit', 'ban', 'compliance', 'court']],
  ['ETF Flows', ['etf', 'blackrock', 'ibit', 'inflow', 'outflow', 'fund']],
  ['On-Chain', ['tvl', 'defi', 'staking', 'whale', 'on-chain', 'onchain']],
  ['Trade', ['listing', 'unlock', 'perpetual', 'futures', 'exchange']],
];

function categoryFor(title: string, body: string): string {
  const t = (title + ' ' + body).toLowerCase();
  for (const [cat, kws] of CATEGORY_KW) if (kws.some((k) => t.includes(k))) return cat;
  return 'Narrative';
}

export async function makeIntelligencePayloadLive(tier: 'free' | 'pro'): Promise<IntelligencePayload> {
  const [articles, calendar, unlocks] = await Promise.all([
    articleList().catch(() => []),
    economicCalendar().catch(() => []),
    coinUnlocks().catch(() => []),
  ]);

  const briefs: IntelligencePayload['briefs'] = [];
  const now = Date.now();

  // --- news articles ------------------------------------------------------
  for (const a of articles.slice(0, 10)) {
    const body = stripHtml(a.article_description || a.article_content || '');
    const ageMs = now - Number(a.article_release_time);
    const timing: IntelTiming = ageMs < 6 * 3600_000 ? 'now' : ageMs < 72 * 3600_000 ? 'scheduled' : 'evergreen';
    const impact = articleImpact(a.article_title, body);
    const t = computeIntelTier({ impact, timing });
    briefs.push({
      id: `news-${Number(a.article_release_time)}-${briefs.length}`,
      tier: t.tier,
      headline: a.article_title,
      category: categoryFor(a.article_title, body),
      source: cleanSource(a.source_name),
      summary: body.slice(0, 260),
      hasProInterpretation: false,
      assets: detectAssets(a.article_title + ' ' + body),
      ts: tsToIso(Number(a.article_release_time)),
    });
  }

  // --- macro calendar (importance-filtered, near-term) -------------------
  const macro = calendar
    .filter((c) => c.importance_level >= 2)
    .sort((a, b) => Math.abs(a.publish_timestamp - now) - Math.abs(b.publish_timestamp - now))
    .slice(0, 4);
  for (const c of macro) {
    const future = c.publish_timestamp > now;
    const timing: IntelTiming = Math.abs(c.publish_timestamp - now) < 6 * 3600_000 ? 'now' : future ? 'scheduled' : 'evergreen';
    const impact: IntelImpact = c.importance_level >= 3 ? 'high' : 'medium';
    const t = computeIntelTier({ impact, timing });
    const fc = c.forecast_value ? ` · forecast ${c.forecast_value}` : '';
    const prev = c.previous_value ? ` · prev ${c.previous_value}` : '';
    briefs.push({
      id: `macro-${c.publish_timestamp}-${briefs.length}`,
      tier: t.tier,
      headline: `${c.calendar_name} (${c.country_code})`,
      category: 'Macro',
      source: c.country_name || 'Economic Calendar',
      summary: `${c.data_effect || 'Scheduled economic release.'}${fc}${prev}`.trim(),
      hasProInterpretation: false,
      assets: ['BTC', 'SPX'],
      ts: tsToIso(c.publish_timestamp),
    });
  }

  // --- token unlocks (recognizable projects with meaningful locked supply) --
  const fmtUsd = (v: number) => (v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : `$${(v / 1e6).toFixed(0)}M`);
  const bigUnlocks = [...unlocks]
    .filter((u) => u.total_locked > 0 && u.price > 0 && u.market_cap > 50_000_000)
    .sort((a, b) => b.market_cap - a.market_cap) // bias toward established projects
    .slice(0, 3);
  for (const u of bigUnlocks) {
    const lockedUsd = u.total_locked * u.price;
    const pctSupply = u.total_supply > 0 ? u.total_locked / u.total_supply : 0;
    const impact: IntelImpact = pctSupply > 0.05 ? 'high' : 'medium';
    const t = computeIntelTier({ impact, timing: 'scheduled' });
    briefs.push({
      id: `unlock-${u.symbol}-${briefs.length}`,
      tier: t.tier,
      headline: `${u.name} (${u.symbol}) — ${(pctSupply * 100).toFixed(0)}% of supply still locked`,
      category: 'Trade',
      source: 'Token Unlocks',
      summary: `${fmtUsd(lockedUsd)} of ${u.symbol} locked · market cap ${fmtUsd(u.market_cap)}. Scheduled vesting adds sell-side supply on unlock.`,
      hasProInterpretation: false,
      assets: [u.symbol],
      ts: new Date().toISOString(),
    });
  }

  // Rank: A→B→C, then most recent first.
  const tierRank = { A: 0, B: 1, C: 2 } as const;
  briefs.sort((a, b) => tierRank[a.tier] - tierRank[b.tier] || Date.parse(b.ts) - Date.parse(a.ts));

  // tier is unused for gating here (AI text is TODO), but keep signature parity.
  void tier;
  return { briefs };
}
