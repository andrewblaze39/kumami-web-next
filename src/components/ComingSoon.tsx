'use client'

import Link from 'next/link'

interface ComingSoonProps {
  pageName: string
}

export default function ComingSoon({ pageName }: ComingSoonProps) {
  return (
    <section className="w-full bg-[#050608] px-4 py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-xl bg-[#16171b] border border-white/10 text-white p-6 md:p-10 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-[#40e0d0]">
            Coming Soon
          </h1>
          <p className="mt-3 text-sm md:text-base leading-relaxed text-gray-300">
            We&apos;re working hard to bring you something amazing. Stay tuned!
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 bg-[#22242a] hover:bg-[#1f2025] transition-colors duration-150 text-[#40e0d0] font-semibold no-underline hover:no-underline"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
