/**
 * KumaBear — the single canonical Kuma bear mascot icon.
 *
 * Used everywhere: topbar FAB, Kuma dock, gate, portfolio scanner, signup.
 * Change the SVG here → it updates across the entire app.
 */

interface KumaBearProps {
  className?: string;
  width?: number;
  height?: number;
  /** Shorthand: sets both width and height */
  size?: number;
  /** Gentle floating animation */
  bob?: boolean;
}

export default function KumaBear({
  className = '',
  width,
  height,
  size,
  bob = false,
}: KumaBearProps) {
  const w = size ?? width ?? 150;
  const h = size ?? height ?? 150;

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Kuma bear mascot"
      role="img"
      style={bob ? { animation: 'kumaBob 4s ease-in-out infinite' } : undefined}
    >
      <defs>
        <radialGradient id="kg-bear" cx="42%" cy="36%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8eef0" />
        </radialGradient>
      </defs>
      {/* Ears */}
      <circle cx="74" cy="74" r="30" fill="url(#kg-bear)" />
      <circle cx="74" cy="74" r="14" fill="#d7dee0" />
      <circle cx="166" cy="74" r="30" fill="url(#kg-bear)" />
      <circle cx="166" cy="74" r="14" fill="#d7dee0" />
      {/* Head */}
      <ellipse cx="120" cy="118" rx="86" ry="80" fill="url(#kg-bear)" />
      {/* Eyes */}
      <circle cx="92" cy="108" r="8.5" fill="#0c1b16" />
      <circle cx="148" cy="108" r="8.5" fill="#0c1b16" />
      <circle cx="89" cy="105" r="2.6" fill="#fff" />
      <circle cx="145" cy="105" r="2.6" fill="#fff" />
      {/* Snout */}
      <ellipse cx="120" cy="150" rx="40" ry="32" fill="#f3ece1" />
      {/* Nose */}
      <ellipse cx="120" cy="134" rx="11" ry="8" fill="#0c1b16" />
      {/* Mouth */}
      <path
        d="M120 142v9M120 151c0 7-8 10-13 7M120 151c0 7 8 10 13 7"
        stroke="#0c1b16"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      {/* Cheek blush */}
      <circle cx="62" cy="138" r="9" fill="#ffd1dc" opacity=".55" />
      <circle cx="178" cy="138" r="9" fill="#ffd1dc" opacity=".55" />
    </svg>
  );
}
