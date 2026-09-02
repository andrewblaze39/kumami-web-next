'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Shield, Check, X, Zap, RotateCcw } from 'lucide-react';
import { useProState } from '../ProState';
import { useLivePrices, isSupportedSymbol } from '@/lib/pro/useLivePrices';
import { ProShellHead } from './shared';

const TRIGGERS = {
  price: 'price changes by',
  volume: 'volume spikes by',
  sentiment: 'news sentiment flips',
} as const;

function labelForKey(key: string) {
  const [kind, rest] = key.split(':');
  return rest ? `${rest} (${kind})` : key;
}

function fmtPrice(p: number) {
  return '$' + (p >= 1 ? p.toLocaleString(undefined, { maximumFractionDigits: 2 }) : p.toPrecision(4));
}

/** Derive monitoring fields, falling back to parsing the label for legacy alerts
 *  saved before structured fields existed (e.g. "BTC price changes by 5%"). */
function effective(a: { subject?: string; trigger?: string; threshold?: number; label: string }) {
  if (a.trigger) return { subject: a.subject, trigger: a.trigger, threshold: a.threshold ?? 0 };
  const subj = a.label.match(/^(\S+)/);
  const th = a.label.match(/([\d.]+)\s*%/);
  const trig = /volume/i.test(a.label) ? 'volume' : /sentiment/i.test(a.label) ? 'sentiment' : 'price';
  return { subject: subj ? subj[1].toUpperCase() : undefined, trigger: trig, threshold: th ? parseFloat(th[1]) : 0 };
}

/**
 * Following & Alerts — the user's follows + custom alerts. Price alerts are
 * monitored live against the Binance spot feed: each alert "arms" at the first
 * price it sees, then fires (TRIGGERED) when the live price moves past the
 * threshold. All state persists per-user via ProState.
 */
