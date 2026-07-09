import type { Metadata } from 'next';
import PartnersGrid from '@/components/PartnersGrid';

export const metadata: Metadata = {
  title: 'Partners — Kumami World',
  description: "Meet Kumami World's ecosystem partners and collaborators.",
};

/** /world/partners — the partners grid rendered inside the world shell. */
export default function WorldPartnersPage() {
  return (
    <div className="w-legacy-embed w-legacy-fullbleed">
      <PartnersGrid />
    </div>
  );
}
