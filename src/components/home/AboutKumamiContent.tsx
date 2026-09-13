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
import { adminDb } from '@/lib/firebase-admin';

/**
 * Real counts for NumbersSection, fetched server-side via a cheap Firestore
 * count() aggregation (one read regardless of collection size) — replaces
 * the previous hardcoded 5,000 users / 40 partners constants, which animated
 * as if they were live data. Falls back to 0 (section still renders, just
 * with a lower number) if Firestore is unreachable rather than crashing the
 * page over a marketing stat.
 */
async function getHomepageCounts(): Promise<{ users: number; partners: number }> {
  try {
    const db = adminDb();
    const [usersSnap, partnersSnap] = await Promise.all([
      db.collection('users').count().get(),
      db.collection('all_partners').count().get(),
    ]);
    return { users: usersSnap.data().count, partners: partnersSnap.data().count };
  } catch {
    return { users: 0, partners: 0 };
  }
}

/**
 * AboutKumamiContent — the original marketing homepage section stack,
 * preserved as a reusable component (to be rendered inside the World
 * shell as the "About Kumami" page).
 */
export default async function AboutKumamiContent() {
  const { users, partners } = await getHomepageCounts();

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
        <NumbersSection targetUsers={users} targetPartners={partners} />
        <BlogUpdatesSection />
        <FAQSection />
      </div>
      <Partners />
      <Contact />
      <Footer />
    </div>
  );
}
