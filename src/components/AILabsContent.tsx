'use client'

interface FeatureCard {
  image: string
  alt: string
  title: string
  description: string
}

const featureCards: FeatureCard[] = [
  {
    image: '/images/Module.webp',
    alt: 'AI module',
    title: 'Module',
    description:
      'Learn everything about AI here, designed to be practical, easy to understand, and beginner-friendly.',
  },
  {
    image: '/images/Workshop.webp',
    alt: 'AI workshop',
    title: 'Workshop',
    description:
      'Live sessions with our partners where we collaborate to build, test, and improve new AI features together in a simple and hands-on way.',
  },
  {
    image: '/images/Submission.webp',
    alt: 'AI submission',
    title: 'Submission',
    description:
      'Submit your AI project here. Our team, together with several AI incubators, will review and evaluate your project. If selected, we will support and help your project grow further.',
  },
]

export default function AILabsContent() {
  return (
    <section className="w-full bg-[#050608] px-4 py-12 md:py-16">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-start">
          <div className="w-full rounded-xl bg-[#16171b] overflow-hidden border border-white/10">
            <img
              className="w-full aspect-[3/2] object-cover"
              src="/images/ailabs_mainpicture.webp"
              alt="AI Labs"
              loading="lazy"
            />
          </div>

          <div className="text-white">
            <h1 className="text-3xl md:text-5xl font-bold text-[#40e0d0]">
              AI Labs
            </h1>
            <div className="h-1 w-20 bg-[#40e0d0] mt-4 mb-6" />
            <p className="text-gray-300 leading-relaxed text-base md:text-lg">
              Kumami AI Labs is an AI and Web3 innovation hub focused on
              learning, collaboration, and incubation.
            </p>
            <p className="text-gray-300 leading-relaxed text-base md:text-lg mt-4">
              We provide AI learning modules developed with our team and
              ecosystem partners, host hands-on workshops with partners, and
              support innovators through AI and Web3 project submissions for
              mentorship and incubation. By combining artificial intelligence
              with decentralized technologies, Kumami AI Labs empowers builders
              to create scalable, real-world solutions for the next generation of
              the digital economy.
            </p>
          </div>
        </div>

        <div className="mt-10 md:mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {featureCards.map((card) => (
            <div
              key={card.title}
              className="rounded-xl bg-[#16171b] text-white border border-white/10 overflow-hidden flex flex-col"
            >
              <img
                className="w-full aspect-[3/2] object-cover"
                src={card.image}
                alt={card.alt}
                loading="lazy"
              />
              <div className="p-4 md:p-5 flex flex-col flex-grow">
                <h3 className="text-xl font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm md:text-base leading-relaxed text-gray-300">
                  {card.description}
                </p>
                <button
                  type="button"
                  className="mt-auto inline-flex items-center justify-center rounded-lg px-4 py-2 bg-[#22242a] text-gray-500 cursor-not-allowed font-semibold"
                  disabled
                >
                  Coming Soon
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
