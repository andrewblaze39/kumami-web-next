'use client';

import Link from 'next/link';
import { Sparkles, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LockedCard, { LockedCardFeature } from './LockedCard';

const PRO_FEATURES: LockedCardFeature[] = [
  {
    tag: 'Real-time',
    title: 'Alpha Room',
    desc: 'Real-time news and curated alpha as it breaks — seconds, not a daily digest.',
    shapeVariant: 0,
  },
  {
    tag: 'Radar',
    title: 'Airdrop Radar',
    desc: 'Track eligibility and upcoming airdrops across chains, ranked by expected value.',
    shapeVariant: 1,
  },
  {
    tag: 'Live',
    title: 'AI Portfolio Manager',
    desc: 'Kuma reviews your bags — rebalancing, risk and what-it-means-for-you insight.',
    shapeVariant: 2,
  },
  {
    tag: 'Live',
    title: 'Smart Money Tracker',
    desc: 'Wallet-level, real-time: see exactly what top-PnL addresses do as they do it.',
    shapeVariant: 3,
  },
  {
    tag: 'Trackers',
    title: 'Coin / Token Tracker',
    desc: 'Deep per-token analytics with custom alerts on the metrics you care about.',
    shapeVariant: 4,
  },
  {
    tag: 'Human',
    title: 'Market Analysis',
    desc: 'KOL-led analysis on what is in right now — fixed positions, real conviction.',
    shapeVariant: 0,
  },
  {
    tag: 'Human',
    title: 'Q&A with Core Teams',
    desc: 'Live sessions with project partners — ask the people actually building.',
    shapeVariant: 1,
  },
  {
    tag: 'Alerts',
    title: 'Major-Move Alerts',
    desc: 'Push alerts the moment the market makes a move that matters to you.',
    shapeVariant: 2,
  },
  {
    tag: 'Access',
    title: 'Whitelist & Events',
    desc: 'Subscriber-only whitelist access and dedicated events. First month free.',
    shapeVariant: 3,
  },
  {
    tag: 'Real-time',
    title: 'Flow Radar',
    desc: 'Live whale-flow signals across BTC, ETH, SOL and more — know where smart money moves.',
    shapeVariant: 4,
  },
];

export default function ProTeaser() {
  const { userData } = useAuth();
  const isPremium = userData?.isPremium === true;

  if (isPremium) {
    return (
      <div className="w-pro-active-panel">
        <div className="w-pro-active-inner">
          <span className="w-pro-active-icon">
            <CheckCircle size={28} />
          </span>
          <h2 className="w-pro-active-title">You&rsquo;re on the PRO whitelist</h2>
          <p className="w-pro-active-sub">
            PRO tools are being built — we&rsquo;ll notify you the moment each feature goes live.
            You already have full access the instant it ships.
          </p>
          <span className="w-pro-tag w-pro-tag-lg">Kumami PRO</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-pro-teaser">
      {/* Section header */}
      <div className="w-pro-header">
        <div className="w-pro-header-left">
          <span className="w-pro-eyebrow">
            <Sparkles size={14} />
            Exclusive Access
          </span>
          <h1 className="w-page-title">Kumami Pro Features</h1>
          <p className="w-page-sub">
            Real-time alpha, smart money tracking and exclusive access — all in one place.
          </p>
        </div>
        <Link href="/world/subscribe" className="w-btn w-btn-pro w-btn-lg">
          <Sparkles size={16} />
          Get Kumami Pro
        </Link>
      </div>

      {/* Locked feature grid */}
      <div className="w-pro-grid">
        {PRO_FEATURES.map((feature) => (
          <LockedCard key={feature.title} feature={feature} />
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="w-pro-footer-cta">
        <p className="w-pro-footer-copy">
          Everything you need to stay ahead of the market — and the people moving it.
        </p>
        <Link href="/world/subscribe" className="w-btn w-btn-pro w-btn-lg">
          <Sparkles size={16} />
          Get Kumami Pro
        </Link>
      </div>
    </div>
  );
}
