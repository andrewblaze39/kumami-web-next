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

/**
 * AboutKumamiContent — the original marketing homepage section stack,
 * preserved as a reusable component (to be rendered inside the World
 * shell as the "About Kumami" page).
 */
export default function AboutKumamiContent() {
  return (
    <div className="min-h-screen bg-black">
      <HeroSection />
      {/* Anchor target for the hero's "Learn More" button */}
      <div id="kumami-ecosystem">
        <EcosystemSection />
      </div>
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
  );
}
