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
    <section className="dg-service2 pt130" id="ecosystem" style={{ background: '#000', paddingBottom: '20px' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="common-heading-2 text-center">
              <h2 className="mb30">Kumami World Ecosystem</h2>
            </div>
          </div>
        </div>
        <div className="row upset ovr-bg1 ho-gdnt">
          {ecosystemItems.map((item, index) => (
            <div key={index} className="col-lg-2 col-sm-6 mt30">
              <Link href={item.path} className="ecosystem-link">
                <div className="s-block up-hor ovr-base">
                  <div className="nn-card-set">
                    <div className="s-card-icon">
                      <img src={item.icon} alt={item.title} className="img-fluid" />
                    </div>
                    <h4>{item.title}</h4>
                    <p>{item.description}</p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
