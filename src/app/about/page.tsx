import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <Link href="/" className="back-link">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mt-4">About Kumami World</h1>
        </header>
        
        <main className="max-w-4xl mx-auto">
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
            <p className="text-gray-300 leading-relaxed">
              Kumami World is a comprehensive Web3 ecosystem that brings together crypto intelligence, 
              education, and community in one seamless platform. We make Web3 accessible to everyone 
              through innovative tools and real-time insights.
            </p>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">What We Offer</h2>
            <ul className="text-gray-300 space-y-2">
              <li>• Real-time crypto news and analysis</li>
              <li>• AI-powered research and insights</li>
              <li>• Educational resources for all skill levels</li>
              <li>• Interactive Web3 games</li>
              <li>• Community-driven platform</li>
            </ul>
          </section>
        </main>
      </div>
    </div>
  )
}
