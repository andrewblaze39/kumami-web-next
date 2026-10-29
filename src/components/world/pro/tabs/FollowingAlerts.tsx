'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Bell, BellOff, Check, Pause, Play, RotateCcw, X, Zap } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useProState } from '../ProState';
import { useLivePrices, isSupportedSymbol } from '@/lib/pro/useLivePrices';
import { useAlerts, useAlertNotifications } from '@/lib/pro/useAlerts';
import { ALERT_KINDS, alertLabel, fmtUsd, MAX_ALERTS, type AlertDef, type AlertFrequency } from '@/lib/pro/priceAlerts';
import { ProShellHead } from './shared';

/**
 * Follow keys are "<kind>:<id>" (e.g. "airdrop:<firestore id>"). Show the item's
 * name, never the raw id; an airdrop that was deleted or unpublished says so.
 */
function labelForKey(key: string, airdropNames: Record<string, string> | null) {
  const [kind, rest] = key.split(':');
  if (kind === 'airdrop' && rest) {
    if (!airdropNames) return 'Airdrop';
    return airdropNames[rest] ? `${airdropNames[rest]} · Airdrop` : 'An airdrop that is no longer listed';
  }
  return rest ? `${rest} (${kind})` : key;
}

/** Names of the published airdrops/whitelists, by id (null while loading). */
function useAirdropNames() {
  const [names, setNames] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    const q = query(collection(db, 'pro_airdrops'), where('status', '==', 'published'));
    return onSnapshot(
      q,
      (snap) => setNames(Object.fromEntries(snap.docs.map((d) => [d.id, String(d.get('name') ?? '')]))),
      () => setNames({}),
    );
  }, []);
  return names;
}

function ago(ts: number): string {
  const m = Math.round((Date.now() - ts) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type Perm = 'default' | 'granted' | 'denied' | 'unsupported';
function useNotificationPermission(): [Perm, () => void] {
  const [perm, setPerm] = useState<Perm>('default');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads a browser API after mount
    setPerm(typeof Notification === 'undefined' ? 'unsupported' : (Notification.permission as Perm));
  }, []);
  const ask = () => {
    if (typeof Notification === 'undefined') return;
    void Notification.requestPermission().then((p) => setPerm(p as Perm));
  };
  return [perm, ask];
}

/**
 * Following & Alerts (v1.18, CoinMarketCap-style): build an alert for a coin — price rises above
 * / drops below $X, up / down X% in 24h, or 24h volume up X% — and pick Once or Every time.
 * Kumami checks every alert on the server every minute, so it fires even when this page is
 * closed; a trigger shows on any Kumami page and, if allowed, as a browser notification.
 */
