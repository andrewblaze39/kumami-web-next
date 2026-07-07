import type { Metadata } from 'next';
import AboutKumamiContent from '@/components/home/AboutKumamiContent';

export const metadata: Metadata = {
  title: 'About Kumami — Kumami World',
  description: 'The Kumami story — ecosystem, numbers, partners and updates.',
};

/**
 * /world/about — the original marketing homepage stack rendered inside the
 * world shell. `w-legacy-fullbleed` opts this page out of the 1180px
 * `.w-content` cap: world.css uses `.w-content:has(> .w-legacy-fullbleed)`
 * to drop the max-width/padding on the layout wrapper, so the hero and
 * section backgrounds run edge-to-edge within the main column.
 */
export default function WorldAboutPage() {
  return (
    <div className="w-legacy-embed w-legacy-fullbleed">
      <AboutKumamiContent />
    </div>
  );
}
