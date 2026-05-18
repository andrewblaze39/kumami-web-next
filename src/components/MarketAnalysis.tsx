// Variant C — "Hero Feature" layout
//
// Behaviour preserved from original:
//   • Firestore subscription to `marketAnalysis` (orderBy createdAt desc, limit 5)
//   • Loading + empty states
//   • Prev/Next navigation
//   • Uses lucide-react icons
//
// OPTIONAL: Add these fields to your Firestore `marketAnalysis` documents:
//   asset?: string         — e.g. "BTC", "ETH", "SOL", "AI Sector"
//   delta?: string         — e.g. "+8.42%", "-4.21%"
//   deltaPositive?: boolean
//   tag?: 'Bullish' | 'Bearish' | 'Rotation' | 'On-chain'
//   excerpt?: string       — 1–2 sentence summary shown above the body
//   author?: string        — e.g. "Andrew"
//   readTime?: number      — minutes

'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AnalysisItem {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  timestamp: Date;
  // Optional metadata
  asset?: string;
  delta?: string;
  deltaPositive?: boolean;
  tag?: 'Bullish' | 'Bearish' | 'Rotation' | 'On-chain' | string;
  excerpt?: string;
  author?: string;
  readTime?: number;
}

// ── Colour map for asset badges ───────────────────────────────────────────
const ASSET_COLORS: Record<string, string> = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  SOL: '#96EDD6',
  'AI Sector': '#A78BFA',
  Stables: '#26A17B',
};
const colorFor = (a?: string) => (a && ASSET_COLORS[a]) || '#96EDD6';

const TAG_COLORS: Record<string, string> = {
  Bullish: '#4ade80',
  Bearish: '#f87171',
  Rotation: '#FACC15',
  'On-chain': '#A78BFA',
};

const AUTHOR_COLORS: Record<string, string> = {
  Andrew: '#6366f1',
  Aria: '#ec4899',
  Nova: '#0d9488',
  Rex: '#ea580c',
};

// ─────────────────────────────────────────────────────────────────────────
//  Tiny presentational sub-components
// ─────────────────────────────────────────────────────────────────────────

function AssetBadge({ asset, size = 'md' }: { asset: string; size?: 'sm' | 'md' }) {
  const c = colorFor(asset);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-extrabold tracking-wider"
      style={{
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        fontSize: size === 'sm' ? 10 : 11,
        background: `${c}22`,
        color: c,
        border: `1px solid ${c}55`,
      }}
    >
      <span
        className="inline-block rounded-full"
        style={{ width: 4, height: 4, background: c, boxShadow: `0 0 6px ${c}` }}
      />
      {asset}
    </span>
  );
}

function DeltaBadge({
  delta,
  positive,
  big,
}: {
  delta: string;
  positive: boolean;
  big?: boolean;
}) {
  const col = positive ? '#4ade80' : '#f87171';
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className="inline-flex items-center gap-1 font-mono font-extrabold"
      style={{ color: col, fontSize: big ? 14 : 12 }}
    >
      <Icon className={big ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
      {delta}
    </span>
  );
}

function TagPill({ tag }: { tag: string }) {
  const c = TAG_COLORS[tag] || '#96EDD6';
  return (
    <span
      className="inline-flex items-center rounded font-extrabold uppercase tracking-wider"
      style={{
        padding: '2px 8px',
        background: `${c}1f`,
        color: c,
        border: `1px solid ${c}55`,
        fontSize: 10,
      }}
    >
      {tag}
    </span>
  );
}

function AuthorChip({ name, ts }: { name?: string; ts: Date }) {
  if (!name) {
    return (
      <div className="text-xs font-mono text-white/40">
        {format(ts, 'MMM d, yyyy h:mm a')}
      </div>
    );
  }
  const c = AUTHOR_COLORS[name] || '#475569';
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-extrabold"
        style={{ background: `${c}33`, color: c, border: `1px solid ${c}66` }}
      >
        {name.charAt(0).toUpperCase()}
      </span>
      <div className="text-[11px] leading-tight">
        <div className="font-bold text-white">{name}</div>
        <div className="font-mono text-white/40">{format(ts, 'MMM d, yyyy · h:mm a')}</div>
      </div>
    </div>
  );
}