export function FollowingAlerts() {
  const { ready: followReady, following, toggleFollow } = useProState();
  const { ready, alerts, state, skippedLegacy, error, saving, save } = useAlerts();
  const triggers = useAlertNotifications();
  const [perm, askPerm] = useNotificationPermission();

  const [symbol, setSymbol] = useState('BTC');
  const [kind, setKind] = useState<AlertDef['kind']>('price_above');
  const [value, setValue] = useState('');
  const [frequency, setFrequency] = useState<AlertFrequency>('once');
  const [formError, setFormError] = useState<string | null>(null);

  const symbols = useMemo(() => [...new Set([symbol.trim().toUpperCase(), ...alerts.map((a) => a.symbol)])].filter(Boolean), [alerts, symbol]);
  const prices = useLivePrices(symbols);
  const unit = ALERT_KINDS.find((k) => k.kind === kind)?.unit ?? '%';

  const create = () => {
    const sym = symbol.trim().toUpperCase();
    const v = Number(value);
    if (!/^[A-Z0-9]{2,12}$/.test(sym)) return setFormError('Enter a coin symbol, e.g. BTC.');
    if (!(v > 0)) return setFormError(unit === '$' ? 'Enter a target price above $0.' : 'Enter a percentage above 0.');
    if (alerts.length >= MAX_ALERTS) return setFormError(`You can have up to ${MAX_ALERTS} alerts.`);
    setFormError(null);
    void save([...alerts, { id: Date.now(), symbol: sym, kind, value: v, frequency, on: true }]);
    setValue('');
  };
  const update = (id: number, patch: Partial<AlertDef>, rearm = false) =>
    void save(alerts.map((a) => (a.id === id ? { ...a, ...patch } : a)), rearm ? [id] : []);
  const remove = (id: number) => void save(alerts.filter((a) => a.id !== id));

  const followedKeys = Object.keys(following).filter((k) => following[k]);
  const airdropNames = useAirdropNames();
  const livePrice = symbol && isSupportedSymbol(symbol) ? prices[symbol.trim().toUpperCase()] : undefined;

  return (
    <>
      <ProShellHead eyebrow="Cross-cutting" icon={<Bookmark size={24} />} title="Following & Alerts">
        Price alerts like CoinMarketCap&apos;s: pick a coin and a condition, Once or Every time. Kumami checks them
        every minute, even when this page is closed, and shows the alert on any Kumami page.
      </ProShellHead>

      {/* Alert builder */}
      <div className="apanel" data-tour="fa-builder" style={{ padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Create an alert</div>
        <div className="fa-builder">
          <label>
            <span>Coin</span>
            <input className="rtn-drop" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} aria-label="Coin" maxLength={12} />
          </label>
          <label>
            <span>Alert when</span>
            <select className="rtn-drop" value={kind} onChange={(e) => setKind(e.target.value as AlertDef['kind'])} aria-label="Alert type">
              {ALERT_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
            </select>
          </label>
          <label>
            <span>{unit === '$' ? 'Target price (USD)' : 'Percent'}</span>
            <input
              className="rtn-drop"
              inputMode="decimal"
              value={value}
              placeholder={unit === '$' ? (livePrice ? String(Number(livePrice.toPrecision(4))) : 'e.g. 100000') : 'e.g. 5'}
              onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
              aria-label={unit === '$' ? 'Target price' : 'Percent'}
            />
          </label>
          <label>
            <span>Frequency</span>
            <select className="rtn-drop" value={frequency} onChange={(e) => setFrequency(e.target.value as AlertFrequency)} aria-label="Frequency">
              <option value="once">Once</option>
              <option value="every">Every time</option>
            </select>
          </label>
          <button className="btn btn-pro btn-sm" onClick={create} disabled={!ready || saving}>Create alert</button>
        </div>
        <div className="fa-hint">
          {livePrice ? <>Now: <b>{fmtUsd(livePrice)}</b> · </> : null}
          {unit === '$' ? 'Fires when the price crosses your target.' : kind === 'volume_up' ? 'Compared with the 24h volume when the alert is created.' : 'Uses the 24h price change.'}
          {' '}Once = fires one time, then pauses · Every time = fires again after the condition clears.
        </div>
        {formError && <div className="fa-error" role="alert">{formError}</div>}
        {error && <div className="fa-error" role="alert">{error}</div>}
      </div>

      {/* Alerts */}
      <div className="fa-section-head">
        <span>Your alerts {ready ? `(${alerts.length})` : ''}</span>
        {perm === 'granted' ? (
          <span className="fa-perm on"><Bell size={13} /> Browser notifications on</span>
        ) : perm === 'denied' ? (
          <span className="fa-perm"><BellOff size={13} /> Browser notifications blocked in this browser’s settings</span>
        ) : perm === 'unsupported' ? null : (
          <button className="followbtn" onClick={askPerm}><Bell size={13} /> Turn on browser notifications</button>
        )}
      </div>
      <div className="apanel" style={{ padding: '6px 20px', marginBottom: 22 }}>
        {!ready ? (
          <div className="oc-empty">{error ? 'Couldn’t load your alerts.' : 'Loading your alerts…'}</div>
        ) : alerts.length === 0 ? (
          <div className="oc-empty">No alerts yet. Create one above.</div>
        ) : (
          alerts.map((a) => {
            const s = state[String(a.id)];
            const cur = isSupportedSymbol(a.symbol) ? prices[a.symbol] : undefined;
            const status = !a.on ? (s?.lastTriggeredAt && a.frequency === 'once' ? 'triggered' : 'paused') : s ? (s.armed ? 'armed' : 'waiting') : 'new';
            return (
              <div className="chart-side-row fa-row" key={a.id}>
                <span className="l">
                  <b>{alertLabel(a)}</b>
                  <span className="fa-sub">
                    {a.frequency === 'once' ? 'Once' : 'Every time'}
                    {s?.lastTriggeredAt ? ` · last fired ${ago(s.lastTriggeredAt)}${s.count && s.count > 1 ? ` (${s.count}×)` : ''}` : ''}
                    {cur ? ` · now ${fmtUsd(cur)}` : ''}
                  </span>
                </span>
                <span className="v fa-actions">
                  {status === 'triggered' && <span className="oc-tag red"><Zap size={11} /> Triggered</span>}
                  {status === 'paused' && <span className="oc-tag">Paused</span>}
                  {status === 'armed' && <span className="oc-tag green">Watching</span>}
                  {status === 'waiting' && <span className="oc-tag" title="The condition is true right now; the alert fires the next time it is met again">Waiting to re-arm</span>}
                  {status === 'new' && <span className="oc-tag">Starts within a minute</span>}
                  {a.on ? (
                    <button className="followbtn" onClick={() => update(a.id, { on: false })} aria-label="Pause alert" title="Pause"><Pause size={13} /></button>
                  ) : (
                    <button className="followbtn" onClick={() => update(a.id, { on: true }, true)} aria-label={status === 'triggered' ? 'Re-arm alert' : 'Resume alert'} title={status === 'triggered' ? 'Re-arm' : 'Resume'}>
                      {status === 'triggered' ? <RotateCcw size={13} /> : <Play size={13} />}
                    </button>
                  )}
                  <button className="followbtn" onClick={() => remove(a.id)} aria-label="Delete alert" title="Delete"><X size={13} /></button>
                </span>
              </div>
            );
          })
        )}
        {skippedLegacy > 0 && (
          <div className="oc-empty">{skippedLegacy} older news-sentiment alert{skippedLegacy === 1 ? ' was' : 's were'} not carried over — sentiment alerts aren’t available.</div>
        )}
      </div>

      {/* Recent triggers */}
      <div className="fa-section-head"><span>Recent alerts</span></div>
      <div className="apanel" style={{ padding: '6px 20px', marginBottom: 22 }}>
        {triggers.length === 0 ? (
          <div className="oc-empty">Nothing has fired yet. Triggered alerts appear here and on any Kumami page.</div>
        ) : triggers.slice(0, 10).map((n) => (
          <div className="chart-side-row" key={n.id}>
            <span className="l"><Zap size={13} /> {n.message}</span>
            <span className="v fa-sub">{ago(n.createdAt)}</span>
          </div>
        ))}
      </div>

      {/* Following */}
      <div className="fa-section-head"><span>Following</span></div>
      <div className="apanel" style={{ padding: '6px 20px' }}>
        {!followReady ? (
          <div className="oc-empty">Loading…</div>
        ) : followedKeys.length ? (
          followedKeys.map((k) => (
            <div className="chart-side-row" key={k}>
              <span className="l" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Bookmark size={14} /> {labelForKey(k, airdropNames)}
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
