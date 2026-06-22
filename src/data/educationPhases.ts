export interface Phase {
  n: number
  slug: string
  level: string
  tag: string
  hex: string
  title: string
  blurb: string
  detail: string
  badge: string
  hours: string
  outcomes: string[]
  chapters: string[]
}

export const PHASES: Phase[] = [
  {
    n: 1,
    slug: 'start-here',
    level: 'LEVEL 01',
    tag: 'Beginner',
    hex: '#5ee9a8',
    title: 'Start Here',
    blurb: 'Get your first crypto safely. No theory yet.',
    detail:
      "You'll go from zero to owning your first Bitcoin — safely. No jargon, no theory dumps. Just the exact, careful steps to pick a trustworthy exchange, lock down your account, and make your first buy without the rookie mistakes that cost people money.",
    badge: 'First Steps',
    hours: '2h 10m',
    outcomes: [
      'Pick a safe, beginner-friendly exchange',
      'Secure your account like a pro',
      'Buy your first crypto with confidence',
      'Know when to move off an exchange',
    ],
    chapters: [
      'How most beginners actually get into crypto',
      'Choosing a safe and beginner-friendly CEX',
      'How to create and secure a CEX account properly',
      'How to deposit money and buy your first crypto',
      'Common mistakes when buying on a CEX',
      'Risks of keeping your crypto on an exchange',
      'Why you should eventually move to a personal wallet',
    ],
  },
  {
    n: 2,
    slug: 'understand',
    level: 'LEVEL 02',
    tag: 'Elementary',
    hex: '#2dd4bf',
    title: 'Understand What You Just Bought',
    blurb: 'Now that you own crypto — understand the technology behind it.',
    detail:
      "You own crypto. Good. Now let's make it click. This phase decodes blockchains, wallets, keys and gas in plain language so the thing in your account stops feeling like magic and starts feeling like something you control.",
    badge: 'Under the Hood',
    hours: '3h 40m',
    outcomes: [
      'Explain blockchain, Bitcoin & Ethereum simply',
      'Tell custodial from non-custodial',
      'Protect your seed phrase & private keys',
      'Set up and use your own wallet',
    ],
    chapters: [
      'What is blockchain',
      'What is Bitcoin',
      'What is Ethereum',
      'What are Layer 1 and Layer 2 blockchains',
      'Coins vs tokens',
      'What are gas fees',
      'What is a crypto wallet',
      'Custodial vs non-custodial',
      'What is a private key and seed phrase',
      'How to set up your first personal wallet',
      'How to read a block explorer',
      'What are stablecoins',
    ],
  },
  {
    n: 3,
    slug: 'learn-to-trade',
    level: 'LEVEL 03',
    tag: 'Intermediate',
    hex: '#56dfe6',
    title: 'Learn to Trade',
    blurb: 'Go deeper on projects, analysis, and making informed decisions.',
    detail:
      'Move past holding one coin. Here you learn to research a project before you risk a dollar — reading whitepapers and tokenomics, spotting scams, understanding DeFi and NFTs, and making your first swap on a DEX.',
    badge: 'Sharp Eye',
    hours: '5h 05m',
    outcomes: [
      'Evaluate a project before buying',
      'Read tokenomics & on-chain data',
      'Recognise scams early',
      'Swap, bridge and stake confidently',
    ],
    chapters: [
      'What are altcoins',
      'How to evaluate a crypto project before buying',
      'How to read a whitepaper',
      'How to check the legitimacy of a project',
      'What is tokenomics',
      'How to read on-chain data',
      'What is DeFi',
      'What are NFTs',
      'What are DAOs',
      'What are smart contracts',
      'Technical analysis basics',
      'How to read candlestick charts',
      'What are funding rates',
      'How to spot a scam',
      'How to bridge assets between chains',
      'How to make your first swap on a DEX',
      'How staking works',
    ],
  },
  {
    n: 4,
    slug: 'investor',
    level: 'LEVEL 04',
    tag: 'Advanced',
    hex: '#a78bfa',
    title: 'Think Like an Investor',
    blurb: 'Stop reacting to price. Start understanding market structure.',
    detail:
      "Stop trading on vibes. This phase rewires how you see the market — cycles, market cap, liquidity, token unlocks and smart money — so you build a thesis and a portfolio instead of chasing green candles.",
    badge: 'Market Mind',
    hours: '3h 55m',
    outcomes: [
      'Read market cycles & sentiment',
      'Use on-chain tools like Dune',
      'Construct a resilient portfolio',
      'Manage risk & avoid liquidation',
    ],
    chapters: [
      'How crypto market cycles work',
      'What is market cap and why it matters more than price',
      'What is TVL',
      'How to use on-chain data',
      'How to follow smart money',
      'How to use Dune Analytics',
      'How token unlocks crash prices',
      'How to read crypto market sentiment',
      'What are liquidations',
      'Portfolio construction',
      'How to not get liquidated',
      'Tax basics',
    ],
  },
  {
    n: 5,
    slug: 'go-deeper',
    level: 'LEVEL 05',
    tag: 'Expert',
    hex: '#f472b6',
    title: 'Go Deeper',
    blurb: 'For those who want to build, earn, or go professional in Web3.',
    detail:
      'For people who want crypto to be more than a portfolio. Smart contracts, oracles, Web3 identity, AI, regulation and DAOs — plus the practical playbook for finding opportunities and building a professional presence in Web3.',
    badge: 'Web3 Native',
    hours: '4h 20m',
    outcomes: [
      'Understand smart contracts & oracles',
      'Navigate regulation & DAOs',
      'Use AI tools as a Web3 pro',
      'Ship something real in Web3',
    ],
    chapters: [
      'How smart contracts work',
      'What are oracles',
      'What is Web3 identity',
      'How AI is changing Web3',
      'How to find opportunities in Web3',
      'Crypto regulation basics',
      'How to participate in a DAO',
      'How to build your Web3 presence',
      'How to use AI tools as a Web3 professional',
      'Advanced DeFi',
      "How to read a crypto fund's thesis",
      'Building in Web3',
    ],
  },
]

export function getPhase(n: number): Phase | undefined {
  return PHASES.find(p => p.n === n)
}
