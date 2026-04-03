import Link from 'next/link'

interface PageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = params
  
  return {
    title: `News Article ${id} — Kumami World`,
    description: 'Latest cryptocurrency and Web3 news from Kumami World',
  }
}

export default function NewsDetailPage({ params }: PageProps) {
  const { id } = params
  
  // Mock data for now
  const mockArticle = {
    id,
    title: 'Bitcoin Reaches New Heights',
    summary: 'Bitcoin breaks through resistance levels as institutional adoption continues.',
    content: `
      <p>Bitcoin has achieved a significant milestone today, breaking through key resistance levels that have been holding it back for several weeks. This breakthrough comes as institutional adoption continues to accelerate, with major financial institutions announcing new crypto-related services.</p>
      
      <p>The cryptocurrency market has been buzzing with excitement as Bitcoin's price surged past previous barriers, reaching new heights that many analysts had predicted but few expected to see so soon. This movement has been attributed to a combination of factors including increased institutional interest, favorable regulatory developments, and growing mainstream acceptance.</p>
      
      <p>Market experts suggest that this could be the beginning of a new bull run, with many investors now looking toward the next resistance levels. The technical indicators are showing strong momentum, and the trading volume has increased significantly, confirming the strength of this upward movement.</p>
      
      <p>As the cryptocurrency market continues to mature, we're seeing more sophisticated financial products being developed around Bitcoin and other digital assets. This institutional participation is bringing much-needed liquidity and credibility to the market.</p>
    `,
    category: 'Bitcoin',
    publishedAt: new Date('2024-01-15'),
    imageUrl: '/trendingnews.png'
  }
  
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <nav className="breadcrumb mb-8">
          <Link href="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-separator"> / </span>
          <Link href="/news" className="breadcrumb-link">News</Link>
          <span className="breadcrumb-separator"> / </span>
          <span className="breadcrumb-current">{mockArticle.title}</span>
        </nav>
        
        <article className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-4">{mockArticle.title}</h1>
            <div className="flex items-center text-gray-400 text-sm">
              <time>{mockArticle.publishedAt.toLocaleDateString()}</time>
              <span className="mx-2">•</span>
              <span className="text-cyan-400">{mockArticle.category}</span>
            </div>
          </header>
          
          {mockArticle.imageUrl && (
            <div className="mb-8">
              <img 
                src={mockArticle.imageUrl} 
                alt={mockArticle.title}
                className="w-full h-auto rounded-lg"
              />
            </div>
          )}
          
          <div className="prose prose-invert max-w-none">
            <div 
              dangerouslySetInnerHTML={{ __html: mockArticle.content }}
              className="text-gray-300 leading-relaxed"
            />
          </div>
        </article>
      </div>
    </div>
  )
}
