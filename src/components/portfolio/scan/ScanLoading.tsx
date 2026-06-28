'use client';

import { useEffect, useState } from 'react';
import KumaBear from '../KumaBear';

interface ScanLoadingProps {
  holdingsCount: number;
}

export default function ScanLoading({ holdingsCount }: ScanLoadingProps) {
  const steps = [
    `Reading ${holdingsCount} holding${holdingsCount === 1 ? '' : 's'}…`,
    'Checking concentration…',
    'Pulling 24h market data…',
    'Scoring volatility…',
    'Asking Kuma to summarize…',
  ];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setStep((s) => (s + 1) % steps.length), 720);
    return () => clearInterval(iv);
  }, [steps.length]);

  return (
    <div style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`
        @keyframes psPulseRing { 0%{transform:scale(0.7);opacity:0.55} 70%{opacity:0} 100%{transform:scale(1.4);opacity:0} }
        @keyframes psSpinSlow { to { transform:rotate(360deg) } }
        @keyframes psOrbit { to { transform:rotate(360deg) } }
        @keyframes psRadarSweep { to { transform:rotate(360deg) } }
        @keyframes psShimmer { 0%{background-position:-220px 0} 100%{background-position:220px 0} }
      `}</style>

      <div style={{ position: 'relative', width: 130, height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(150,237,214,0.5)', animation: 'psPulseRing 2.2s ease-out infinite' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(167,139,250,0.5)', animation: 'psPulseRing 2.2s ease-out 0.9s infinite' }} />
        <div style={{ position: 'absolute', width: 114, height: 114, borderRadius: '50%', background: 'conic-gradient(from 0deg,transparent 72%,rgba(150,237,214,0.4))', animation: 'psRadarSweep 1.7s linear infinite' }} />
        <div style={{ position: 'absolute', width: 112, height: 112, borderRadius: '50%', border: '2px dashed rgba(150,237,214,0.4)', animation: 'psSpinSlow 8s linear infinite' }} />
        <div style={{ position: 'absolute', width: 112, height: 112, animation: 'psOrbit 2.7s linear infinite' }}>
          <span style={{ position: 'absolute', top: -4, left: '50%', width: 9, height: 9, borderRadius: '50%', background: '#0d9488', boxShadow: '0 0 10px #14b8a6', transform: 'translateX(-50%)' }} />
        </div>
        <div style={{ position: 'absolute', width: 112, height: 112, animation: 'psOrbit 3.5s linear infinite reverse' }}>
          <span style={{ position: 'absolute', top: -3, left: '50%', width: 8, height: 8, borderRadius: '50%', background: '#f7931a', boxShadow: '0 0 10px #f7931a', transform: 'translateX(-50%)' }} />
        </div>
        <KumaBear size={64} bob />
      </div>

      <div style={{ font: "900 15px 'Lato', system-ui, sans-serif", marginTop: 16, color: '#fff' }}>
        Kuma is reading your bag
      </div>
      <div style={{ font: "700 12px 'Lato', system-ui, sans-serif", color: '#96EDD6', marginTop: 6, minHeight: 16 }}>
        {steps[step]}
      </div>

      <div style={{ width: '100%', marginTop: 20, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {[100, 78, 60].map((w, i) => (
          <div
            key={i}
            style={{
              height: 11,
              width: `${w}%`,
              borderRadius: 6,
              background:
                'linear-gradient(90deg,rgba(255,255,255,0.04),rgba(150,237,214,0.14),rgba(255,255,255,0.04))',
              backgroundSize: '220px 100%',
              animation: `psShimmer 1.4s linear ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
