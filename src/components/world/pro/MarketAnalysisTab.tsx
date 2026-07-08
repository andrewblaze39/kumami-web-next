'use client';

/**
 * MarketAnalysisTab — Kumami World port of the CRA Market Analysis carousel
 * (kumami-web/src/pages/Pro/MarketAnalysis.js).
 *
 * onSnapshot of the `marketAnalysis` collection (orderBy createdAt desc,
 * limit 5) rendered as a horizontal snap carousel with prev/next arrows and
 * navigation dots — functionality identical to CRA. Content is admin-authored
 * HTML rendered the same way CRA does (dangerouslySetInnerHTML), with a
 * scoped prose style using world tokens.
 */

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { format } from 'date-fns';

interface AnalysisItem {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  timestamp: Date;
}

export default function MarketAnalysisTab() {
  const [analyses, setAnalyses] = useState<AnalysisItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'marketAnalysis'),
      orderBy('createdAt', 'desc'),
      limit(5) // Only fetch the latest 5 analyses
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const analysisData: AnalysisItem[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          analysisData.push({
            id: docSnap.id,
            title: (data.title as string) || 'No Title',
            content: (data.content as string) || '',
            imageUrl: (data.imageUrl as string) || null,
            timestamp: data.createdAt?.toDate() || new Date(),
          });
        });
        setAnalyses(analysisData);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching market analysis:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    if (sliderRef.current) {
      const slideElement = sliderRef.current.children[index];
      slideElement?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start',
      });
    }
  };

  const goToNext = () => {
    const nextSlide = (currentSlide + 1) % analyses.length;
    goToSlide(nextSlide);
  };

  const goToPrev = () => {
    const prevSlide = (currentSlide - 1 + analyses.length) % analyses.length;
    goToSlide(prevSlide);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00c2c7]" />
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-96 text-white/50"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius, 18px)',
        }}
      >
        <p>No market analysis available yet.</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full p-4 md:p-6"
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius, 18px)',
      }}
    >
      {/* Scoped prose styling for admin-authored HTML content */}
      <style>{`
        .w-ma-prose {
          color: rgba(255, 255, 255, 0.78);
          font-size: 0.75rem;
          line-height: 1.5;
        }
        .w-ma-prose strong { color: #fff; font-weight: 700; }
        .w-ma-prose h1, .w-ma-prose h2, .w-ma-prose h3 { color: var(--ink); margin: 12px 0 6px; }
        .w-ma-prose p { margin: 0 0 10px; }
        .w-ma-prose ul { margin: 0 0 10px; padding-left: 18px; }
        .w-ma-prose li::marker { color: var(--accent); }
        .w-ma-prose a { color: var(--accent); }
        .w-ma-prose img { max-width: 100%; border-radius: 10px; }
      `}</style>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 text-white p-2 rounded-r-full shadow-lg focus:outline-none transition-colors hover:bg-[#00c2c7]/20"
        style={{ background: 'var(--panel-3)' }}
        aria-label="Previous analysis"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Slider Container */}
      <div
        ref={sliderRef}
        className="flex overflow-hidden scroll-smooth snap-x snap-mandatory w-full"
        style={{ scrollBehavior: 'smooth' }}
      >
        {analyses.map((analysis) => (
          <div
            key={analysis.id}
            className="w-full flex-shrink-0 snap-start px-2"
            style={{ scrollSnapAlign: 'start' }}
          >
            <div className="bg-transparent rounded-lg overflow-hidden">
              <h2 className="text-xl font-semibold text-white mb-3">{analysis.title}</h2>

              <div className="flex flex-col md:flex-row gap-4">
                {analysis.imageUrl && (
                  <div className="w-full md:w-2/3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={analysis.imageUrl}
                      alt={analysis.title}
                      className="w-full h-auto rounded-lg object-contain max-h-96 mx-auto"
                    />
                  </div>
                )}

                <div className="w-full md:w-1/3">
                  <div
                    className="w-ma-prose max-w-none"
                    style={{
                      maxHeight: 'calc(100% - 2rem)',
                      overflowY: 'auto',
                      paddingRight: '0.5rem',
                    }}
                    dangerouslySetInnerHTML={{ __html: analysis.content }}
                  />
                  <div className="mt-3 text-xs text-white/45">
                    {format(analysis.timestamp, 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Dots */}
      <div className="flex justify-center mt-6 space-x-2">
        {analyses.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              currentSlide === index ? 'bg-[#00c2c7]' : 'bg-white/20'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Next Button */}
      <button
        onClick={goToNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white p-2 rounded-full shadow-lg focus:outline-none transition-colors hover:bg-[#00c2c7]/20"
        style={{ background: 'var(--panel-3)' }}
        aria-label="Next analysis"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
