'use client';

import { Lock } from 'lucide-react';

export interface LockedCardFeature {
  tag: string;
  title: string;
  desc: string;
  /** CSS class suffix for the fake-preview shape variant (0–4) */
  shapeVariant: number;
}

interface LockedCardProps {
  feature: LockedCardFeature;
}

export default function LockedCard({ feature }: LockedCardProps) {
  return (
    <div className="w-locked-card">
      {/* Blurred fake-preview background */}
      <div className={`w-lc-preview w-lc-shape-${feature.shapeVariant}`} aria-hidden="true">
        <span className="w-lc-bar w-lc-b1" />
        <span className="w-lc-bar w-lc-b2" />
        <span className="w-lc-bar w-lc-b3" />
        <span className="w-lc-bar w-lc-b4" />
        <span className="w-lc-line w-lc-l1" />
        <span className="w-lc-line w-lc-l2" />
        <span className="w-lc-dot w-lc-d1" />
        <span className="w-lc-dot w-lc-d2" />
      </div>

      {/* Blur overlay */}
      <div className="w-lc-blur-mask" aria-hidden="true" />

      {/* Content */}
      <div className="w-lc-body">
        {/* Kumami PRO gold tag */}
        <span className="w-pro-tag">Kumami PRO</span>

        {/* Group label */}
        <span className="w-lc-group">{feature.tag}</span>

        {/* Title */}
        <h3 className="w-lc-title">{feature.title}</h3>

        {/* Value prop */}
        <p className="w-lc-desc">{feature.desc}</p>

        {/* Lock chip */}
        <div className="w-lc-lock">
          <Lock size={13} />
          <span>Unlock with Pro</span>
        </div>
      </div>
    </div>
  );
}
