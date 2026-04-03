'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface NewsItem {
  id: string;
  title?: string;
  summary?: string;
  content?: string;
  imageUrl?: string;
  status?: string;
  timestamp?: { seconds: number; toDate?: () => Date };
}

const TrendingNews = () => {
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch trending news from Firestore
  useEffect(() => {
    const fetchTrendingNews = async () => {
      try {
        // First try with timestamp field if available
        try {
          const newsQuery = query(
            collection(db, 'news'),
            orderBy('timestamp', 'desc'),
            limit(20)
          );

          const querySnapshot = await getDocs(newsQuery);
          const allFetchedData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as NewsItem[];

          const newsItems = allFetchedData.filter(
            (article) => article.status === 'published'
          );

          const sortedItems = newsItems
            .sort((a, b) => {
              const dateA = a.timestamp?.seconds || 0;
              const dateB = b.timestamp?.seconds || 0;
              return dateB - dateA;
            })
            .slice(0, 4);

          console.log('Trending news loaded:', sortedItems.length, 'items');
          setNewsData(sortedItems);
          setLoading(false);
        } catch (indexError) {
          console.error('Index error in trending news:', indexError);
          console.log('Trying fallback query without ordering');
          const fallbackQuery = query(
            collection(db, 'news'),
            limit(20)
          );

          const querySnapshot = await getDocs(fallbackQuery);
          const allFetchedData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as NewsItem[];

          const newsItems = allFetchedData
            .filter((article) => article.status === 'published')
            .sort((a, b) => {
              const dateA = a.timestamp?.seconds || 0;
              const dateB = b.timestamp?.seconds || 0;
              return dateB - dateA;
            })
            .slice(0, 4);

          console.log('Fallback trending news loaded:', newsItems.length, 'items');
          setNewsData(newsItems);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching trending news:', error);
        setLoading(false);
      }
    };

    fetchTrendingNews();
  }, []);

  // Handle dot navigation click
  const handleDotClick = React.useCallback(
    (index: number) => {
      if (index !== currentNewsIndex && !isTransitioning) {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentNewsIndex(index);
          setIsTransitioning(false);
          setIsEntering(true);
          setTimeout(() => setIsEntering(false), 300);
        }, 150);
      }
    },
    [currentNewsIndex, isTransitioning]
  );

  // Handle previous button click
  const handlePrevious = React.useCallback(() => {
    if (newsData.length === 0) return;
    const prevIndex =
      currentNewsIndex === 0 ? newsData.length - 1 : currentNewsIndex - 1;
    handleDotClick(prevIndex);
  }, [currentNewsIndex, newsData.length, handleDotClick]);

  // Handle next button click
  const handleNext = React.useCallback(() => {
    if (newsData.length === 0) return;
    const nextIndex =
      currentNewsIndex === newsData.length - 1 ? 0 : currentNewsIndex + 1;
    handleDotClick(nextIndex);
  }, [currentNewsIndex, newsData.length, handleDotClick]);

  // Auto-advance the slider every 5 seconds
  useEffect(() => {
    if (newsData.length <= 1) return;

    const interval = setInterval(() => {
      handleNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [currentNewsIndex, newsData.length, handleNext]);

  const hasNoNews = !loading && newsData.length === 0;

  return (
    <div className="w-full py-16 px-8 trending-news-section">
      {hasNoNews && (
        <div className="text-center p-8">
          <p className="text-gray-400">
            No trending news available at the moment.
          </p>
        </div>
      )}
      {/* CSS Animations */}
      <style>{`
        @keyframes slideIn {
          0% {
            opacity: 0;
            transform: translateX(50px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideOut {
          0% {
            opacity: 1;
            transform: translateX(0);
          }
          100% {
            opacity: 0;
            transform: translateX(-50px);
          }
        }

        @keyframes dotPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
        }

        .dot-active {
          animation: dotPulse 0.3s ease-in-out;
        }

        .news-content {
          transition: all 0.3s ease-in-out;
        }

        .news-content.transitioning {
          animation: slideOut 0.15s ease-in-out forwards;
        }

        .news-content.entering {
          animation: slideIn 0.3s ease-out forwards;
        }

        .nav-button {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(150, 237, 214, 0.4);
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: all 0.3s ease;
          z-index: 10;
          color: #102425;
          font-size: 20px;
          font-weight: bold;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .nav-button:hover {
          background: rgba(150, 237, 214, 0.7);
          border-color: rgba(255, 255, 255, 0.4);
          transform: translateY(-50%) scale(1.1);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }

        .nav-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .nav-button.left {
          left: 10px;
        }

        .nav-button.right {
          right: 10px;
        }

        .slide-container:hover .nav-button {
          opacity: 1;
        }

        .trending-news-section {
          background-color: #102425;
        }
      `}</style>

      {loading ? (
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-12">
            Trending News
          </h2>
          <div className="flex justify-center items-center h-96">
            <div className="spinner-border text-light" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-12">
            Trending News
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main News Card - Takes 3 columns */}
            <div className="lg:col-span-3 w-full lg:w-auto lg:max-w-[900px] mx-auto lg:mx-0 justify-self-start rounded-[2rem] overflow-hidden border-2 border-white slide-container relative">
              {/* News Content Container */}
              <div
                className={`news-content ${isTransitioning ? 'transitioning' : ''} ${isEntering ? 'entering' : ''}`}
              >
                {/* Full width image */}
                <div
                  className="w-full relative overflow-hidden bg-[#102425]"
                  style={{ aspectRatio: '3 / 2' }}
                >
                  {/* Navigation Buttons */}
                  <button
                    onClick={handlePrevious}
                    className="nav-button left"
                    disabled={isTransitioning}
                  >
                    ❮
                  </button>

                  <button
                    onClick={handleNext}
                    className="nav-button right"
                    disabled={isTransitioning}
                  >
                    ❯
                  </button>

                  <img
                    key={`img-${currentNewsIndex}`}
                    src={
                      newsData[currentNewsIndex]?.imageUrl || '/trendingnews.png'
                    }
                    alt={newsData[currentNewsIndex]?.title || 'Trending News'}
                    className="absolute top-0 left-0 block w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).onerror = null;
                      (e.target as HTMLImageElement).src = '/trendingnews.png';
                    }}
                  />
                </div>

                {/* Content below image */}
                <div className="p-6 flex flex-col gap-3">
                  <h3
                    key={`title-${currentNewsIndex}`}
                    className="text-3xl font-bold text-white mb-2 leading-tight"
                  >
                    {newsData[currentNewsIndex]?.title || 'Loading...'}
                  </h3>
                  <p
                    key={`desc-${currentNewsIndex}`}
                    className="text-gray-300 text-sm leading-relaxed"
                  >
                    {newsData[currentNewsIndex]?.summary ||
                      (newsData[currentNewsIndex]?.content?.substring(0, 150) + '...') ||
                      'Loading...'}
                  </p>
                  <div>
                    <Link
                      href={`/news/${newsData[currentNewsIndex]?.id}`}
                      className="bg-transparent border border-[#96EDD6] text-[#96EDD6] px-4 py-2 rounded-full text-sm font-medium hover:bg-[#96EDD6] hover:text-black transition-all duration-300 inline-block transform hover:scale-105 no-underline"
                    >
                      Read More
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile-only pagination dots */}
            <div className="block lg:hidden w-full mb-4">
              <div className="flex justify-center space-x-2">
                {newsData.map((_, index) => (
                  <div
                    key={index}
                    onClick={() => handleDotClick(index)}
                    className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-300 transform hover:scale-110 ${
                      currentNewsIndex === index
                        ? 'bg-[#96EDD6] dot-active shadow-lg shadow-[#96EDD6]/50'
                        : 'bg-gray-600 hover:bg-gray-400'
                    }`}
                  ></div>
                ))}
              </div>
            </div>

            {/* Pricing Card */}
            <div className="rounded-[2rem] p-8 border border-[#96EDD6] relative h-fit flex flex-col justify-center lg:mt-20 mt-4">
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">
                From
              </div>
              <div className="text-3xl font-bold text-[#96EDD6] mb-1">
                $19.99
              </div>
              <div className="text-gray-400 text-xs mb-6">/month</div>

              <ul className="space-y-2 mb-6">
                <li className="text-white text-xs flex items-start">
                  <span className="text-[#96EDD6] mr-2">•</span>
                  Alpha Room & Airdrop Radar
                </li>
                <li className="text-white text-xs flex items-start">
                  <span className="text-[#96EDD6] mr-2">•</span>
                  Alerts on Major Market Moves
                </li>
                <li className="text-white text-xs flex items-start">
                  <span className="text-[#96EDD6] mr-2">•</span>
                  AI Portfolio Manager
                </li>
                <li className="text-white text-xs flex items-start">
                  <span className="text-[#96EDD6] mr-2">•</span>
                  Deep Market Analysis
                </li>
                <li className="text-white text-xs flex items-start">
                  <span className="text-[#96EDD6] mr-2">•</span>
                  Airdrop & Whitelist list
                </li>
                <li className="text-white text-xs flex items-start">
                  <span className="text-[#96EDD6] mr-2">•</span>
                  Live Q&A with Project Partners
                </li>
              </ul>

              <Link
                href="/subscribe"
                className="w-full bg-[#96EDD6] text-black py-2 rounded-full text-xs font-bold hover:bg-[#7dd3bd] transition-colors no-underline flex items-center justify-center"
              >
                Get Kumami Pro
              </Link>
            </div>

            {/* Pagination Dots - Desktop */}
            <div className="hidden lg:flex lg:col-span-3 justify-center mt-6 space-x-2">
              {newsData.map((_, index) => (
                <div
                  key={index}
                  onClick={() => handleDotClick(index)}
                  className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-300 transform hover:scale-110 ${
                    currentNewsIndex === index
                      ? 'bg-[#96EDD6] dot-active shadow-lg shadow-[#96EDD6]/50'
                      : 'bg-gray-600 hover:bg-gray-400'
                  }`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendingNews;
