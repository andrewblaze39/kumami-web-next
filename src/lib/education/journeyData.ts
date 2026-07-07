/**
 * src/lib/education/journeyData.ts
 *
 * Static journey data for the 5-phase Kumami World learning path.
 * Lesson titles are copied VERBATIM from the PM doc
 * (/frankieone/plans/2026-07-05-kumami-pm-requirements-reference.txt lines 1335-1409).
 *
 * This module is safe to import from both server and client components.
 * It is intentionally NOT server-only because the seed script and client
 * components (JourneyPath) both need it.
 */

// ---------- Types ----------

export interface JourneyLesson {
  /** Slug-friendly id, e.g. "phase-1-lesson-3" */
  id: string;
  /** Verbatim lesson title from PM doc */
  title: string;
}

export interface JourneyPhase {
  /** 1-based phase number */
  phase: number;
  /** Firestore document id for the courses collection, e.g. "phase-1" */
  courseId: string;
  /** Verbatim phase title from PM doc */
  title: string;
  /** Tagline shown under the phase title (from PM doc) */
  tagline: string;
  /** Level label */
  level: 'Beginner' | 'Elementary' | 'Intermediate' | 'Advanced' | 'Expert';
  /** Approximate hours (based on lesson count × ~12 min avg) */
  approxHours: number;
  /** Badge label earned on completion */
  badgeLabel: string;
  /** Ordered list of lessons */
  lessons: JourneyLesson[];
}

// ---------- Data ----------

