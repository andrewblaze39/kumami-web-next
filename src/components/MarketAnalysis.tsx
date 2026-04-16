'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AnalysisItem {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  timestamp: Date;
}

export default function MarketAnalysis() {
  const [analyses, setAnalyses] = useState<AnalysisItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'marketAnalysis'),
      orderBy('createdAt', 'desc'),
      limit(5)
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
      const slideElement = sliderRef.current.children[index] as HTMLElement | undefined;
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#96EDD6]" />
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        <p>No market analysis available yet.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Prev */}
      <button
        onClick={goToPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800 bg-opacity-70 hover:bg-opacity-100 text-white p-2 rounded-r-full shadow-lg focus:outline-none"
        aria-label="Previous analysis"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Slider */}
      <div
        ref={sliderRef}
        className="flex overflow-hidden scroll-smooth snap-x snap-mandatory w-full"
      >
        {analyses.map((analysis) => (
          <div
            key={analysis.id}
            className="w-full flex-shrink-0 snap-start px-2"
          >
            <div className="bg-transparent rounded-lg overflow-hidden">
              <h2 className="text-xl font-semibold text-white mb-3">{analysis.title}</h2>
              <div className="flex flex-col md:flex-row gap-4">
                {analysis.imageUrl && (
                  <div className="w-full md:w-2/3">
                    <img
                      src={analysis.imageUrl}
                      alt={analysis.title}
                      className="w-full h-auto rounded-lg object-contain max-h-96 mx-auto"
                    />
                  </div>
                )}
                <div className="w-full md:w-1/3">
                  <div
                    className="prose prose-xs prose-invert max-w-none text-gray-300"
                    style={{
                      fontSize: '0.75rem',
                      lineHeight: '1.5',
                      maxHeight: 'calc(100% - 2rem)',
                      overflowY: 'auto',
                      paddingRight: '0.5rem',
                    }}
                    dangerouslySetInnerHTML={{ __html: analysis.content }}
                  />
                  <div className="mt-3 text-xs text-gray-500">
                    {format(analysis.timestamp, 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="flex justify-center mt-6 space-x-2">
        {analyses.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              currentSlide === index ? 'bg-[#96EDD6]' : 'bg-gray-600'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Next */}
      <button
        onClick={goToNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-gray-800 bg-opacity-70 hover:bg-opacity-100 text-white p-2 rounded-full shadow-lg focus:outline-none"
        aria-label="Next analysis"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}
