'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { getTermsByLetter, getAlphabetLetters } from '@/data/glossaryData'

export default function GlossaryGrid() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null)

  const alphabetLetters = useMemo(() => getAlphabetLetters(), [])
  const termsByLetter = useMemo(() => getTermsByLetter(), [])

  // Filter terms based on search and selected letter
  const filteredTerms = useMemo(() => {
    if (!searchTerm && !selectedLetter) return termsByLetter

    const filtered: Record<string, typeof termsByLetter[string]> = {}
    Object.keys(termsByLetter).forEach((letter) => {
      const terms = termsByLetter[letter].filter((term) => {
        const matchesSearch =
          !searchTerm ||
          term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
          term.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
          term.category.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesLetter = !selectedLetter || letter === selectedLetter
        return matchesSearch && matchesLetter
      })
      if (terms.length > 0) {
        filtered[letter] = terms
      }
    })
    return filtered
  }, [searchTerm, selectedLetter, termsByLetter])

  const handleLetterClick = (letter: string) => {
    if (selectedLetter === letter) {
      setSelectedLetter(null)
    } else {
      setSelectedLetter(letter)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1a1b] to-[#0d2425] px-4 pb-8 pt-2 text-gray-200">
      {/* Header Section */}
      <div className="mx-auto mb-4 max-w-[800px] pb-4 pt-2 text-center">
        <h1 className="mb-2 text-4xl font-bold uppercase tracking-wider text-[#96EDD6]">
          Glossary
        </h1>
        <p className="mb-8 text-lg text-[#aafafc] opacity-90">
          Comprehensive Web3 and Cryptocurrency Terms Guide
        </p>

        {/* Search Bar */}
        <div className="mx-auto flex max-w-[600px] items-center gap-3">
          <div className="relative flex flex-1 items-center">
            <Search className="pointer-events-none absolute left-4 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search for terms, definitions, or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border-2 border-[#96EDD6]/20 bg-[#102425]/80 px-10 py-2 text-sm text-gray-200 placeholder:text-gray-500 transition-all duration-300 focus:border-[#96EDD6] focus:outline-none focus:shadow-[0_0_0_3px_rgba(150,237,214,0.1)]"
            />
            {searchTerm && (
              <button
                className="absolute right-4 p-1 text-gray-500 transition-colors duration-200 hover:text-gray-200"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button className="whitespace-nowrap rounded-full bg-[#96EDD6] px-5 py-2 text-sm font-semibold text-[#0a1a1b] transition-all duration-300 hover:bg-[#7dd4c0] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(150,237,214,0.3)]">
            Search
          </button>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Click on letters below to jump to that section
        </p>
      </div>

      {/* Alphabet Navigation */}
      <div className="mx-auto my-2 flex flex-wrap justify-center gap-1 overflow-x-auto md:flex-nowrap">
        {alphabetLetters.map((letter) => (
          <button
            key={letter}
            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-sm font-semibold transition-all duration-200 ${
              selectedLetter === letter
                ? 'bg-[#96EDD6] text-[#0a1a1b]'
                : 'bg-transparent text-[#aafafc] hover:bg-[#96EDD6]/15 hover:text-[#96EDD6]'
            } ${!termsByLetter[letter] ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}`}
            onClick={() => handleLetterClick(letter)}
            disabled={!termsByLetter[letter]}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Terms List */}
      <div className="mx-auto max-w-[1000px]">
        {Object.keys(filteredTerms).length === 0 ? (
          <div className="px-8 py-16 text-center">
            <p className="mb-6 text-lg text-gray-400">
              No terms found matching your search.
            </p>
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedLetter(null)
              }}
              className="cursor-pointer rounded-full border-2 border-[#96EDD6] bg-transparent px-6 py-3 font-semibold text-[#96EDD6] transition-all duration-300 hover:bg-[#96EDD6] hover:text-[#0a1a1b]"
            >
              Clear filters
            </button>
          </div>
        ) : (
          Object.keys(filteredTerms)
            .sort()
            .map((letter) => (
              <div key={letter} id={`section-${letter}`} className="mb-6">
                <h2 className="mb-3 border-b-2 border-[#96EDD6]/20 pb-1 text-4xl font-bold text-[#96EDD6]">
                  {letter}
                </h2>
                <div className="grid gap-2">
                  {filteredTerms[letter].map((term) => (
                    <Link
                      key={term.id}
                      href={`/glossary/${term.id}`}
                      className="block rounded-lg border border-[#96EDD6]/10 bg-[#102425]/60 px-4 py-3 text-inherit no-underline transition-all duration-300 hover:translate-x-1 hover:border-[#96EDD6]/30 hover:bg-[#102425]/90 hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="m-0 text-lg font-semibold text-gray-200">
                          {term.term}
                        </h3>
                        <span className="rounded-full bg-[#96EDD6]/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-[#96EDD6]">
                          {term.category}
                        </span>
                      </div>
                      <p className="m-0 mb-3 text-[0.9375rem] leading-relaxed text-gray-400">
                        {term.definition}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}
