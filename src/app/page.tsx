import type { Metadata } from 'next'
import HeroSection from '@/components/HeroSection';
import EcosystemSection from '@/components/EcosystemSection';
import MovingTagline from '@/components/MovingTagline';
import TrendingNews from '@/components/TrendingNews';
import NumbersSection from '@/components/NumbersSection';
import BlogUpdatesSection from '@/components/BlogUpdatesSection';
import FAQSection from '@/components/FAQSection';
import Partners from '@/components/Partners';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Kumami World — Where Web3 Finally Makes Sense',
  description: 'Your all-in-one platform for crypto news, Web3 education, blockchain gaming, AI research, and community. Make sense of Web3 with Kumami.',
  alternates: { canonical: 'https://kumami.world' },
  openGraph: {
    title: 'Kumami World — Where Web3 Finally Makes Sense',
    description: 'Your all-in-one platform for crypto news, Web3 education, blockchain gaming, AI research, and community.',
    url: 'https://kumami.world',
    siteName: 'Kumami World',
    locale: 'en_US',
    type: 'website',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'Kumami World' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kumami World — Where Web3 Finally Makes Sense',
    description: 'Your all-in-one platform for crypto news, Web3 education, blockchain gaming, AI research, and community.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Kumami World',
            url: 'https://kumami.world',
            description: 'Your all-in-one platform for crypto news, Web3 education, blockchain gaming, AI research, and community.',
            potentialAction: {
              '@type': 'SearchAction',
              target: { '@type': 'EntryPoint', urlTemplate: 'https://kumami.world/all-news?q={search_term_string}' },
              'query-input': 'required name=search_term_string',
            },
          }),
        }}
      />
    <div className="min-h-screen bg-black">
      <HeroSection />
      <EcosystemSection />
      <MovingTagline />
      <div
        className="partners-contact-section"
        style={{
          backgroundImage: "url('/landing-page-bg-(no-pic)-ver-2.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'repeat-y',
          backgroundColor: '#000',
        }}
      >
        <TrendingNews />
        <NumbersSection />
        <BlogUpdatesSection />
        <FAQSection />
      </div>
      <Partners />
      <Contact />
      <Footer />
    </div>
    </>
  );
}
