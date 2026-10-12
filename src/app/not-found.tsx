import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page not found — Kumami World',
  description: 'This page does not exist. Head back to Kumami World.',
  robots: { index: false, follow: true },
};

/** Branded 404 — replaces Next.js's default "This page could not be found." */
export default function NotFound() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{
        background:
          'radial-gradient(circle at 20% 15%, rgba(0,194,199,.18), transparent 45%), radial-gradient(circle at 85% 85%, rgba(94,233,168,.10), transparent 45%), #07111a',
        color: '#f1f7f4',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-kumami-white.png" alt="Kumami World" className="mb-10 h-14 w-auto" />
      <p className="text-sm font-extrabold uppercase tracking-[0.2em]" style={{ color: '#00c2c7' }}>
        404 · Page not found
      </p>
      <h1 className="mt-3 max-w-xl text-3xl font-extrabold leading-tight md:text-5xl">
        This page wandered off the chain.
      </h1>
      <p className="mt-4 max-w-md text-base" style={{ color: '#a9c2b8' }}>
        The link may be old or mistyped. Everything else is right where you left it.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-full px-6 py-3 text-sm font-extrabold"
          style={{ background: '#00c2c7', color: '#06120d' }}
        >
          Go to Kumami World
        </Link>
        <Link
          href="/world/news"
          className="rounded-full px-6 py-3 text-sm font-extrabold"
          style={{ border: '1.5px solid rgba(0,194,199,.5)', color: '#7ff0f2' }}
        >
          Read the latest news
        </Link>
      </div>
    </main>
  );
}
