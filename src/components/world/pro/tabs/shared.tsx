'use client';

import type { ReactNode } from 'react';

/**
 * Shared building blocks for Pro tab panels. ProShellHead renders the standard
 * eyebrow + title + description header used at the top of every Pro panel.
 */
export function ProShellHead({
  eyebrow,
  icon,
  title,
  children,
}: {
  eyebrow: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="pro-shell-head">
      <div className="pt">{eyebrow}</div>
      <h1>
        {icon}
        {title}
      </h1>
      <p>{children}</p>
    </div>
  );
}
