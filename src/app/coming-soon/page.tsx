import Link from 'next/link';

export const metadata = {
  title: 'Coming Soon — Kumami World',
};

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white text-center px-4">
      <div
        className="w-20 h-20 rounded-2xl mb-8 flex items-center justify-center text-4xl"
        style={{ background: 'linear-gradient(135deg, #96EDD6, #40e0d0)' }}
      >
        🐻
      </div>
      <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#40e0d0' }}>
        Coming Soon
      </h1>
      <p className="text-gray-400 text-lg max-w-md mb-10">
        Kumami Pro is almost here. We&apos;re putting the finishing touches on something great. Stay tuned!
      </p>
      <Link
        href="/"
        className="px-8 py-3 rounded-full font-semibold text-black transition-all hover:scale-105"
        style={{ background: 'linear-gradient(135deg, #96EDD6, #40e0d0)' }}
      >
        Back to Home
      </Link>
    </div>
  );
}