function NavBtn({
  dir,
  onClick,
  disabled,
}: {
  dir: 'prev' | 'next';
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Previous' : 'Next'}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-[10px] border-none transition-all',
        disabled
          ? 'cursor-not-allowed bg-white/[0.03] text-white/40'
          : 'cursor-pointer bg-white/[0.06] text-white hover:bg-[#96EDD6]/[0.12] hover:text-[#96EDD6]'
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function PreviewCard({
  item,
  active,
  onClick,
}: {
  item: AnalysisItem;
  active: boolean;
  onClick: () => void;
}) {
  const c = colorFor(item.asset);
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-shrink-0 flex-col gap-1.5 rounded-xl p-2.5 text-left transition-all',
        active
          ? 'bg-[#96EDD6]/10 -translate-y-0.5'
          : 'bg-white/[0.03] hover:bg-white/[0.05]'
      )}
      style={{
        width: 200,
        border: active ? '1px solid #96EDD6' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {item.imageUrl && (
        <div
          className="overflow-hidden rounded-lg"
          style={{ height: 70, border: `1px solid ${c}33` }}
        >
          <img
            src={item.imageUrl}
            alt={item.asset || item.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="flex items-center gap-1.5">
        {item.asset && <AssetBadge asset={item.asset} size="sm" />}
        {item.delta && <DeltaBadge delta={item.delta} positive={!!item.deltaPositive} />}
      </div>
      <div
        className="overflow-hidden text-[11px] font-bold leading-snug text-white"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {item.title}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────────────────────────

export default function MarketAnalysis() {
  const [analyses, setAnalyses] = useState<AnalysisItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [i, setI] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, 'marketAnalysis'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const data: AnalysisItem[] = [];
        querySnapshot.forEach((docSnap) => {
          const d = docSnap.data();
          data.push({
            id: docSnap.id,
            title: (d.title as string) || 'No Title',
            content: (d.content as string) || '',
            imageUrl: (d.imageUrl as string) || null,
            timestamp: d.createdAt?.toDate() || new Date(),
            asset: d.asset as string | undefined,
            delta: d.delta as string | undefined,
            deltaPositive: d.deltaPositive as boolean | undefined,
            tag: d.tag as AnalysisItem['tag'],
            excerpt: d.excerpt as string | undefined,
            author: d.author as string | undefined,
            readTime: d.readTime as number | undefined,
          });
        });
        setAnalyses(data);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching market analysis:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (i >= analyses.length) setI(0);
  }, [analyses.length, i]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[#96EDD6]" />
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center text-gray-400">
        <p>No market analysis available yet.</p>
      </div>
    );
  }

  const item = analyses[i];
  const c = colorFor(item.asset);
  const next = () => setI((i + 1) % analyses.length);
  const prev = () => setI((i - 1 + analyses.length) % analyses.length);

  return (
    <div className="flex w-full flex-col gap-4 md:gap-[18px]">
      {/* Themed prose styling */}
      <style>{`
        .kp-prose {
          color: rgba(255, 255, 255, 0.78);
          font-size: 13px;
          line-height: 1.65;
        }
        .kp-prose strong {
          color: #fff;
          font-weight: 700;
        }
        .kp-prose h3 {
          color: #96edd6;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin: 18px 0 8px;
        }
        .kp-prose p {
          margin: 0 0 12px;
        }
        .kp-prose ul {
          margin: 0 0 12px;
          padding-left: 18px;
        }
        .kp-prose li {
          margin-bottom: 4px;
        }
        .kp-prose li::marker {
          color: #96edd6;
        }
        .kp-prose a {
          color: #96edd6;
          text-decoration: none;
          border-bottom: 1px dashed rgba(150, 237, 214, 0.4);
        }
        .kp-prose code {
          background: rgba(150, 237, 214, 0.1);
          color: #96edd6;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 0.92em;
        }
        @keyframes kpSlide {
          from { transform: translateY(8px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
      `}</style>

      {/* Section header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#96EDD6]">
            ◇ Market Analysis
          </div>
          <h2 className="m-0 text-xl font-extrabold tracking-tight text-white md:text-2xl">
            Today&apos;s focus
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <NavBtn dir="prev" onClick={prev} />
          <NavBtn dir="next" onClick={next} />
        </div>
      </div>

      {/* HERO */}
      <div
        key={item.id}
        className="relative flex flex-col overflow-hidden rounded-[22px] md:flex-row"
        style={{
          border: `1px solid ${c}33`,
          background: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))',
          minHeight: 380,
          animation: 'kpSlide .4s cubic-bezier(.2,.9,.3,1.1) forwards',
        }}
      >
        {/* IMAGE half */}
        <div
          className="relative overflow-hidden bg-black/40"
          style={{ flex: '0 0 220px' }}
        >
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="block h-full w-full object-cover"
            />
          )}
          {/* Gradient overlay — vertical on mobile */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, transparent 50%, rgba(10,10,15,0.6))',
            }}
          />
          {/* Gradient overlay — horizontal on desktop */}
          <div
            className="pointer-events-none absolute inset-0 hidden md:block"
            style={{
              background: 'linear-gradient(90deg, transparent 50%, rgba(10,10,15,0.6))',
            }}
          />
          {/* Asset chip + tag (top-left) */}
          <div className="absolute left-3 top-3 flex items-center gap-2 md:left-[18px] md:top-[18px]">
            {item.asset && (
              <span
                className="rounded-full font-extrabold tracking-wider backdrop-blur"
                style={{
                  padding: '5px 12px',
                  background: 'rgba(10,10,15,0.7)',
                  border: `1px solid ${c}55`,
                  fontSize: 12,
                  color: c,
                }}
              >
                {item.asset}
              </span>
            )}
            {item.tag && <TagPill tag={item.tag} />}
          </div>
          {/* 24H delta pill (bottom-left) */}
          {item.delta && (
            <div
              className="absolute bottom-3 left-3 flex items-baseline gap-2 rounded-lg backdrop-blur md:bottom-[18px] md:left-[18px]"
              style={{
                padding: '6px 12px',
                background: 'rgba(10,10,15,0.65)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span className="text-[10px] font-bold tracking-wider text-white/40">24H</span>
              <DeltaBadge delta={item.delta} positive={!!item.deltaPositive} big />
            </div>
          )}
        </div>

        {/* TEXT half */}
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-4 md:p-6">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/65">
            <span className="font-mono font-bold">
              {String(i + 1).padStart(2, '0')}/{String(analyses.length).padStart(2, '0')}
            </span>
            <span className="text-white/40">·</span>
            <span className="font-mono text-white/40">
              {format(item.timestamp, 'MMM d, yyyy · h:mm a')}
            </span>
            {item.readTime && (
              <>
                <span className="text-white/40">·</span>
                <span className="text-white/40">~{item.readTime} min</span>
              </>
            )}
          </div>

          {/* Headline */}
          <h3 className="m-0 mt-1 text-[22px] font-black leading-[1.12] tracking-[-0.025em] text-white md:text-[30px]">
            {item.title}
          </h3>

          {/* Excerpt (optional) */}
          {item.excerpt && (
            <p
              className="m-0 border-l-2 pl-2.5 text-[13px] italic leading-relaxed text-white/65 md:text-[14.5px]"
              style={{ borderColor: '#96EDD6' }}
            >
              {item.excerpt}
            </p>
          )}

          {/* Body */}
          <div className="mt-1.5 min-h-0 flex-1 overflow-auto">
            <div
              className="kp-prose"
              dangerouslySetInnerHTML={{ __html: item.content }}
            />
          </div>

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/[0.08] pt-3">
            <AuthorChip name={item.author} ts={item.timestamp} />
            <button
              className="cursor-pointer rounded-[10px] border-none px-4 py-2 text-xs font-extrabold transition-opacity hover:opacity-90"
              style={{ background: '#96EDD6', color: '#0a0a0f' }}
            >
              Read full →
            </button>
          </div>
        </div>
      </div>

      {/* Preview strip */}
      {analyses.length > 1 && (
        <div>
          <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/40">
            More analyses
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {analyses.map((it, idx) => (
              <PreviewCard
                key={it.id}
                item={it}
                active={idx === i}
                onClick={() => setI(idx)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
