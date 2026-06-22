/**
 * Seeds empty "coming soon" articles for all chapters that don't exist in Firestore yet.
 * Uses educationPhases.ts as the source of chapter names.
 *
 * Usage:
 *   npx ts-node scripts/seedEmptyChapters.ts --dry-run
 *   npx ts-node scripts/seedEmptyChapters.ts
 *   npx ts-node scripts/seedEmptyChapters.ts --keyfile prod.json
 */

import admin from 'firebase-admin'
import path from 'path'
import fs from 'fs'
import { config } from 'dotenv'

const envPath = path.resolve(import.meta.dirname ?? process.cwd(), '../.env.local')
config({ path: envPath })

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const keyfileIdx = args.indexOf('--keyfile')
const KEYFILE: string | null = keyfileIdx !== -1 ? args[keyfileIdx + 1] : null

function initFirebase() {
  if (KEYFILE) {
    const sa = JSON.parse(fs.readFileSync(KEYFILE, 'utf8'))
    admin.initializeApp({ credential: admin.credential.cert(sa) })
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    admin.initializeApp({ credential: admin.credential.cert(sa) })
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() })
  } else {
    throw new Error('No credentials found.')
  }
}

// Chapter data from educationPhases.ts (copied here to avoid TS import issues)
const LEVELS: { level: number; chapters: string[] }[] = [
  {
    level: 1,
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
    level: 2,
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
    level: 3,
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
    level: 4,
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
    level: 5,
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

async function seed() {
  if (!DRY_RUN) initFirebase()
  const db = DRY_RUN ? null : admin.firestore()
  const col = db?.collection('education_articles')

  // Fetch all existing articles to check what already exists
  const existing = new Set<string>()
  if (!DRY_RUN && col) {
    const snap = await col.get()
    snap.docs.forEach(d => {
      const data = d.data()
      const lvl = typeof data.level === 'number' ? data.level : null
      const ci = typeof data.chapterIndex === 'number' ? data.chapterIndex : null
      if (lvl !== null && ci !== null) {
        existing.add(`${lvl}-${ci}`)
      }
    })
  }

  let written = 0
  let skipped = 0

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Seeding empty chapters...`)
  console.log('─'.repeat(60))

  for (const lv of LEVELS) {
    for (let ci = 0; ci < lv.chapters.length; ci++) {
      const key = `${lv.level}-${ci}`
      const label = `[L${lv.level} Ch${ci}] ${lv.chapters[ci]}`

      if (existing.has(key)) {
        console.log(`  SKIP (exists): ${label}`)
        skipped++
        continue
      }

      if (DRY_RUN) {
        console.log(`  ✓ WOULD WRITE: ${label}`)
        written++
        continue
      }

      try {
        await col!.add({
          title: lv.chapters[ci],
          level: lv.level,
          chapterIndex: ci,
          author: 'Kumami Team',
          status: 'published',
          comingSoon: true,
          blurb: '',
          description: '',
          minutes: 0,
          featured: false,
          sections: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        console.log(`  ✓ WRITTEN: ${label}`)
        written++
      } catch (err) {
        console.error(`  ✗ ERROR: ${label}`, err)
      }
    }
  }

  console.log('─'.repeat(60))
  console.log(`Done. Written: ${written} | Skipped: ${skipped}`)
}

seed().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
