'use client';

/**
 * MetricPanel — shared wrapper for all On-Chain Insights panels.
 *
 * Renders:
 *  - Panel header: metric name with optional tooltip, verdict chip, tags,
 *    confidence badge, timestamp.
 *  - Optional subtitle line (for notes like "Always 30D").
 *  - Loading skeleton state.
 *  - Error / empty state.
 *  - Interpretation sentence (when payload provides it).
 *  - Children slot for the body chart/content.
 */

import type { ReactNode } from 'react';
import type { PanelVerdict } from '@/lib/market/contracts';
import { relativeTime, verdictColorClass, formatConfidence } from './format';

type Props = {
  title: string;
  tooltip?: string;
  subtitle?: string;
  panelVerdict?: PanelVerdict & { headline: string };
  loading?: boolean;
  /** If true, renders an error/empty fallback instead of children. */
  empty?: boolean;
  /** Asset name used in the empty state message. */
  asset?: string;
  children?: ReactNode;
  /** Extra CSS classes for the outer panel element. */
  className?: string;
};

export default function MetricPanel({
  title,
  tooltip,
  subtitle,
  panelVerdict,
  loading = false,
  empty = false,
  asset,
  children,
  className = '',
}: Props) {
  if (loading) {
    return (
      <div
        className={`w-oc-panel w-panel-skeleton${className ? ` ${className}` : ''}`}
        style={{ minHeight: 200 }}
        aria-busy="true"
        aria-label={`Loading ${title}`}
      />
    );
  }

  if (empty || !panelVerdict) {
    return (
      <div className={`w-oc-panel${className ? ` ${className}` : ''}`}>
        <div className="w-oc-ph">
          <span className="w-oc-ttl">{title}</span>
        </div>
        <p className="w-panel-empty">
          {asset ? `No derivatives data for ${asset}` : 'No data available'}
        </p>
      </div>
    );
  }

  const { verdict, tags, confidence, interpretation, updatedAt, headline } = panelVerdict;

  return (
    <div className={`w-oc-panel${className ? ` ${className}` : ''}`}>
      {/* Header */}
      <div className="w-oc-ph">
        <div className="w-oc-ph-left">
          <div className="w-oc-ttl-row">
            <span className="w-oc-ttl">{title}</span>
            {tooltip && (
              <span
                className="w-oc-q"
                title={tooltip}
                role="tooltip"
                aria-label={tooltip}
              >
                ?
              </span>
            )}
          </div>
          {subtitle && <span className="w-oc-ph-sub">{subtitle}</span>}
        </div>
        <div className="w-oc-ph-r">
          <span
            className={`w-verdict-chip ${verdictColorClass(verdict.color)}`}
            aria-label={`Verdict: ${verdict.label}`}
          >
            {verdict.label}
          </span>
          {confidence !== undefined && (
            <span
              className="w-confidence-badge"
              title={`Confidence: ${formatConfidence(confidence)}`}
            >
              {formatConfidence(confidence)}
            </span>
          )}
        </div>
      </div>

      {/* Headline + tags row */}
      <div className="w-oc-pb">
        <div className="w-oc-headline-row">
          <p className="w-oc-headline">{headline}</p>
          {tags.length > 0 && (
            <div className="w-oc-tags">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className={`w-tag-chip ${verdictColorClass(tag.color)}`}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Chart / body slot */}
        {children}

        {/* Interpretation */}
        {interpretation && (
          <p className="w-panel-read" aria-label="Interpretation">
            {interpretation}
          </p>
        )}

        {/* Timestamp */}
        <time className="w-oc-ts" dateTime={updatedAt} title={updatedAt}>
          Updated {relativeTime(updatedAt)}
        </time>
      </div>
    </div>
  );
}
