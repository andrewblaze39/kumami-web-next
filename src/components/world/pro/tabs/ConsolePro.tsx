'use client';

/**
 * Console Pro — the Pro landing tab (Rachelle's v1.18 sidebar; replaces the Daily Digest).
 * The complete version of the Basic Console: same Market Conditions, then
 *   - "Your assets": up to 5 regime chips the user picks (anchors + their Watchlist coins),
 *   - Market Pulse Pro (10 coins), Flow Radar Pro events in real time with a coin filter,
 *   - Calendar Pro (airdrop days, unlocks, Pro-only events) and Watchlist Pro (your coins),
 *   - a top strip with the newest Real-Time News headline and Alpha Room post (last 7 days),
 *     and a "New · Kumami Research" card while a call is under 48 hours old.
 * Basic's Console keeps the cut-down version (5 fixed coins, Flow Radar 15 minutes behind).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, onSnapshot, orderBy, query, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ApiError, v1 } from '@/lib/billing/clientApi';
import { useMarketData } from '@/components/world/panels/useMarketData';
import { useMarketEndpoint } from '@/components/world/panels/useMarketEndpoint';
import { relativeTime } from '@/components/world/panels/format';
import { WIcon } from '@/components/world/panels/console-ui';
import MarketConditions from '@/components/world/panels/MarketConditions';
import RegimeChips from '@/components/world/panels/RegimeChips';
import SpotPulsePreview from '@/components/world/panels/SpotPulsePreview';
import FlowRadarFeed from '@/components/world/panels/FlowRadarFeed';
import CalendarPreview from '@/components/world/panels/CalendarPreview';
import WatchlistPreview from '@/components/world/panels/WatchlistPreview';
import type { ConsolePayload, FlowRadarPayload } from '@/lib/market/contracts';
import { MAX_CONSOLE_ASSETS } from '@/lib/market/rules/consoleAssets';

type Chip = ConsolePayload['regimeChips'][number];
interface AssetsDto { assets: string[]; pool: string[]; chips: Chip[] }
interface StripItem { id: string; kind: 'news' | 'alpha' | 'research'; text: string; at?: number; href: string }

const RESEARCH_NEW_MS = 48 * 3_600_000;
/** News and alpha older than this are not "latest" any more — the strip leaves them out. */
const STRIP_MAX_AGE_MS = 7 * 24 * 3_600_000;
const DAY_MS = 24 * 3_600_000;

/** "Your assets" — saved per user on the server (/api/v1/me/console-assets). */
function useYourAssets() {
  const [dto, setDto] = useState<AssetsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    v1<AssetsDto>('/me/console-assets')
      .then((d) => { if (live) setDto(d); })
      .catch((e) => { if (live) setError(e instanceof ApiError ? e.message : 'Couldn’t load your assets.'); });
    return () => { live = false; };
  }, []);

  const save = useCallback(async (assets: string[]) => {
    setSaving(true);
    try {
      setDto(await v1<AssetsDto>('/me/console-assets', { method: 'PUT', body: { assets } }));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t save your assets.');
    } finally {
      setSaving(false);
    }
  }, []);

  return { dto, error, saving, save };
}

/** Newest Real-Time News headline, newest Alpha Room post, and a research call under 48h old. */
function useTopStrip(): StripItem[] {
  const [news, setNews] = useState<StripItem | null>(null);
  const [alpha, setAlpha] = useState<StripItem | null>(null);
  const [research, setResearch] = useState<StripItem | null>(null);
  const [openedAt] = useState(() => Date.now());

  useEffect(() => {
    const secs = (d: { get(f: string): unknown }) => (d.get('createdAt') as { seconds?: number } | null)?.seconds ?? 0;
    const newest = (coll: string, set: (s: StripItem | null) => void, map: (id: string, d: Record<string, unknown>, at: number) => StripItem | null) =>
      // Single-field query (no composite index); newest picked on the client.
      onSnapshot(query(collection(db, coll), where('status', '==', 'published')), (snap) => {
        const top = [...snap.docs].sort((a, b) => secs(b) - secs(a))[0];
        set(top ? map(top.id, top.data(), secs(top) * 1000) : null);
      }, () => set(null));
    const unNews = newest('pro_news', setNews, (id, d, at) => ({ id, kind: 'news', text: String(d.title ?? ''), at, href: '/world/pro?tab=realtimenews' }));
    const unResearch = newest('pro_research', setResearch, (id, d, at) =>
      at > 0 && openedAt - at < RESEARCH_NEW_MS
        ? { id, kind: 'research', text: `${d.name as string} — ${d.pos as string} ${d.asset as string}`, at, href: '/world/pro?tab=research' }
        : null);
    const unAlpha = onSnapshot(query(collection(db, 'alphaRoom'), orderBy('timestamp', 'desc'), limit(5)), (snap) => {
      const m = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as { message?: string; isSystem?: boolean; isImage?: boolean; timestamp?: { seconds?: number } }) }))
        .find((x) => !x.isSystem && !x.isImage && x.message);
      setAlpha(m ? { id: m.id, kind: 'alpha', text: m.message as string, at: (m.timestamp?.seconds ?? 0) * 1000, href: '/world/pro?tab=alpha' } : null);
    }, () => setAlpha(null));
    return () => { unNews(); unResearch(); unAlpha(); };
  }, [openedAt]);

  return [research, news, alpha].filter(
    (x): x is StripItem => !!x && !!x.text && !!x.at && openedAt - x.at < STRIP_MAX_AGE_MS,
  );
}

const STRIP_LABEL: Record<StripItem['kind'], string> = { news: 'News', alpha: 'Alpha', research: 'New · Kumami Research' };

