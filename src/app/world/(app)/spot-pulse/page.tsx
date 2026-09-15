'use client';

/**
 * /world/spot-pulse — standalone Spot Pulse tab (Plus tier).
 *
 * Same live engine already embedded on On-Chain Insights (§2.9) — this route
 * gives it its own top-level Plus nav slot per the PM spec, in addition to
 * that embedded placement (which stays as-is).
 */

import SpotPulse from '@/components/world/panels/SpotPulse';
import { WIcon } from '@/components/world/panels/console-ui';

export default function SpotPulsePage() {
  return (
    <div className="w-content-inner">
      <div className="w-oc-head">
        <div className="w-oc-head-top">
          <div>
            <div className="w-ptag">Plus</div>
            <h1>
              <WIcon name="spark" /> Spot Pulse
            </h1>
            <p className="w-oc-sub">
              Where is real money moving — spot buying and selling vs. futures leverage,
              five majors at a glance.
            </p>
          </div>
        </div>
      </div>

      <SpotPulse />
    </div>
  );
}
