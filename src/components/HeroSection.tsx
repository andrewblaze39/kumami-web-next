import Image from 'next/image'
import Link from 'next/link'

export default function HeroSection() {
  return (
    <section className="hero-section">
      <div className="hero-inner">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center">
            <div className="hero-content text-center">
              <div className="hero-text">
                <div className="hero-logo">
                  <Image 
                    src="/logo-kumami-white.png" 
                    alt="Kumami Logo" 
                    className="kumami-logo"
                    width={200}
                    height={60}
                  />
                </div>
                <h1 className="hero-main-title">
                  <span className="gradient-text">Where Web3</span>
                  <span className="white-text"> Finally makes sense</span>
                </h1>
                <p className="hero-description">
                  Access real-time news, AI research, crypto insight, education, interactive games and all related to Web3 in one seamless platform
                </p>
                <div className="hero-buttons">
                  <Link href="/about" className="btn-outline">Learn More</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
