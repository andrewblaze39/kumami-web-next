/**
 * Pure formatting helpers for the Console panel UI.
 * These are unit-tested (no DOM / jsdom needed — pure string/number functions).
 */

/**
 * Format a USD dollar amount with compact suffix.
 * Handles negative values.
 * Examples: 1_200_000_000 → "$1.2B", -50_000_000 → "-$50M", 500_000 → "$500K"
 */
export function formatUsd(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(0)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  }
  return `${sign}$${abs.toFixed(0)}`;
}

/**
 * Format a price with appropriate precision.
 * High-value assets (≥$100) use 2dp; mid-range (≥$1) use 2dp; micro (<$1) use 4dp.
 */
export function formatPrice(price: number): string {
  if (price >= 1_000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 1) {
    return price.toFixed(2);
  }
  return price.toFixed(4);
}

/**
 * Format a 24h percentage change with sign and one decimal place.
 * Examples: 2.5 → "+2.5%", -1.3 → "-1.3%", 0 → "+0.0%"
 */
export function formatChange(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

/**
 * Format a confidence value (0–1) as a percentage string.
 * Example: 0.78 → "78%"
 */
export function formatConfidence(conf: number): string {
  return `${Math.round(conf * 100)}%`;
}

/**
 * Return a human-readable relative time string from an ISO timestamp.
 * Examples: "just now", "2m ago", "1h ago", "3d ago"
 */
export function relativeTime(isoTs: string): string {
  const diffMs = Date.now() - new Date(isoTs).getTime();
  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1_000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(diffMs / 86_400_000);
  return `${days}d ago`;
}

/**
 * Format an ISO timestamp into a short human-readable clock string.
 * Example: "14:32 UTC"
 */
export function formatTime(isoTs: string): string {
  const d = new Date(isoTs);
  const h = d.getUTCHours().toString().padStart(2, '0');
  const m = d.getUTCMinutes().toString().padStart(2, '0');
  return `${h}:${m} UTC`;
}

/**
 * Map a Verdict color union to a CSS class suffix used by the world design system.
 * Color classes are: w-verdict-green, w-verdict-grey-green, w-verdict-grey,
 *   w-verdict-amber, w-verdict-grey-red, w-verdict-red
 */
export function verdictColorClass(color: string): string {
  return `w-verdict-${color}`;
}
