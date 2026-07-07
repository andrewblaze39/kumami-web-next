/**
 * scripts/seed-courses.ts — Seed the `courses` Firestore collection.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * USAGE (DO NOT RUN unless you intend to write to the shared Firebase project):
 *
 *   # Option 1: using npx tsx (if available)
 *   npx tsx scripts/seed-courses.ts
 *
 *   # Option 2: using ts-node (existing project pattern)
 *   npx ts-node scripts/seed-courses.ts
 *
 *   # Option 3: using node --experimental-strip-types (Node 22+)
 *   node --experimental-strip-types scripts/seed-courses.ts
 *
 *   # Dry run (logs what would be written, no Firestore writes):
 *   npx tsx scripts/seed-courses.ts --dry-run
 *
 *   # Skip phases already in Firestore (safe to re-run):
 *   npx tsx scripts/seed-courses.ts --skip-existing
 *
 *   # Force overwrite all phases:
 *   npx tsx scripts/seed-courses.ts --force
 *
 *   # Point to a different service account key file:
 *   npx tsx scripts/seed-courses.ts --keyfile /path/to/serviceAccount.json
 *
 * PREREQUISITES:
 *   - .env.local must contain FIREBASE_SERVICE_ACCOUNT_JSON (JSON string of the
 *     service account), OR set GOOGLE_APPLICATION_CREDENTIALS to a key file path,
 *     OR pass --keyfile <path>.
 *   - Run from the project root.
 *
 * WHAT IT WRITES:
 *   Collection: courses/{phaseId}  (e.g. courses/phase-1 … courses/phase-5)
 *   Each document:
 *     phase:    number
 *     title:    string
 *     tagline:  string
 *     level:    string
 *     chapters: Array<{ id, title, parts: [{ id, title, type: 'text' }] }>
 *     instructor: undefined (not set — add manually in Firestore console)
 *     faq:      []          (empty — add manually in Firestore console)
 *
 *   Chapters = one per lesson (lesson title = chapter title).
 *   Each chapter has a single text part (placeholder — real content added later).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';

// ── Load .env.local ─────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), '.env.local');
config({ path: envPath });

// ── CLI flags ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const SKIP_EXISTING = args.includes('--skip-existing');
const keyfileIdx = args.indexOf('--keyfile');
const KEYFILE: string | null = keyfileIdx !== -1 ? args[keyfileIdx + 1] : null;

// ── Journey data (inline to avoid import issues in scripts) ──────────────────
// This mirrors src/lib/education/journeyData.ts exactly.

interface Lesson { id: string; title: string }
interface Phase {
  phase: number;
  courseId: string;
  title: string;
  tagline: string;
  level: string;
  approxHours: number;
  badgeLabel: string;
  lessons: Lesson[];
}

const JOURNEY_PHASES: Phase[] = [
  {
    phase: 1, courseId: 'phase-1',
    title: 'START HERE',
    tagline: 'Get your first crypto safely. No theory yet.',
    level: 'Beginner', approxHours: 2, badgeLabel: 'First Steps',
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
    phase: 2, courseId: 'phase-2',
    title: 'UNDERSTAND WHAT YOU JUST BOUGHT',
    tagline: 'Now that you own crypto — understand the technology behind it.',
    level: 'Elementary', approxHours: 3, badgeLabel: 'Blockchain Basics',
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
    phase: 3, courseId: 'phase-3',
    title: 'LEARN TO TRADE',
    tagline: 'Go deeper on projects, analysis, and making informed decisions.',
    level: 'Intermediate', approxHours: 4, badgeLabel: 'Trader Mindset',
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
    phase: 4, courseId: 'phase-4',
    title: 'THINK LIKE AN INVESTOR',
    tagline: 'Stop reacting to price. Start understanding market structure.',
    level: 'Advanced', approxHours: 3, badgeLabel: 'Investor Lens',
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
    phase: 5, courseId: 'phase-5',
    title: 'GO DEEPER',
    tagline: 'For those who want to build, earn, or go professional in Web3.',
    level: 'Expert', approxHours: 3, badgeLabel: 'Web3 Pro',
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
      { id: 'p5-l11', title: "How to read a crypto fund's thesis" },
      { id: 'p5-l12', title: 'Building in Web3' },
      { id: 'p5-l13', title: 'HANDS-ON: Ship something in Web3' },
    ],
  },
];

// ── Firebase Admin init ──────────────────────────────────────────────────────
function initFirebase() {
  if (admin.apps.length > 0) return;

  if (KEYFILE) {
    const serviceAccount = JSON.parse(fs.readFileSync(KEYFILE, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('Initialized Firebase with --keyfile');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('Initialized Firebase with FIREBASE_SERVICE_ACCOUNT_JSON from .env.local');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    console.log('Initialized Firebase with GOOGLE_APPLICATION_CREDENTIALS');
  } else {
    throw new Error(
      'No Firebase credentials found.\n' +
        '  Set FIREBASE_SERVICE_ACCOUNT_JSON in .env.local, or\n' +
        '  set GOOGLE_APPLICATION_CREDENTIALS, or\n' +
        '  pass --keyfile /path/to/serviceAccount.json'
    );
  }
}

// ── Build course doc from phase ──────────────────────────────────────────────
function buildCourseDoc(phase: Phase) {
  return {
    phase: phase.phase,
    title: phase.title,
    tagline: phase.tagline,
    level: phase.level,
    chapters: phase.lessons.map((lesson, i) => ({
      id: `ch-${i + 1}`,
      title: lesson.title,
      parts: [
        {
          id: lesson.id,
          title: lesson.title,
          type: 'text',
          // videoUrl: not set — add manually once video content is ready
        },
      ],
    })),
    // instructor: not seeded — add manually via Firestore console
    faq: [],
    // Seed metadata
    _seededAt: new Date().toISOString(),
    _source: 'seed-courses.ts',
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n── Kumami World Course Seeder ──────────────────────────────');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE WRITE'}`);
  if (FORCE) console.log('Flag: --force (overwrite existing)');
  if (SKIP_EXISTING) console.log('Flag: --skip-existing');
  console.log('');

  if (!DRY_RUN) initFirebase();

  const db = DRY_RUN ? null : admin.firestore();

  let written = 0;
  let skipped = 0;

  for (const phase of JOURNEY_PHASES) {
    const docData = buildCourseDoc(phase);
    const docPath = `courses/${phase.courseId}`;

    if (DRY_RUN) {
      console.log(`[DRY RUN] Would write ${docPath}:`);
      console.log(`  title: "${docData.title}"`);
      console.log(`  chapters: ${docData.chapters.length} (one per lesson)`);
      written++;
      continue;
    }

    const ref = db!.collection('courses').doc(phase.courseId);

    if (SKIP_EXISTING && !FORCE) {
      const snap = await ref.get();
      if (snap.exists) {
        console.log(`SKIP  ${docPath} (already exists; use --force to overwrite)`);
        skipped++;
        continue;
      }
    }

    await ref.set(docData, { merge: !FORCE });
    console.log(`WRITE ${docPath}  (${docData.chapters.length} chapters)`);
    written++;
  }

  console.log('');
  console.log(`── Done ────────────────────────────────────────────────────`);
  console.log(`  Written : ${written}`);
  console.log(`  Skipped : ${skipped}`);
  if (DRY_RUN) {
    console.log('\n  This was a dry run. To write for real, omit --dry-run.');
  }
  console.log('');
}

main().catch(err => {
  console.error('\nSeeder error:', err.message);
  process.exit(1);
});
