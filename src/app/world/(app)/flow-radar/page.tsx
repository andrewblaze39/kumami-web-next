'use client';

/**
 * /world/flow-radar — Flow Radar PLUS (Plus workspace). Always the cut-down,
 * 15-min-delayed version, for every account. The complete real-time version
 * is Flow Radar Pro at /world/pro?tab=flowradar (Andrew's spec v1.6).
 */
import FlowRadarView from '@/components/world/tools/FlowRadarView';

export default function FlowRadarPage() {
  return <FlowRadarView variant="plus" />;
}
