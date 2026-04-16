import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import GlossaryTermView from '@/components/GlossaryTermView'
import { getTermById } from '@/data/glossaryData'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const term = getTermById(id)

  const fallbackTitle = 'Crypto Glossary — Kumami World'
  const fallbackDescription =
    'A comprehensive glossary of crypto and Web3 terms.'
  const fallbackImage = 'https://kumami.world/og-default.png'

  if (!term) {
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      openGraph: {
        title: fallbackTitle,
        description: fallbackDescription,
        url: `https://kumami.world/glossary/${id}`,
        images: [fallbackImage],
      },
      twitter: {
        card: 'summary_large_image',
        title: fallbackTitle,
        description: fallbackDescription,
        images: [fallbackImage],
      },
    }
  }

  const title = `${term.term} — Kumami Glossary`
  const description =
    term.definition.length > 160
      ? `${term.definition.substring(0, 157)}...`
      : term.definition

  return {
    title,
    description,
    openGraph: {
      title: term.term,
      description,
      url: `https://kumami.world/glossary/${id}`,
      images: [fallbackImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: term.term,
      description,
      images: [fallbackImage],
    },
  }
}

export default async function GlossaryDetailPage({ params }: PageProps) {
  const { id } = await params
  return (
    <>
      <GlossaryTermView termId={id} />
      <Footer />
    </>
  )
}
