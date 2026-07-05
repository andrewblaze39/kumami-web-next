/**
 * KumaBear — placeholder bear-face SVG mascot for Kumami World.
 *
 * The original Kuma bear SVG from the mockup HTML lives inside a compressed
 * JavaScript bundle blob (base64/gzip) which is not directly extractable at
 * build time without running the bundle. This placeholder replicates the
 * bear-face silhouette in clean SVG so we can iterate quickly; a designer can
 * swap in the final asset later.
 */

interface KumaBearProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function KumaBear({
  className = '',
  width = 150,
  height = 150,
}: KumaBearProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Kuma bear mascot"
      role="img"
    >
      {/* Ear left */}
      <circle cx="52" cy="58" r="28" fill="#1c3a2e" />
      <circle cx="52" cy="58" r="18" fill="#2a5444" />
      {/* Ear right */}
      <circle cx="148" cy="58" r="28" fill="#1c3a2e" />
      <circle cx="148" cy="58" r="18" fill="#2a5444" />
      {/* Head */}
      <circle cx="100" cy="108" r="76" fill="#1c3a2e" />
      {/* Face highlight */}
      <ellipse cx="100" cy="120" rx="52" ry="44" fill="#244d3c" />
      {/* Eye left */}
      <circle cx="78" cy="96" r="10" fill="#f1f7f4" />
      <circle cx="80" cy="94" r="5" fill="#06241a" />
      <circle cx="82" cy="92" r="2" fill="#f1f7f4" />
      {/* Eye right */}
      <circle cx="122" cy="96" r="10" fill="#f1f7f4" />
      <circle cx="124" cy="94" r="5" fill="#06241a" />
      <circle cx="126" cy="92" r="2" fill="#f1f7f4" />
      {/* Nose */}
      <ellipse cx="100" cy="118" rx="14" ry="10" fill="#5ee9a8" opacity="0.85" />
      <circle cx="100" cy="116" r="4" fill="#06241a" />
      {/* Mouth */}
      <path
        d="M88 128 Q100 140 112 128"
        stroke="#8ea69c"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Cheek blush left */}
      <ellipse cx="68" cy="122" rx="12" ry="7" fill="#5ee9a8" opacity="0.18" />
      {/* Cheek blush right */}
      <ellipse cx="132" cy="122" rx="12" ry="7" fill="#5ee9a8" opacity="0.18" />
    </svg>
  );
}