export function FollowingAlerts() {
  const {
    ready, following, alerts, toggleFollow, addAlert, toggleAlert, deleteAlert,
  } = useProState();

  const [subject, setSubject] = useState('BTC');
  const [trigger, setTrigger] = useState<keyof typeof TRIGGERS>('price');
  const [threshold, setThreshold] = useState('5');

  // Live prices for the symbols referenced by active price alerts.
  const monitored = useMemo(
    () => alerts
      .filter((a) => a.on)
      .map((a) => effective(a))
      .filter((e) => e.trigger === 'price' && e.subject)
      .map((e) => e.subject as string),
    [alerts],
  );
  const prices = useLivePrices(monitored);

  // Baseline price each alert armed at (per alert id).
  const [baselines, setBaselines] = useState<Record<number, number>>({});
  useEffect(() => {
    // Sync derived arming baselines from the live-price feed (external system).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBaselines((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const a of alerts) {
        const e = effective(a);
        if (e.trigger === 'price' && e.subject && prices[e.subject] != null && next[a.id] == null) {
          next[a.id] = prices[e.subject];
          changed = true;
        }
      }
      // drop baselines for deleted alerts
      for (const id of Object.keys(next)) {
        if (!alerts.some((a) => String(a.id) === id)) { delete next[Number(id)]; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [prices, alerts]);

  const followedKeys = Object.keys(following).filter((k) => following[k]);

  const buildAlert = () => {
    const th = parseFloat(threshold) || 0;
    const suffix = trigger === 'sentiment' ? '' : ` ${threshold}%`;
    addAlert({
      subject: subject.trim().toUpperCase(),
      trigger,
      threshold: th,
      label: `${subject.trim().toUpperCase()} ${TRIGGERS[trigger]}${suffix}`,
    });
  };

  const rearm = (id: number, sym?: string) => {
    if (!sym || prices[sym] == null) return;
    setBaselines((prev) => ({ ...prev, [id]: prices[sym] }));
  };

  function AlertRow({ a }: { a: (typeof alerts)[number] }) {
    const e = effective(a);
    const isPrice = e.trigger === 'price' && !!e.subject;
    const supported = isPrice && isSupportedSymbol(e.subject!);
    const cur = supported ? prices[e.subject!] : undefined;
    const base = baselines[a.id];
    const change = supported && cur != null && base != null && base !== 0 ? ((cur - base) / base) * 100 : null;
    const triggered = a.on && change != null && Math.abs(change) >= (e.threshold ?? 0);

    return (
      <div className="chart-side-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <span className="l" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 200 }}>
          <Shield size={14} /> {a.label}
          {triggered && (
            <span className="oc-tag red" style={{ marginLeft: 4 }}>
              <Zap size={11} /> Triggered
            </span>
          )}
        </span>

        <span className="v" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          {supported && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              {cur != null ? (
                <>
                  <b style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtPrice(cur)}</b>
                  {change != null && (
                    <span className={change >= 0 ? 'up' : 'down'} style={{ fontWeight: 800 }}>
                      {change >= 0 ? '+' : ''}{change.toFixed(change !== 0 && Math.abs(change) < 0.01 ? 6 : 2)}%
                    </span>
                  )}
                  <button className="followbtn" style={{ padding: '3px 7px' }} title="Re-arm (reset baseline to current price)" onClick={() => rearm(a.id, e.subject)}>
                    <RotateCcw size={12} />
                  </button>
                </>
              ) : (
                <span style={{ color: 'var(--muted-2)' }}>connecting…</span>
              )}
            </span>
          )}
          {isPrice && !supported && <span style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>no live feed for {e.subject}</span>}
          {!isPrice && <span style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>live monitoring soon</span>}

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--muted)' }}>
            <input type="checkbox" checked={a.on} onChange={() => toggleAlert(a.id)} />
            {a.on ? 'On' : 'Muted'}
          </label>
          <button className="followbtn" style={{ padding: '4px 8px' }} onClick={() => deleteAlert(a.id)} aria-label="Delete alert">
            <X size={13} />
          </button>
        </span>
      </div>
    );
  }

  return (
    <>
      <ProShellHead eyebrow="Cross-cutting" icon={<Bookmark size={24} />} title="Following & Alerts">
        Everything you follow in one place, plus live alerts — a price alert arms at the current price
        and fires the moment it moves past your threshold.
      </ProShellHead>

      {/* Alert builder */}
      <div className="apanel" style={{ padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Build an alert</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>Alert me when</span>
          <input className="rtn-drop" style={{ width: 90 }} value={subject} onChange={(e) => setSubject(e.target.value.toUpperCase())} aria-label="subject" />
          <select className="rtn-drop" value={trigger} onChange={(e) => setTrigger(e.target.value as keyof typeof TRIGGERS)}>
            {Object.entries(TRIGGERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {trigger !== 'sentiment' && (
            <input className="rtn-drop" style={{ width: 90 }} value={threshold} onChange={(e) => setThreshold(e.target.value.replace(/[^0-9.]/g, ''))} aria-label="threshold" />
          )}
          {trigger !== 'sentiment' && <span style={{ color: 'var(--muted)', fontSize: 13 }}>%</span>}
          <button className="btn btn-pro btn-sm" onClick={buildAlert} disabled={!ready}>Add alert</button>
        </div>
        {trigger === 'price' && (
          <div style={{ fontSize: 11.5, color: 'var(--muted-2)', marginTop: 10 }}>
            Live-monitored via Binance for: {Array.from(['BTC', 'ETH', 'SOL', 'BNB', 'XRP', '…']).join(', ')} and more major tickers.
          </div>
        )}
      </div>

      {/* Alerts */}
      <div style={{ fontSize: 13, fontWeight: 800, margin: '0 0 10px' }}>Your alerts</div>
      <div className="apanel" style={{ padding: '6px 20px', marginBottom: 22 }}>
        {!ready ? (
          <div className="oc-empty">Loading your alerts…</div>
        ) : alerts.length ? (
          alerts.map((a) => <AlertRow key={a.id} a={a} />)
        ) : (
          <div className="oc-empty">No alerts yet — build one above.</div>
        )}
      </div>

      {/* Following */}
      <div style={{ fontSize: 13, fontWeight: 800, margin: '0 0 10px' }}>Following</div>
      <div className="apanel" style={{ padding: '6px 20px' }}>
        {!ready ? (
          <div className="oc-empty">Loading…</div>
        ) : followedKeys.length ? (
          followedKeys.map((k) => (
            <div className="chart-side-row" key={k}>
              <span className="l" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Bookmark size={14} /> {labelForKey(k)}
              </span>
              <span className="v">
                <button className="followbtn on" onClick={() => toggleFollow(k)}>
                  <Check size={13} /> Following
                </button>
              </span>
            </div>
          ))
        ) : (
          <div className="oc-empty">Nothing followed yet — use Follow on any wallet, alpha item or airdrop.</div>
        )}
      </div>
    </>
  );
}
