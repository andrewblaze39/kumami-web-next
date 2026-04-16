'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getTermById, getRelatedTerms } from '@/data/glossaryData'

interface GlossaryTermViewProps {
  termId: string
}

export default function GlossaryTermView({ termId }: GlossaryTermViewProps) {
  const term = getTermById(termId)

  if (!term) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1a1b] to-[#0d2425] px-4 pb-8 pt-2 text-gray-200">
        <div className="mx-auto max-w-[800px] pb-4 pt-2 text-center">
          <h1 className="mb-2 text-4xl font-bold uppercase tracking-wider text-[#96EDD6]">
            Term Not Found
          </h1>
          <p className="mb-8 text-lg text-[#aafafc] opacity-90">
            The term you&apos;re looking for doesn&apos;t exist in our glossary.
          </p>
          <Link
            href="/glossary"
            className="mt-6 inline-block font-medium text-[#96EDD6] no-underline transition-colors duration-200 hover:text-[#aafafc]"
          >
            &larr; Back to Glossary
          </Link>
        </div>
      </div>
    )
  }

  const relatedTerms = getRelatedTerms(termId, 5)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1a1b] to-[#0d2425] px-4 pb-8 pt-2 text-gray-200">
      {/* Breadcrumb */}
      <div className="mx-auto mb-8 flex max-w-[1200px] flex-wrap items-center gap-2 text-sm text-gray-500">
        <Link
          href="/education"
          className="text-[#96EDD6] no-underline transition-colors duration-200 hover:text-[#aafafc]"
        >
          Education
        </Link>
        <span>/</span>
        <Link
          href="/glossary"
          className="text-[#96EDD6] no-underline transition-colors duration-200 hover:text-[#aafafc]"
        >
          Glossary
        </Link>
        <span>/</span>
        <span className="font-medium text-gray-200">{term.term}</span>
      </div>

      <div className="mx-auto grid max-w-[1200px] gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main Content */}
        <div>
          <div className="rounded-2xl border border-[#96EDD6]/10 bg-[#102425]/60 p-8 md:p-6">
            {/* Header */}
            <div className="mb-8 border-b-2 border-[#96EDD6]/20 pb-6">
              <span className="mb-4 inline-block rounded-full bg-[#96EDD6]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#96EDD6]">
                {term.category}
              </span>
              <h1 className="m-0 text-[2rem] font-bold leading-snug text-gray-200 md:text-2xl">
                {term.term}
              </h1>
            </div>

            {/* Definition */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-[#96EDD6]">
                Definition
              </h2>
              <p className="text-[1.0625rem] leading-relaxed text-gray-300">
                {term.definition}
              </p>
            </div>

            {/* Navigation */}
            <div className="mt-8 border-t border-[#96EDD6]/10 pt-6">
              <Link
                href="/glossary"
                className="inline-flex items-center gap-2 font-medium text-[#96EDD6] no-underline transition-colors duration-200 hover:text-[#aafafc]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Glossary
              </Link>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Related Terms */}
          {relatedTerms.length > 0 && (
            <div className="rounded-xl border border-[#96EDD6]/10 bg-[#102425]/60 p-6">
              <h3 className="mb-4 border-b border-[#96EDD6]/20 pb-3 text-base font-semibold text-[#96EDD6]">
                Related Terms
              </h3>
              <div className="flex flex-col gap-2">
                {relatedTerms.map((related) => (
                  <Link
                    key={related.id}
                    href={`/glossary/${related.id}`}
                    className="flex items-center justify-between rounded-lg bg-[#96EDD6]/5 p-3 text-gray-200 no-underline transition-all duration-200 hover:translate-x-1 hover:bg-[#96EDD6]/10"
                  >
                    <span className="text-sm font-medium">
                      {related.term}
                    </span>
                    <ArrowRight className="h-4 w-4 text-[#96EDD6]" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          <div className="rounded-xl border border-[#96EDD6]/10 bg-[#102425]/60 p-6">
            <h3 className="mb-4 border-b border-[#96EDD6]/20 pb-3 text-base font-semibold text-[#96EDD6]">
              Categories
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#96EDD6]/10 px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-[#96EDD6]">
                {term.category}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
