'use client';

import { useState, useEffect, useRef } from 'react';

const NumbersSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [usersCount, setUsersCount] = useState(0);
  const [partnersCount, setPartnersCount] = useState(0);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      const element = document.getElementById('numbers-section');
      if (element) {
        const elementTop = element.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        if (elementTop < windowHeight - 100) {
          setIsVisible(true);
          window.removeEventListener('scroll', handleScroll);
        }
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!isVisible || hasAnimatedRef.current) return;

    hasAnimatedRef.current = true;

    const duration = 2000;
    const targetUsers = 5000;
    const targetPartners = 40;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeOut = 1 - Math.pow(1 - progress, 3);

      setUsersCount(Math.round(targetUsers * easeOut));
      setPartnersCount(Math.round(targetPartners * easeOut));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible]);

  return (
    <section
      id="numbers-section"
      className="py-16 relative overflow-hidden"
      style={{
        background: 'transparent'
      }}
    >
      {/* Background overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(5px)'
        }}
      ></div>

      <div className="container mx-auto px-4 relative z-10">
        <h2
          style={{
            color: '#40e0d0',
            fontWeight: 'bold',
            fontSize: '2.5rem',
            marginBottom: '2rem',
            textAlign: 'center',
          }}
        >
          Building The Future of Web 3 With
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Total Users Card */}
          <div
            className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-8 text-center transform transition-all duration-500 hover:scale-105 hover:shadow-2xl"
            style={{
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div className="text-5xl font-bold text-[#00C2C7] mb-3">
              <span className="countup">{usersCount.toLocaleString()}+</span>
            </div>
            <p className="text-xl text-gray-300">Total Users</p>
          </div>

          {/* Partners Card */}
          <div
            className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-8 text-center transform transition-all duration-500 hover:scale-105 hover:shadow-2xl"
            style={{
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div className="text-5xl font-bold text-[#00C2C7] mb-3">
              <span className="countup">{partnersCount}+</span>
            </div>
            <p className="text-xl text-gray-300">Partners</p>
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes countUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .countup {
          display: inline-block;
          animation: countUp 1s ease-out forwards;
        }
      `}</style>
    </section>
  );
};

export default NumbersSection;