export function ConsolePro() {
  const market = useMarketData();
  const data = market.data;
  const isLoading = market.status === 'loading';
  const { dto, error: assetsError, saving, save } = useYourAssets();
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const strip = useTopStrip();

  // Flow Radar Pro — real-time, every coin; the Console shows the last 24h with a coin filter.
  const flow = useMarketEndpoint<FlowRadarPayload>('/api/market/flow-radar?view=pro');
  const [coin, setCoin] = useState('All');
  const [openedAt] = useState(() => Date.now());
  const events24h = useMemo(
    () => (flow.data?.events ?? []).filter((e) => openedAt - Date.parse(e.ts) <= DAY_MS),
    [flow.data, openedAt],
  );
  const coins = useMemo(() => ['All', ...new Set(events24h.map((e) => e.asset))].slice(0, 9), [events24h]);
  const flowEvents = useMemo(
    () => events24h.filter((e) => coin === 'All' || e.asset === coin)
      .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts)).slice(0, 8),
    [events24h, coin],
  );

  const startPicking = () => { setDraft(dto?.assets ?? []); setPicking(true); };
  const toggle = (s: string) =>
    setDraft((d) => (d.includes(s) ? d.filter((x) => x !== s) : d.length >= MAX_CONSOLE_ASSETS ? d : [...d, s]));
  const done = async () => { if (draft.length > 0) await save(draft); setPicking(false); };

  const updatedAt = data?.marketConditions.updatedAt;

  return (
    <div className="w-console w-console-pro" data-tour="pro-page-head">
      <div className="w-adv-head">
        <div>
          <h1>
            Console Pro{' '}
            <span className="w-pro-badge"><WIcon name="star" /> Pro</span>
          </h1>
          <p>Your full market briefing — regime, your assets, real money flows, the week ahead and what you&apos;re watching.</p>
        </div>
        <span className="w-adv-updated">
          <span className="w-live-dot" /> Real-time
          {updatedAt ? ` · updated ${relativeTime(updatedAt)}` : ''}
        </span>
      </div>

      {strip.length > 0 && (
        <div className="w-cpro-strip" aria-label="Latest for you" data-tour="cpro-strip">
          {strip.map((s) => (
            <Link key={`${s.kind}-${s.id}`} href={s.href} className={`w-cpro-strip-item w-cpro-${s.kind}`}>
              <b>{STRIP_LABEL[s.kind]}</b>
              <span className="w-cpro-strip-text" title={s.text}>{s.text}</span>
              {s.at ? <span className="w-cpro-strip-when">{relativeTime(new Date(s.at).toISOString())}</span> : null}
            </Link>
          ))}
        </div>
      )}

      {market.status === 'error' && !data ? (
        <div className="w-console-error" role="alert">
          <p className="w-console-error-msg">Unable to load market data. {market.error}</p>
          <button className="w-btn w-btn-ghost w-btn-sm" onClick={market.refetch}>Retry</button>
        </div>
      ) : isLoading ? (
        <div className="w-apanel w-span-2 w-mc-panel w-panel-skeleton w-panel-skeleton-mc" aria-busy="true" />
      ) : data ? (
        <MarketConditions data={data.marketConditions} />
      ) : null}

      {/* Your assets — up to 5 coins, each with the same regime read as the Console chips. */}
      <div className="w-cpro-assets-head" data-tour="cpro-assets">
        <span className="w-cpro-assets-title">Your assets</span>
        {dto && (picking ? (
          <button type="button" className="w-btn w-btn-ghost w-btn-sm" onClick={done} disabled={saving || draft.length === 0}>
            {saving ? 'Saving…' : `Done · ${draft.length}/${MAX_CONSOLE_ASSETS}`}
          </button>
        ) : (
          <button type="button" className="w-btn w-btn-ghost w-btn-sm" onClick={startPicking}>
            <WIcon name="spark" /> Customize
          </button>
        ))}
      </div>
      {picking && dto && (
        <div className="w-cpro-picker" role="group" aria-label="Pick up to 5 coins">
          <span className="w-cpro-picker-note">Pick up to {MAX_CONSOLE_ASSETS} — the 5 anchors and the coins in your Watchlist.</span>
          {dto.pool.map((s) => (
            <button
              key={s}
              type="button"
              className={`w-flow-radar-chip${draft.includes(s) ? ' on' : ''}`}
              onClick={() => toggle(s)}
              aria-pressed={draft.includes(s)}
              disabled={!draft.includes(s) && draft.length >= MAX_CONSOLE_ASSETS}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      {assetsError && !dto ? (
        <p className="w-panel-empty" role="status">{assetsError}</p>
      ) : (
        <RegimeChips chips={dto?.chips ?? []} loading={!dto} />
      )}
      {assetsError && dto && <p className="w-panel-empty" role="status">{assetsError}</p>}

      <div className="w-bento w-r2">
        <SpotPulsePreview variant="pro" />
        <FlowRadarFeed
          events={flowEvents}
          loading={flow.status === 'loading'}
          realtime
          toolbar={coins.length > 2 ? (
            <div className="w-flow-radar-chip-row w-cpro-coins" aria-label="Filter by coin">
              {coins.map((c) => (
                <button key={c} type="button" className={`w-flow-radar-chip${coin === c ? ' on' : ''}`} onClick={() => setCoin(c)}>
                  {c}
                </button>
              ))}
            </div>
          ) : null}
        />
      </div>

      <div className="w-bento w-r3">
        <CalendarPreview view="pro" />
        <WatchlistPreview variant="pro" />
      </div>
    </div>
  );
}
