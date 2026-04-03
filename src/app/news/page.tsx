import Link from 'next/link'

export const metadata = {
  title: 'Crypto News — Kumami World',
  description: 'Latest cryptocurrency and Web3 news from Kumami World',
}

export default function NewsPage() {
  // Mock data for now - we'll connect to Firebase later
  const mockArticles = [
    {
      id: '1',
      title: 'Bitcoin Reaches New Heights',
      summary: 'Bitcoin breaks through resistance levels as institutional adoption continues.',
      category: 'Bitcoin',
      publishedAt: new Date('2024-01-15'),
      imageUrl: '/trendingnews.png'
    },
    {
      id: '2',
      title: 'Ethereum 2.0 Update Complete',
      summary: 'The latest Ethereum upgrade brings significant improvements to scalability.',
      category: 'Ethereum',
      publishedAt: new Date('2024-01-14'),
      imageUrl: '/trendingnews.png'
    },
    {
      id: '3',
      title: 'DeFi Protocols See Record Growth',
      summary: 'Decentralized finance platforms experience unprecedented user adoption.',
      category: 'DeFi',
      publishedAt: new Date('2024-01-13'),
      imageUrl: '/trendingnews.png'
    }
  ]
  
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <nav className="breadcrumb mb-4">
            <Link href="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-separator"> / </span>
            <span className="breadcrumb-current">News</span>
          </nav>
          <h1 className="text-4xl font-bold mb-4">Latest News</h1>
          <p className="text-gray-400">Stay updated with the latest developments in crypto and Web3</p>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockArticles.map((article) => (
            <Link 
              key={article.id} 
              href={`/news/${article.id}`}
              className="block bg-gray-900 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors"
            >
              <article>
                {article.imageUrl && (
                  <img 
                    src={article.imageUrl} 
                    alt={article.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-6">
                  <div className="flex items-center text-gray-400 text-sm mb-2">
                    <time>{article.publishedAt.toLocaleDateString()}</time>
                    {article.category && (
                      <>
                        <span className="mx-2">•</span>
                        <span className="text-cyan-400">{article.category}</span>
                      </>
                    )}
                  </div>
                  <h2 className="text-xl font-semibold mb-2 line-clamp-2">{article.title}</h2>
                  <p className="text-gray-400 line-clamp-3">{article.summary}</p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
