import type { Metadata } from 'next';
import AboutContent from '@/components/AboutContent';
import Footer from '@/components/Footer';

const TITLE = 'About Kumami World — Web3 Platform';
const DESCRIPTION =
  'Learn about Kumami World — our mission, products, and vision for making Web3 accessible through education, news, games, AI Labs, and community.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://kumami.world/world/about',
  },
};

/**
 * /world/about — the About Us page (legacy AboutContent) rendered inside the
 * world shell. The marketing homepage stack lives at /world/home.
 */
export default function WorldAboutPage() {
  return (
    <div className="w-legacy-embed w-legacy-fullbleed">
      <AboutContent />
      <Footer />
    </div>
  );
}
