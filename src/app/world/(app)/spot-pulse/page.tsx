/**
 * /world/spot-pulse — no longer a standalone Plus tab (per the latest
 * mockup: Spot Pulse only ever appears embedded — the Console preview and
 * the full grid on On-Chain Insights §2.9). Redirects there for anyone with
 * an old link or bookmark.
 */

import { redirect } from 'next/navigation';

export default function SpotPulsePage() {
  redirect('/world/onchain');
}
