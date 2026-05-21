import Link from 'next/link';

const ecosystemItems = [
  {
    icon: '/newspaper (square).png',
    title: 'News Portal',
    description: 'Stay Informed',
    path: '/news'
  },
  {
    icon: '/games (s).png',
    title: 'Games',
    description: 'Play & Earn',
    path: '/games'
  },
  {
    icon: '/education (s).png',
    title: 'Education',
    description: 'Learn & Grow',
    path: '/education'
  },
  {
    icon: '/ai labs (s).png',
    title: 'AI Labs',
    description: 'Innovate & Create',
    path: '/ai-labs'
  },
  {
    icon: '/stacking (s).png',
    title: 'Staking',
    description: 'Earn Rewards',
    path: '/staking'
  },
  {
    icon: '/gaming guild (s).png',
    title: 'Gaming Guild',
    description: 'Join & Compete',
    path: '/gaming-guild'
  }
];

export default function EcosystemSection() {
  return (
    <section className="dg-service2 pt130 pb-20" id="ecosystem" style={{ background: '#000' }}>
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex flex-wrap justify-center">
          <div className="lg:w-2/3 w-full">
            <div className="common-heading-2 text-center">
              <h2 className="mb30">Kumami World Ecosystem</h2>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 mt-8">
          {ecosystemItems.map((item, index) => (
            <div key={index}>
              <Link href={item.path} className="no-underline block">
                <div className="flex flex-col items-center text-center p-4 rounded-lg cursor-pointer transition-all duration-300 hover:-translate-y-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(0,194,199,0.1)]">
                  <img src={item.icon} alt={item.title} className="mb-3" style={{ height: '44px', width: 'auto' }} />
                  <p className="text-white font-semibold text-sm mb-1">{item.title}</p>
                  <p className="text-white/70 text-xs">{item.description}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
