// src/components/portfolio/KumaBear.tsx
'use client';

interface KumaBearProps {
  size?: number;
  bob?: boolean;
}

export default function KumaBear({ size = 78, bob = true }: KumaBearProps) {
  const cream = '#F5EFE6';
  const dark = '#1a1a23';
  const mint = '#96EDD6';
  const pink = '#F4A8C9';

  return (
    <>
      <style>{`
        @keyframes kpBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{
          filter:
            'drop-shadow(0 8px 18px rgba(0,0,0,0.35)) drop-shadow(0 0 16px rgba(150,237,214,0.18))',
          animation: bob ? 'kpBob 4s ease-in-out infinite' : 'none',
          flexShrink: 0,
        }}
      >
        {/* Ears */}
        <circle cx="22" cy="24" r="13" fill={cream} />
        <circle cx="78" cy="24" r="13" fill={cream} />
        <circle cx="22" cy="24" r="7" fill={mint} />
        <circle cx="78" cy="24" r="7" fill={mint} />

        {/* Head */}
        <circle cx="50" cy="55" r="34" fill={cream} />

        {/* Cheeks */}
        <ellipse cx="26" cy="63" rx="6" ry="4" fill={pink} opacity="0.7" />
        <ellipse cx="74" cy="63" rx="6" ry="4" fill={pink} opacity="0.7" />

        {/* Eyes — blink loop */}
        <ellipse cx="38" cy="50" rx="3" ry="4" fill={dark}>
          <animate
            attributeName="ry"
            values="4;0.4;4;4;4"
            keyTimes="0;0.03;0.06;0.5;1"
            dur="4.5s"
            repeatCount="indefinite"
          />
        </ellipse>
        <ellipse cx="62" cy="50" rx="3" ry="4" fill={dark}>
          <animate
            attributeName="ry"
            values="4;0.4;4;4;4"
            keyTimes="0;0.03;0.06;0.5;1"
            dur="4.5s"
            repeatCount="indefinite"
          />
        </ellipse>
        <circle cx="39" cy="48.6" r="1.1" fill="#fff" />
        <circle cx="63" cy="48.6" r="1.1" fill="#fff" />

        {/* Snout */}
        <ellipse cx="50" cy="66" rx="14" ry="9" fill="#FFF7EA" />

        {/* Nose */}
        <path
          d="M 47 60 Q 50 63 53 60 Q 52.5 64 50 64.2 Q 47.5 64 47 60 Z"
          fill={dark}
        />

        {/* Mouth */}
        <path
          d="M 50 64.5 L 50 67.5 M 45 71 Q 50 74 55 71"
          stroke={dark}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </>
  );
}
