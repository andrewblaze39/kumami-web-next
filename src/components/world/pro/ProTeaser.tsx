'use client';

import Link from 'next/link';
import { Sparkles, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LockedCard, { LockedCardFeature } from './LockedCard';

// Each card's tag/desc must match what the tab actually does today — see
// src/components/world/pro/WorldProContent.tsx for the live-vs-ComingSoon
// split. Cards for still-building tabs are honestly labeled "Coming Soon"
// rather than "Live" — overselling here is exactly what erodes trust once a
// subscriber opens the tab and finds a placeholder.
const PRO_FEATURES: LockedCardFeature[] = [
  {
    tag: 'Live',
    title: 'Alpha Room',
    desc: 'Curated alpha calls as they land — a live feed, not a daily digest.',
    shapeVariant: 0,
  },
  {
    tag: 'Live',
    title: 'Airdrop Radar',
    desc: 'Track eligibility and upcoming airdrops across chains, with a clear checklist per drop.',
    shapeVariant: 1,
  },
  {
    tag: 'Live',
    title: 'AI Portfolio Manager',
    desc: 'Track your holdings with live pricing, plus a portfolio risk scan you can re-run anytime.',
    shapeVariant: 2,
  },
  {
    tag: 'Coming Soon',
    title: 'Smart Money Tracker',
    desc: 'Wallet-level flow across market makers, funds and on-chain whales — in active development.',
    shapeVariant: 3,
  },
  {
    tag: 'Coming Soon',
    title: 'Coin / Token Tracker',
    desc: 'Deep per-token analytics with custom alerts on the metrics you care about — in active development.',
    shapeVariant: 4,
  },
  {
    tag: 'Human',
    title: 'Market Analysis',
    desc: 'KOL-led analysis on what is in right now — fixed positions, real conviction.',
    shapeVariant: 0,
  },
  {
    tag: 'Live',
    title: 'Events & Announcements',
    desc: 'Live-streamed sessions with project partners, with real-time audience Q&A.',
    shapeVariant: 1,
  },
  {
    tag: 'Alerts',
    title: 'Following & Alerts',
    desc: 'In-app alerts the moment a price move crosses your threshold — no need to keep checking.',
    shapeVariant: 2,
  },
  {
    tag: 'Live',
    title: 'Whitelist & Events',
    desc: 'Subscriber-only whitelist access and dedicated events, all in one place.',
    shapeVariant: 3,
  },
  {
    tag: 'Breadth',
    title: 'Flow Radar — Pro',
    desc: 'The same live whale-flow radar Plus gets, expanded to the full tracked universe with every severity unlocked.',
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
          <h2 className="w-pro-active-title">You&rsquo;re on Kumami Pro</h2>
          <p className="w-pro-active-sub">
            Full access is already unlocked — open any tab from the sidebar. A few tools (Smart
            Money Tracker, Coin/Token Tracker) are still in active development and will light up
            automatically once they ship.
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