export const JOURNEY_PHASES: JourneyPhase[] = [
  {
    phase: 1,
    courseId: 'phase-1',
    title: 'START HERE',
    tagline: 'Get your first crypto safely. No theory yet.',
    level: 'Beginner',
    approxHours: 2,
    badgeLabel: 'First Steps',
    lessons: [
      { id: 'p1-l1', title: 'How most beginners actually get into crypto' },
      { id: 'p1-l2', title: 'Choosing a safe and beginner-friendly CEX' },
      { id: 'p1-l3', title: 'How to create and secure a CEX account properly' },
      { id: 'p1-l4', title: 'How to deposit money and buy your first crypto' },
      { id: 'p1-l5', title: 'Common mistakes when buying on a CEX' },
      { id: 'p1-l6', title: 'Risks of keeping your crypto on an exchange' },
      { id: 'p1-l7', title: 'Why you should eventually move to a personal wallet' },
      { id: 'p1-l8', title: 'HANDS-ON: Buy your first Bitcoin' },
    ],
  },
  {
    phase: 2,
    courseId: 'phase-2',
    title: 'UNDERSTAND WHAT YOU JUST BOUGHT',
    tagline: 'Now that you own crypto — understand the technology behind it.',
    level: 'Elementary',
    approxHours: 3,
    badgeLabel: 'Blockchain Basics',
    lessons: [
      { id: 'p2-l1', title: 'What is blockchain' },
      { id: 'p2-l2', title: 'What is Bitcoin' },
      { id: 'p2-l3', title: 'What is Ethereum' },
      { id: 'p2-l4', title: 'What are Layer 1 and Layer 2 blockchains' },
      { id: 'p2-l5', title: 'Coins vs tokens' },
      { id: 'p2-l6', title: 'What are gas fees' },
      { id: 'p2-l7', title: 'What is a crypto wallet' },
      { id: 'p2-l8', title: 'Custodial vs non-custodial' },
      { id: 'p2-l9', title: 'What is a private key and seed phrase' },
      { id: 'p2-l10', title: 'How to set up your first personal wallet' },
      { id: 'p2-l11', title: 'How to read a block explorer' },
      { id: 'p2-l12', title: 'What are stablecoins' },
      { id: 'p2-l13', title: 'HANDS-ON: Move your Bitcoin to your own wallet' },
    ],
  },
  {
    phase: 3,
    courseId: 'phase-3',
    title: 'LEARN TO TRADE',
    tagline: 'Go deeper on projects, analysis, and making informed decisions.',
    level: 'Intermediate',
    approxHours: 4,
    badgeLabel: 'Trader Mindset',
    lessons: [
      { id: 'p3-l1', title: 'What are altcoins' },
      { id: 'p3-l2', title: 'How to evaluate a crypto project before buying' },
      { id: 'p3-l3', title: 'How to read a whitepaper' },
      { id: 'p3-l4', title: 'How to check the legitimacy of a project' },
      { id: 'p3-l5', title: 'What is tokenomics' },
      { id: 'p3-l6', title: 'How to read on-chain data' },
      { id: 'p3-l7', title: 'What is DeFi' },
      { id: 'p3-l8', title: 'What are NFTs' },
      { id: 'p3-l9', title: 'What are DAOs' },
      { id: 'p3-l10', title: 'What are smart contracts' },
      { id: 'p3-l11', title: 'Technical analysis basics' },
      { id: 'p3-l12', title: 'How to read candlestick charts' },
      { id: 'p3-l13', title: 'What are funding rates' },
      { id: 'p3-l14', title: 'How to spot a scam' },
      { id: 'p3-l15', title: 'How to bridge assets between chains' },
      { id: 'p3-l16', title: 'How to make your first swap on a DEX' },
      { id: 'p3-l17', title: 'How staking works' },
      { id: 'p3-l18', title: 'HANDS-ON: Research and buy your first altcoin' },
    ],
  },
  {
    phase: 4,
    courseId: 'phase-4',
    title: 'THINK LIKE AN INVESTOR',
    tagline: 'Stop reacting to price. Start understanding market structure.',
    level: 'Advanced',
    approxHours: 3,
    badgeLabel: 'Investor Lens',
    lessons: [
      { id: 'p4-l1', title: 'How crypto market cycles work' },
      { id: 'p4-l2', title: 'What is market cap and why it matters more than price' },
      { id: 'p4-l3', title: 'What is TVL' },
      { id: 'p4-l4', title: 'How to use on-chain data' },
      { id: 'p4-l5', title: 'How to follow smart money' },
      { id: 'p4-l6', title: 'How to use Dune Analytics' },
      { id: 'p4-l7', title: 'How token unlocks crash prices' },
      { id: 'p4-l8', title: 'How to read crypto market sentiment' },
      { id: 'p4-l9', title: 'What are liquidations' },
      { id: 'p4-l10', title: 'Portfolio construction' },
      { id: 'p4-l11', title: 'How to not get liquidated' },
      { id: 'p4-l12', title: 'Tax basics' },
      { id: 'p4-l13', title: 'HANDS-ON: Build your first investment thesis' },
    ],
  },
  {
    phase: 5,
    courseId: 'phase-5',
    title: 'GO DEEPER',
    tagline: 'For those who want to build, earn, or go professional in Web3.',
    level: 'Expert',
    approxHours: 3,
    badgeLabel: 'Web3 Pro',
    lessons: [
      { id: 'p5-l1', title: 'How smart contracts work' },
      { id: 'p5-l2', title: 'What are oracles' },
      { id: 'p5-l3', title: 'What is Web3 identity' },
      { id: 'p5-l4', title: 'How AI is changing Web3' },
      { id: 'p5-l5', title: 'How to find opportunities in Web3' },
      { id: 'p5-l6', title: 'Crypto regulation basics' },
      { id: 'p5-l7', title: 'How to participate in a DAO' },
      { id: 'p5-l8', title: 'How to build your Web3 presence' },
      { id: 'p5-l9', title: 'How to use AI tools as a Web3 professional' },
      { id: 'p5-l10', title: 'Advanced DeFi' },
      { id: 'p5-l11', title: 'How to read a crypto fund\'s thesis' },
      { id: 'p5-l12', title: 'Building in Web3' },
      { id: 'p5-l13', title: 'HANDS-ON: Ship something in Web3' },
    ],
  },
];

// ---------- Derived helpers ----------

/** Total lesson count across all phases. */
export const TOTAL_LESSONS = JOURNEY_PHASES.reduce((sum, p) => sum + p.lessons.length, 0);

/** Look up a phase by its courseId (e.g. "phase-1"). Returns undefined if not found. */
export function getPhaseById(courseId: string): JourneyPhase | undefined {
  return JOURNEY_PHASES.find(p => p.courseId === courseId);
}
