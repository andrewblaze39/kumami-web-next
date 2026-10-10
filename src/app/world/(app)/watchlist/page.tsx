'use client';

/**
 * /world/watchlist — Watchlist PLUS (Plus workspace): the 5 fixed coins, no
 * adding, for every account. Watchlist Pro is /world/pro?tab=watchlist
 * (Andrew's spec v1.6).
 */
import WatchlistView from '@/components/world/tools/WatchlistView';

export default function WatchlistPage() {
  return <WatchlistView variant="plus" />;
}
