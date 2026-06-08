import type { Metadata } from 'next'
import AllEducationArticles from '@/components/AllEducationArticles'

export const metadata: Metadata = {
  title: 'All Lessons — Kumami Education',
  description: 'Browse all Web3 and crypto education lessons on Kumami World.',
}

export default function AllEducationPage() {
  return <AllEducationArticles />
}
