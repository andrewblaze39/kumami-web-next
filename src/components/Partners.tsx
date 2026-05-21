'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';

interface PartnerImage {
  key?: string;
  src: string;
  alt: string;
  link: string;
}

export const homepageFallbackPartnerImages: PartnerImage[] = [
  { src: '/images/partners/R2 - Logo.webp', alt: 'R2', link: 'https://www.r2.money/' },
  { src: '/images/partners/Sentism AI - Logo.webp', alt: 'SentismAI', link: 'https://sentism.ai/' },
  { src: '/images/partners/MIAI - Logo.webp', alt: 'MiAI', link: 'https://miai.art/' },
  { src: '/images/partners/Orbit - Logo.webp', alt: 'Orbit', link: 'https://x.com/explore_thecore?s=21' },
  { src: '/images/partners/Pumpkin - Logo.webp', alt: 'Pumpkin', link: 'https://x.com/pumpkin_global?s=21' },
  { src: '/images/partners/SkyNity - Logo.webp', alt: 'Skynity', link: 'https://x.com/skynity_io?s=21' },
  { src: '/images/partners/ELFA Logo.webp', alt: 'ElfaAi', link: 'https://www.elfa.ai/' },
  { src: '/images/partners/Eragon - Logo.webp', alt: 'Eragon', link: 'https://x.com/eragon_gg?s=21' },
  { src: '/images/partners/LIMOVERSE - Logo.webp', alt: 'Limoverse', link: 'https://limo.limoverse.io/' },
  { src: '/images/partners/Devomon - Logo.webp', alt: 'Devomon', link: 'https://x.com/officialdevomon?s=21' },
  { src: '/images/partners/W3GG - Logo.webp', alt: 'W3GG', link: 'https://www.w3gg.io/' },
  { src: '/images/partners/Zetarium - Logo.webp', alt: 'Zetarium', link: 'https://www.zetarium.world/' },
  { src: '/images/partners/Indonesia Blockchain Week - Logo.webp', alt: 'Indonesia Blockchain Week', link: '#' },
];

const Partners = () => {
  const [partners, setPartners] = useState<PartnerImage[]>([]);
  const [, setLoadedFromDb] = useState(false);

  const fallbackPartnerImages = useMemo(() => homepageFallbackPartnerImages, []);

  useEffect(() => {
    const fetchHomepagePartners = async () => {
      try {
        const q = query(collection(db, 'homepage_partners'));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        const mapped: PartnerImage[] = list
          .filter((p) => p.logoUrl)
          .map((p) => ({
            key: p.id,
            src: p.logoUrl,
            alt: p.name || 'Partner',
            link: p.link || '#',
          }));
        setPartners(mapped);
        setLoadedFromDb(true);
      } catch (err) {
        console.error('Error loading homepage partners:', err);
        setLoadedFromDb(true);
      }
    };

    fetchHomepagePartners();
  }, []);

  const partnerImages = partners.length > 0 ? partners : fallbackPartnerImages;

  return (
    <section
      className="py-16 text-white"
      id="partners"
      style={{
        background: 'linear-gradient(180deg, #000 0%, #0a1a1a 50%, #102425 100%)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-12" style={{ color: '#40e0d0' }}>
          Our Partners
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-10 justify-items-center">
          {partnerImages
            .slice()
            .sort((a, b) => (a.alt || '').localeCompare(b.alt || ''))
            .map((partner, index) => (
              <div key={partner.key || index} className="flex items-center justify-center">
                <a href={partner.link} target="_blank" rel="noopener noreferrer">
                  <img
                    src={partner.src}
                    alt={partner.alt}
                    className="h-10 w-auto object-contain opacity-80 hover:opacity-100 hover:scale-105 transition-all duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </a>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
};

export default Partners;
