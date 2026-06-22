/**
 * Education Articles Seeder
 * Usage:
 *   npx ts-node scripts/seedEducation.ts
 *   npx ts-node scripts/seedEducation.ts --dry-run
 *   npx ts-node scripts/seedEducation.ts --level 1
 *   npx ts-node scripts/seedEducation.ts --force
 *   npx ts-node scripts/seedEducation.ts --keyfile /path/to/serviceAccount.json
 */

import admin from 'firebase-admin'
import path from 'path'
import fs from 'fs'
import { config } from 'dotenv'

// Load .env.local
const envPath = path.resolve(import.meta.dirname ?? process.cwd(), '../.env.local')
config({ path: envPath })

// ── CLI flags ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FORCE   = args.includes('--force')
const levelIdx = args.indexOf('--level')
const LEVEL_FILTER: number | null = levelIdx !== -1 ? parseInt(args[levelIdx + 1], 10) : null
const keyfileIdx = args.indexOf('--keyfile')
const KEYFILE: string | null = keyfileIdx !== -1 ? args[keyfileIdx + 1] : null

// ── Firebase Admin init ──────────────────────────────────────────────────────
function initFirebase() {
  if (KEYFILE) {
    const serviceAccount = JSON.parse(fs.readFileSync(KEYFILE, 'utf8'))
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() })
  } else {
    throw new Error(
      'No credentials found. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS in .env.local, or pass --keyfile <path>.'
    )
  }
}

// ── Types ────────────────────────────────────────────────────────────────────
interface ContentBlock {
  type: 'paragraph' | 'image' | 'youtube'
  text?: string
  src?: string
  alt?: string
  videoId?: string
  title?: string
}

interface Section {
  title: string
  content: ContentBlock[]
}

interface ArticleData {
  title: string
  level: number
  chapterIndex: number
  blurb: string
  minutes?: number   // computed at runtime from word count
  featured: boolean
  description: string
  author: string
  status: 'published'
  sections: Section[]
}

// ── Helper ───────────────────────────────────────────────────────────────────
function para(text: string): ContentBlock {
  return { type: 'paragraph', text }
}

function estimateMinutes(sections: Section[]): number {
  let words = 0
  for (const s of sections) {
    words += s.title.split(/\s+/).length
    for (const c of s.content) {
      if (c.text) words += c.text.split(/\s+/).length
    }
  }
  return Math.max(1, Math.round(words / 200))
}

// ── ARTICLE DATA ─────────────────────────────────────────────────────────────
// Phase 1 — Level 1 (7 chapters, chapterIndex 0-6)

const phase1chapter0: ArticleData = {
  title: 'How Most Beginners Actually Get Into Crypto',
  level: 1,
  chapterIndex: 0,
  blurb: 'Most people enter crypto through FOMO, news headlines, or tips from friends — and lose money because they act on someone else\'s conviction instead of their own understanding. This chapter shows you the three types of beginners and the right mindset before you spend a dollar.',
  description: 'Many people enter crypto through hype, FOMO, or tips — and lose money because of it.',
  featured: true,
  author: 'Kumami Team',
  status: 'published',
  sections: [
    {
      title: 'Key Takeaways',
      content: [
        para('• Many people enter crypto through hype, FOMO, or tips — and lose money because of it\n• The safest and most common entry point for beginners is a Centralized Exchange (CEX)\n• Understanding why you\'re getting in matters more than when you get in\n• The first step isn\'t buying — it\'s choosing the right platform and understanding what you\'re doing\n• You don\'t need much to start — $20–50 is enough to learn everything Phase 1 teaches'),
      ],
    },
    {
      title: 'How It Usually Starts',
      content: [
        para('Be honest with yourself about how you found out about crypto. For most people, it goes one of these ways.'),
        para('The group chat tip. A friend, family member, or colleague mentions they made money on something. A token name gets dropped. The price went up 300% last month. Everyone seems to know about it except you. FOMO kicks in. You Google it. You\'re now in the rabbit hole.'),
        para('The news headline. Bitcoin hits a new all-time high. It\'s everywhere — TV, Twitter, Instagram. People are talking about it. You think: I should have bought earlier. Maybe it\'s not too late. You open an app. You buy something.'),
        para('The social media post. A creator you follow posts about their crypto portfolio. Screenshots of gains. A token they\'re "watching closely." You search it on an exchange. It looks cheap. You buy it.'),
        para('The direct recommendation. Someone you trust — a friend, a mentor, a colleague — tells you directly: "you should look into this." You trust them. You act on it.'),
        para('Every single one of these starts with someone else\'s information, not your own understanding. You\'re not buying an asset you understand. You\'re buying someone else\'s conviction — or someone else\'s marketing. And in crypto, that\'s one of the fastest ways to lose money. This doesn\'t mean the entry points above are wrong. What matters is what you do after that initial spark.'),
      ],
    },
    {
      title: 'The Three Types of Crypto Beginners',
      content: [
        para('Before going further, it helps to know which type of beginner you are — because each one makes different mistakes.'),
        para('Type 1 — The FOMO Buyer. Saw the price go up. Bought near the top. Watched it drop. Either panic-sold at a loss or is still holding and hoping. Common mistake: Entered without understanding what they bought or why. No exit plan. No risk management. What they need most: Understanding market cycles (Phase 4) and how to evaluate a project before buying (Phase 3).'),
        para('Type 2 — The Curious Researcher. Has been watching crypto for a while but hasn\'t pulled the trigger yet. Read a lot of articles. Watched a lot of YouTube videos. Still feels like they don\'t know enough to start. Common mistake: Analysis paralysis. Waiting for perfect information that will never come. What they need most: A structured starting point. Permission to begin small. A checklist that makes the first step feel manageable.'),
        para('Type 3 — The Web2 Professional. Has a background in tech, finance, marketing, or business. Understands the potential of blockchain from a professional perspective. Common mistake: Skipping the basics because they feel too simple. Jumping straight to DeFi, trading, or building without understanding the foundational layer. What they need most: A fast but complete foundation — exactly what Phases 1 and 2 provide.'),
        para('Which one are you? All three make it to the same destination. The path just looks slightly different.'),
      ],
    },
    {
      title: 'Why Most Beginners Lose Money Early',
      content: [
        para('This is worth being direct about before you spend a single dollar. Most people who enter crypto for the first time lose money — not because crypto doesn\'t work, but because of predictable, avoidable mistakes.'),
        para('Mistake 1 — Buying based on price, not value. A token costs $0.001. It feels cheap. "If it just goes to $1, I\'ll make 1000x." This is not how valuation works. A token priced at $0.001 with 1 trillion supply has a $1 billion market cap. Price per token is meaningless without context.'),
        para('Mistake 2 — Buying at the peak of hype. By the time something appears in mainstream news, the price has usually already reflected that attention. The people who profit from hype are almost always the ones who were early. The people who lose money from hype are almost always the ones who arrive late.'),
        para('Mistake 3 — Investing more than they can afford to lose. Crypto is volatile. A 50% drawdown in Bitcoin has happened multiple times in its history. Altcoins regularly drop 80–95% from peak. The rule: only invest what you would be comfortable seeing go to zero.'),
        para('Mistake 4 — No plan for when to sell. Most beginners know when they want to buy. Almost none of them have a plan for when to sell. Before you buy anything, know your exit.'),
        para('Mistake 5 — Keeping everything on an exchange. Buying on a CEX is fine for beginners. Leaving everything there indefinitely is not. Exchanges have been hacked, frozen, and gone bankrupt. Your crypto on an exchange is not truly yours — it\'s an IOU. You\'ll learn exactly how to fix this in Chapters 6 and 7 of this phase.'),
      ],
    },
    {
      title: 'The Right Mindset Before You Start',
      content: [
        para('Before you buy your first crypto, internalize three things.'),
        para('1. Start with education, not speculation. The goal of Phase 1 is not to make money. It\'s to understand what you\'re doing well enough that you can make informed decisions. The $20–50 you spend in the hands-on exercise at the end of this phase is not an investment — it\'s tuition.'),
        para('2. Small is smart. You do not need to start with a significant amount of money to learn everything crypto has to teach you. A $20 Bitcoin purchase will teach you everything a $2,000 purchase teaches you — at a fraction of the emotional cost.'),
        para('3. This is a long-term skill, not a short-term trade. The people who consistently succeed in crypto are not the ones who got lucky on one trade. They\'re the ones who understand market cycles, can evaluate projects, manage risk, and make decisions based on information rather than emotion.'),
      ],
    },
    {
      title: 'What Comes Next in Phase 1',
      content: [
        para('Now that you understand the context — why most beginners struggle and what mindset you need before starting — the next chapters walk you through the actual mechanics of getting started safely.'),
        para('Chapter 2: Choosing a safe CEX — Not all exchanges are equal. Some have been hacked. Some are scams. Some aren\'t available in your country.\nChapter 3: Creating and securing your account — The majority of exchange hacks target users, not the exchange itself.\nChapter 4: Depositing money and buying your first crypto — The mechanics of your first purchase, step by step.\nChapter 5: Common mistakes when buying on a CEX — The errors almost every beginner makes and how to avoid them.\nChapter 6: Risks of keeping crypto on an exchange — Why "not your keys, not your coins" is the most important phrase in crypto.\nChapter 7: Why you should eventually move to a personal wallet — The difference between owning crypto and owning an IOU.'),
      ],
    },
    {
      title: 'Frequently Asked Questions',
      content: [
        para('Do I need to understand blockchain before buying crypto? No — and that\'s exactly why Phase 1 comes before Phase 2 in this curriculum. You\'ll understand blockchain much better after you\'ve owned crypto and made real transactions.'),
        para('Is now a good time to buy? This is the most common question beginners ask — and the least useful one. Nobody consistently knows the right time to buy. What you can control is: understanding what you\'re buying, buying an amount you can afford to lose, and having a plan.'),
        para('What\'s the minimum amount I need to start? Most exchanges allow purchases of $10–20 equivalent in local currency. For this curriculum, $20–50 is enough to complete every hands-on exercise in Phase 1.'),
        para('What if I lose money? If you follow Phase 1 correctly — starting with $20–50 in Bitcoin on a reputable exchange — the maximum you can lose is $50. That is the cost of this education. Every professional in crypto has lost money learning.'),
      ],
    },
    {
      title: 'Chapter Summary',
      content: [
        para('How beginners enter crypto: Through FOMO, news, social media, or direct recommendation — all starting with someone else\'s information.\nThe three types of beginners: FOMO buyer, curious researcher, Web2 professional — each makes different mistakes.\nWhy most beginners lose money: Wrong valuation logic, buying at peak hype, over-investing, no exit plan, leaving funds on exchange.\nThe right mindset: Start with education not speculation, start small, think long-term.\nWhat Phase 1 covers: Safe entry through a CEX, account security, first purchase, and why self-custody matters.'),
      ],
    },
  ],
}

const phase1chapter1: ArticleData = {
  title: 'Choosing a Safe and Beginner-Friendly CEX',
  level: 1,
  chapterIndex: 1,
  blurb: 'Not all exchanges are equal — FTX was the second-largest in the world when it collapsed. This chapter covers the five criteria that make a CEX safe, why this curriculum uses Binance as its running example, and the red flags that should make you walk away from any platform.',
  description: 'A CEX (Centralized Exchange) is the safest and simplest entry point for crypto beginners.',
  featured: false,
  author: 'Kumami Team',
  status: 'published',
  sections: [
    {
      title: 'Key Takeaways',
      content: [
        para('• A CEX (Centralized Exchange) is the safest and simplest entry point for crypto beginners\n• Not all exchanges are equal — some have been hacked, gone bankrupt, or aren\'t licensed\n• Five things matter most when choosing a CEX: regulation, security, liquidity, fees, and user experience\n• The biggest exchanges are not always the safest — FTX was the second largest in the world when it collapsed\n• For most beginners globally, Binance is the most complete starting point — widest selection, lowest fees, available in most countries'),
      ],
    },
    {
      title: 'What Is a CEX?',
      content: [
        para('A Centralized Exchange — or CEX — is a platform that lets you buy, sell, and hold cryptocurrency using regular money (called fiat currency). Think of it like a stock brokerage — but for crypto. You create an account, verify your identity, deposit money from your bank, and use the platform to buy whatever cryptocurrency you want.'),
        para('The word "centralized" means one company controls the platform. They hold your funds, manage your account, and act as the middleman between you and the crypto market. For beginners, this is actually a good thing. A CEX handles all the technical complexity behind the scenes — you don\'t need to understand wallets, private keys, or blockchain mechanics to make your first purchase.'),
        para('The trade-off: because a company holds your funds, you are trusting them to keep your money safe. This is why choosing the right exchange matters enormously.'),
      ],
    },
    {
      title: 'CEX vs DEX — What\'s the Difference?',
      content: [
        para('CEX (e.g. Binance) vs DEX (e.g. Uniswap):\n\nWho controls it — A company (CEX) vs Nobody — runs on smart contracts (DEX)\nAccount required — Yes, with identity verification (CEX) vs No, just connect a wallet (DEX)\nFiat deposits — Yes, bank transfer or credit card (CEX) vs No, crypto only (DEX)\nEase of use — Beginner friendly (CEX) vs Requires existing crypto knowledge (DEX)\nCustody — Exchange holds your funds (CEX) vs You hold your own funds (DEX)\nRisk — Exchange can be hacked or go bankrupt (CEX) vs Smart contract bugs, no customer support (DEX)\nBest for — Beginners buying their first crypto (CEX) vs Experienced users trading on-chain (DEX)'),
        para('The verdict for Phase 1: Use a CEX. Once you understand wallets and on-chain transactions — covered later in this phase — you can explore DEXs. For your first purchase, a CEX like Binance is the right starting point.'),
      ],
    },
    {
      title: 'What Happened When People Chose the Wrong Exchange',
      content: [
        para('Before you pick an exchange, understand what\'s at stake.'),
        para('FTX — November 2022. The second-largest crypto exchange in the world. Celebrity endorsements. Super Bowl ads. Billions in user funds. In November 2022, it collapsed overnight. $8 billion in customer funds disappeared. Founder Sam Bankman-Fried was convicted of fraud and sentenced to 25 years in prison. Users who kept funds on FTX lost everything.'),
        para('Mt. Gox — 2014. Handled 70% of all Bitcoin transactions globally at its peak. Hacked in 2014 — 850,000 BTC stolen. The exchange shut down. Creditors are still receiving partial repayments in 2026, over a decade later.'),
        para('Celsius — 2022. A crypto lending platform that halted all withdrawals in June 2022, filed for bankruptcy, and locked billions in user deposits. Users had no recourse.'),
        para('The lesson: The exchange you choose is one of the most important decisions you make in crypto. Size and popularity are not the same as safety.'),
      ],
    },
    {
      title: 'The 5 Things That Make a CEX Safe',
      content: [
        para('1. Regulatory Compliance — Is the exchange licensed and regulated? Regulated exchanges are required to follow rules around customer protection, fund segregation, and anti-money laundering. What to look for: Licensed by a recognized financial authority in the regions it serves. Compliant with local laws in your country. Clear terms of service and dispute policy. Verifiable company registration.'),
        para('2. Security Track Record — Has the exchange ever been hacked? How did they respond? Look for: Proof of Reserves — public proof the exchange holds enough assets to cover all user deposits. Cold storage — majority of user funds kept offline. Insurance or emergency fund. Mandatory 2FA. Bug bounty program.'),
        para('3. Liquidity — Can you actually buy and sell at the price you see? Low-liquidity exchanges show you a price — but when you try to buy, the actual price you get is worse because there aren\'t enough sellers at that level. This is called slippage. Simple check: Look at the 24-hour trading volume. Higher volume = better liquidity.'),
        para('4. Fees — How much does each transaction actually cost? Before using any exchange, check: Trading fee — charged on every buy or sell. Withdrawal fee — charged when moving crypto off the exchange. Deposit fee — charged when adding fiat currency. Spread — the difference between the buy price and sell price.'),
        para('5. User Experience — Is the platform actually usable for a beginner? For your first purchase, you want a platform that is clean, guided, and doesn\'t overwhelm you with advanced features you don\'t need yet.'),
      ],
    },
    {
      title: 'Why This Curriculum Uses Binance as the Example',
      content: [
        para('Throughout the rest of this curriculum, we\'ll use Binance as the running example for screenshots, walkthroughs, and step-by-step instructions. Here\'s why.'),
        para('Largest by trading volume globally. Binance is the biggest crypto exchange in the world, which means deep liquidity on almost every pair — you get prices close to what you see on screen.'),
        para('Lowest fees among major exchanges. Binance\'s standard spot trading fee is 0.1% — among the cheapest of any large exchange. Over time, this matters.'),
        para('Widest token selection. 350+ cryptocurrencies supported — useful as you move into Phase 3 and start exploring altcoins.'),
        para('Available in most countries. Binance operates in the majority of countries worldwide, making it the most broadly accessible option for this curriculum\'s global audience.'),
        para('Strong security infrastructure today. Binance was hacked in 2019 — and fully covered all user losses through its SAFU (Secure Asset Fund for Users) emergency fund, which still holds over $1 billion.'),
        para('Important caveat: Binance is not available in every country — notably the United States, which has its own separate Binance.US platform with different features and limitations. Always verify current availability and regulatory status in your specific country before signing up. The five evaluation criteria above apply whether you use Binance or any alternative.'),
      ],
    },
    {
      title: 'Binance at a Glance',
      content: [
        para('Founded: 2017\nTrading fee: 0.1% (spot)\nToken selection: 350+\n24h volume: Highest of any exchange globally\nSecurity incident: 2019 hack — fully covered by SAFU fund\nMobile app: iOS and Android, well-rated\nBeginner mode: Yes — "Buy Crypto" simple flow alongside advanced trading\nUS availability: No — use Binance.US instead'),
      ],
    },
    {
      title: 'Red Flags — Exchanges to Avoid',
      content: [
        para('If any exchange shows these signs, do not use it:\n• No verifiable license or regulation — cannot name which authority oversees them\n• Promises of guaranteed returns — no legitimate exchange promises returns. This is always a scam.\n• Anonymous founding team — no verifiable information about who runs the company\n• No Proof of Reserves — cannot prove they hold the assets they claim to hold\n• Pressure tactics — "limited time offer," "buy now before it\'s too late"\n• Unrealistically low or zero fees — usually means hidden costs elsewhere\n• No track record — recently launched with aggressive marketing and no verifiable history'),
      ],
    },
    {
      title: 'Frequently Asked Questions',
      content: [
        para('Is Binance safe after the 2019 hack? Yes — with context. Binance covered all losses from the 2019 hack using its SAFU fund and has significantly upgraded security since. Always check Binance\'s current licensing status in your specific region before depositing funds.'),
        para('Why does this curriculum use Binance instead of a local exchange? Binance offers the broadest global availability, making it the most practical universal example for a curriculum used across many countries. If Binance is not available in your country, apply the same five evaluation criteria to whichever exchange you choose.'),
        para('Is Binance the only exchange I should consider? No. Coinbase and Kraken are both strong alternatives, particularly for US-based users.'),
        para('Do I need to verify my identity on Binance? Yes. Binance requires KYC verification — typically a government-issued ID and a selfie — before you can deposit fiat or withdraw significant amounts.'),
      ],
    },
    {
      title: 'Chapter Summary',
      content: [
        para('What a CEX is: A company-run platform for buying crypto with regular money.\nCEX vs DEX: CEX is for beginners — simple, fiat-friendly. DEX is for experienced users — no account needed.\nWhy exchange choice matters: FTX, Mt. Gox, and Celsius show what happens when you choose wrong.\n5 criteria for a safe CEX: Regulation · Security · Liquidity · Fees · User experience.\nWhy Binance for this curriculum: Largest volume, lowest fees, widest selection, broadly available globally.\nRed flags to avoid: No license · guaranteed returns · anonymous team · no proof of reserves.'),
      ],
    },
  ],
}

const phase1chapter2: ArticleData = {
  title: 'How to Create and Secure a CEX Account Properly',
  level: 1,
  chapterIndex: 2,
  blurb: 'Creating a Binance account takes minutes — securing it properly takes another 15 minutes and is non-negotiable. 90% of exchange-related hacks target users, not the exchange itself. This chapter walks through every security step before you deposit a dollar.',
  description: 'Creating an account takes minutes — securing it properly takes another 15 minutes and is non-negotiable.',
  featured: false,
  author: 'Kumami Team',
  status: 'published',
  sections: [
    {
      title: 'Key Takeaways',
      content: [
        para('• Creating a Binance account takes minutes — securing it properly takes another 15 minutes and is non-negotiable\n• 90% of exchange-related hacks target users, not the exchange itself — your security setup is your first line of defense\n• KYC (identity verification) is mandatory on Binance and is a sign of legitimacy, not a red flag\n• Two-factor authentication (2FA) using Google Authenticator — not SMS — is the single most important security step\n• Your email account is the master key to your Binance account — it must be secured first'),
      ],
    },
    {
      title: 'Why Account Security Matters More Than You Think',
      content: [
        para('Most beginners focus on which crypto to buy. Almost none of them think carefully about account security — until something goes wrong. Here\'s the reality: Binance itself is rarely the vulnerability. The user account is.'),
        para('The most common ways people lose crypto on Binance and other exchanges:\n• SIM swapping — a hacker contacts your mobile carrier, convinces them to transfer your phone number to a new SIM, and uses it to bypass SMS-based 2FA and reset your password\n• Phishing — a fake website that looks identical to Binance tricks you into entering your login credentials\n• Password reuse — your Binance password is the same as a password from another site that was previously leaked\n• Email compromise — your email gets hacked, giving the attacker full access to reset your Binance password and drain your funds\nEvery single one of these is preventable with proper setup.'),
      ],
    },
    {
      title: 'Step 1 — Secure Your Email First',
      content: [
        para('Your email account is the master key to everything. Before you even create a Binance account, your email needs to be secured properly.'),
        para('Use a dedicated email address for crypto. Create a new email account used exclusively for crypto. Not your work email. Not the Gmail you\'ve had since 2009. A fresh, clean email used only for Binance and wallet recovery. If your main email is ever compromised, your crypto accounts are exposed. A separate email creates an additional layer of isolation.'),
        para('Enable 2FA on your email immediately — before anything else. Use an authenticator app, not SMS.'),
        para('Use a strong, unique password. Minimum 16 characters. Mix of uppercase, lowercase, numbers, and symbols. Use a password manager to generate and store it.'),
      ],
    },
    {
      title: 'Step 2 — Create Your Binance Account',
      content: [
        para('Once your email is secured, creating the Binance account itself is straightforward.'),
        para('Go directly to binance.com. Type the URL directly into your browser. Do not click links from emails, social media, or search ads. Phishing sites mimicking Binance frequently appear as paid ads in Google search results — they look identical to the real site but steal your credentials the moment you log in. Bookmark binance.com immediately after verifying it. Use the bookmark every time — never search for "Binance" on Google.'),
        para('Registration process:\n• Go to binance.com → Click "Register"\n• Enter your dedicated crypto email address\n• Create a strong, unique password — different from your email password\n• Enter the verification code sent to your email to confirm\n• Do not proceed to deposit anything until you\'ve completed all security steps below'),
      ],
    },
    {
      title: 'Step 3 — Complete Binance KYC Verification',
      content: [
        para('KYC stands for Know Your Customer. It is a legal requirement on Binance — and completing it is essential before you can deposit fiat or withdraw funds.'),
        para('What Binance KYC requires:\n• Government-issued photo ID — passport, national ID card, or driver\'s license\n• A selfie — for liveness verification, comparing your face to your ID\n• Sometimes: proof of address — for higher verification tiers'),
        para('Binance\'s verification tiers:\nVerified — ID + selfie → Basic trading, limited fiat deposits/withdrawals\nVerified Plus — Proof of address + additional info → Higher deposit/withdrawal limits'),
        para('Why KYC is a good sign, not a red flag: Binance is legally required to verify user identity to prevent money laundering and fraud. An exchange that lets you deposit and withdraw large amounts without any verification is operating outside the law — and is far more likely to disappear with your money than a regulated platform.'),
      ],
    },
    {
      title: 'Step 4 — Enable Two-Factor Authentication on Binance',
      content: [
        para('This is the single most important security step on your Binance account. 2FA means logging in requires two things: your password and a second verification code. Even if someone steals your password, they cannot access your account without the second factor.'),
        para('2FA Type comparison:\nSMS / Text message — Code sent to your phone number — Weak, vulnerable to SIM swapping\nGoogle Authenticator — Code generated by an app on your phone — Strong, not linked to your phone number\nPasskey / Hardware key — Physical device or biometric — Strongest, requires physical possession'),
        para('Use Google Authenticator. Not SMS. SIM swapping attacks have drained thousands of crypto accounts. A hacker doesn\'t need your phone — they just need to convince your mobile carrier to transfer your number to their SIM.'),
        para('How to set up Google Authenticator 2FA on Binance:\n• Log in to Binance → Go to Profile icon → "Security"\n• Find "Two-Factor Authentication" → Select "Authenticator App"\n• Binance displays a QR code\n• Open Google Authenticator on your phone → tap "+" → "Scan a QR code"\n• Scan the QR code shown on Binance\n• Enter the 6-digit code Google Authenticator generates to confirm setup\n• Binance will show backup codes — save them offline, somewhere safe'),
        para('The backup codes are critical. If you lose access to Google Authenticator — your phone breaks, gets stolen, or you delete the app — these backup codes are the only way to recover your account. Print them. Store them somewhere physical and secure.'),
      ],
    },
    {
      title: 'Step 5 — Set Up Binance-Specific Security Features',
      content: [
        para('Beyond 2FA, Binance offers additional security settings under Profile → Security that are worth enabling.'),
        para('Anti-phishing code — A custom phrase you set that appears in every legitimate email from Binance. If you receive an email claiming to be from Binance but it doesn\'t contain your anti-phishing code — it\'s fake. How to set it up: Security settings → Anti-Phishing Code → Create a short memorable phrase → Save.'),
        para('Withdrawal whitelist — A list of wallet addresses your account is allowed to withdraw to. If enabled, even if someone gains access to your account, they cannot send your crypto to their own wallet — only to addresses you\'ve pre-approved. How to set it up: Security settings → Withdrawal Whitelist → Enable → Add your personal wallet address once you create one in Chapter 7.'),
        para('Device management — View all devices currently logged into your Binance account. Remove any you don\'t recognize. How to use: Security settings → Manage Device → Review and remove unfamiliar devices.'),
        para('Login notifications — Binance sends an email or push notification every time someone logs into your account. If you receive a notification you didn\'t trigger — your account has been compromised and you need to act immediately.'),
      ],
    },
    {
      title: 'Step 6 — Password Management',
      content: [
        para('Using a unique, strong password for your Binance account is not optional. It is the baseline.'),
        para('Why password reuse is catastrophic in crypto: There have been hundreds of major data breaches over the past decade. Every leaked password gets added to lists hackers use to automatically test against exchange login pages — including Binance. If your Binance password is the same as any password you\'ve used anywhere else, it is only a matter of time.'),
        para('Password manager options:\nBitwarden — Free / $10/yr premium — Open source, most trusted free option\n1Password — $36/yr — Best UX, family sharing\nDashlane — $33/yr — Includes dark web monitoring'),
        para('Your Binance password should:\n• Be at least 16 characters\n• Include uppercase, lowercase, numbers, and symbols\n• Never have been used on any other account\n• Be stored in your password manager — not written on a sticky note, not saved in your browser'),
      ],
    },
    {
      title: 'What to Do If Your Binance Account Is Compromised',
      content: [
        para('• Immediately change your password from a secure device\n• Go to Security settings → Manage Device → Log out all devices\n• Contact Binance Support immediately — available 24/7 through the Binance app or website\n• Check your email account — if your email was also compromised, secure that first\n• Document everything — screenshots, timestamps, transaction IDs — for your report to Binance support'),
      ],
    },
    {
      title: 'The Complete Binance Security Checklist',
      content: [
        para('Before depositing a single dollar, every item on this list should be checked:\n• [ ] Dedicated crypto email address created\n• [ ] Strong, unique password set on email account\n• [ ] 2FA enabled on email using authenticator app\n• [ ] Binance account created using binance.com directly (bookmarked)\n• [ ] Strong, unique password set on Binance — different from email\n• [ ] KYC verification completed on Binance\n• [ ] Google Authenticator 2FA enabled on Binance\n• [ ] 2FA backup codes saved offline in a secure location\n• [ ] Anti-phishing code set on Binance\n• [ ] Login notifications enabled\n• [ ] Password stored in a password manager\nIf you have checked every item above, your Binance account is set up more securely than the majority of crypto users. You are ready to deposit and buy.'),
      ],
    },
    {
      title: 'Frequently Asked Questions',
      content: [
        para('Is it safe to store my 2FA backup codes in my email? No. Your email is the most likely attack vector. Store backup codes offline — written on paper, stored in a physically secure location.'),
        para('What if I lose my phone with Google Authenticator on it? This is why backup codes exist. If saved properly, use a backup code to log in and set up 2FA on a new device. Without backup codes, contact Binance Support — recovery is possible but can take several days of identity verification.'),
        para('Is the Binance mobile app safe to use? Yes — download it directly from the official App Store or Google Play by searching "Binance" directly. Do not download from third-party links or APK files outside official stores.'),
        para('What if Binance asks for more documents later? This is normal. Binance periodically requests updated verification, especially for larger deposits or withdrawals, as part of regulatory compliance. Provide documents only through the official Binance platform.'),
      ],
    },
    {
      title: 'Chapter Summary',
      content: [
        para('Secure your email: Dedicated address + strong password + authenticator 2FA — Email is the master key to your Binance account.\nCreate your account: binance.com directly — bookmarked — Phishing sites target beginners searching on Google.\nComplete KYC: Government ID + selfie — Legal requirement, also proves Binance is operating legitimately.\nEnable 2FA: Google Authenticator — not SMS — Single most important security step.\nAdditional security: Anti-phishing code, withdrawal whitelist, login notifications — Multiple layers of protection.\nPassword management: Unique password stored in a password manager — Password reuse is how most accounts get compromised.'),
      ],
    },
  ],
}

const phase1chapter3: ArticleData = {
  title: 'How to Deposit Money and Buy Your First Crypto',
  level: 1,
  chapterIndex: 3,
  blurb: 'Depositing fiat and buying crypto on Binance are two separate steps — and understanding both before you start will save you from the fee surprises and confirmation mistakes that trip up most first-time buyers.',
  description: 'Depositing fiat and buying crypto on Binance are two separate steps — understand both before you start.',
  featured: false,
  author: 'Kumami Team',
  status: 'published',
  sections: [
    {
      title: 'Key Takeaways',
      content: [
        para('• Depositing fiat and buying crypto on Binance are two separate steps — understand both before you start\n• Bank transfer is almost always cheaper than card deposits on Binance — check fees before choosing\n• Start with Bitcoin for your first purchase — it is the most liquid, most established, and easiest to understand\n• Binance\'s displayed price and the real market price are not always identical — understand spread and fees before confirming\n• Never buy more than you can afford to lose entirely — for Phase 1, $20–50 is enough'),
      ],
    },
    {
      title: 'Overview — The Full Flow on Binance',
      content: [
        para('Here is the complete flow on Binance — from having money in your bank to owning Bitcoin in your account:\n\nStep 1 → Choose your deposit method on Binance\nStep 2 → Deposit fiat currency into your Binance account\nStep 3 → Wait for the deposit to clear\nStep 4 → Choose what to buy\nStep 5 → Choose how to buy it on Binance\nStep 6 → Understand all fees before confirming\nStep 7 → Execute the purchase\nStep 8 → Verify your purchase on the blockchain'),
      ],
    },
    {
      title: 'Step 1 — Choose Your Deposit Method on Binance',
      content: [
        para('Binance offers multiple ways to deposit fiat currency, depending on your country.'),
        para('Bank transfer — Speed: 1–3 business days — Typical fee: Often free — Best option for larger amounts. Slowest but cheapest.\nDebit/Credit card — Speed: Instant — Typical fee: ~1.8–3.5% — Fast but expensive. Acceptable for small Phase 1 amounts.\nP2P trading — Speed: Varies — Typical fee: Often 0% — Buy directly from other Binance users using local payment methods.\nThird-party payment processors — Speed: Instant to 1 day — Typical fee: Varies — Available depending on your country.'),
        para('Recommended method for beginners: bank transfer, where available. Buying $50 of Bitcoin with a card at a 3% fee costs you $1.50 before you even start. For Phase 1\'s $20–50, a card is acceptable for convenience. For larger amounts later, bank transfer or Binance P2P typically offers better rates.'),
      ],
    },
    {
      title: 'Step 2 — Make Your Deposit on Binance',
      content: [
        para('• Log in to Binance → Click "Buy Crypto" in the top navigation, or go to "Wallet" → "Fiat and Spot"\n• Select "Deposit" → Choose your local currency\n• Select your deposit method (bank transfer, card, or P2P)\n• Enter the amount you want to deposit\n• Follow the on-screen instructions for your chosen method'),
        para('If using bank transfer: Binance will provide specific bank account details to send your money to. This typically includes the account name, account number, and a unique reference code. Copy every detail exactly. One wrong digit and your money goes somewhere it cannot be recovered from. Binance requires the reference code in your transfer description — missing this means your deposit may not be credited automatically and could require manual support review, taking days.'),
      ],
    },
    {
      title: 'Step 3 — Wait for Your Deposit to Clear on Binance',
      content: [
        para('Typical clearing times on Binance:\n• Bank transfer: 1–3 business days, depending on your country and bank\n• Card deposit: usually instant\n• P2P trades: as fast as the counterparty confirms, typically minutes\nYou\'ll see a notification in your Binance app when your deposit is confirmed. Do not attempt to buy until the funds are reflected in your Binance wallet balance.'),
      ],
    },
    {
      title: 'Step 4 — Choose What to Buy',
      content: [
        para('For your first purchase: Bitcoin (BTC). Not an altcoin. Not a meme coin. Not whatever is trending today on Binance\'s "Hot" list. Bitcoin.'),
        para('Why Bitcoin first:\n• Most liquid on Binance — Bitcoin has the deepest order books on Binance, meaning you can buy or sell with minimal slippage even in large amounts.\n• Most established — Bitcoin has operated continuously since 2009. No other crypto asset has that track record.\n• Simplest to understand — Bitcoin does one thing: store and transfer value. No complex mechanics, no staking requirements, no smart contract risk.\n• The benchmark — Every other asset on Binance is measured against Bitcoin. Understanding how Bitcoin moves is the foundation for everything else.'),
        para('Once you complete Phase 1 and Phase 2, you\'ll have the knowledge to evaluate Binance\'s other 350+ listed assets properly. For now — Bitcoin only.'),
      ],
    },
    {
      title: 'Step 5 — Choose How to Buy on Binance',
      content: [
        para('Binance offers two main interfaces for buying.'),
        para('Binance Convert / Simple Buy (Recommended for Phase 1): A guided purchase flow. You enter how much you want to spend and Binance converts it to the equivalent amount of Bitcoin at the current price. How it works: Go to "Buy Crypto" → Select your payment method → Select BTC as the asset → Enter the amount in your local currency → Review the order summary → Confirm. Best for: First-time buyers, small amounts, anyone who wants a clean, guided experience.'),
        para('Binance Spot Trading (For Reference — Not Required for Phase 1): The full trading interface where you can set specific prices and order types. Lower fees than Simple Buy — but significantly more complex. Order types: Market order — Buys immediately at current price. Limit order — Buys only if price reaches your specified level. Stop-limit order — Triggers a limit order when price hits a level. For Phase 1: Use Binance\'s Simple Buy / Convert feature. Spot Trading is covered in Phase 3.'),
      ],
    },
    {
      title: 'Step 6 — Understand What You\'re Actually Paying on Binance',
      content: [
        para('Before confirming any purchase on Binance, understand these numbers.'),
        para('1. The spot price — Bitcoin\'s real market price, visible on CoinGecko or CoinMarketCap. Changes every second.'),
        para('2. Binance\'s trading fee — Spot trading: 0.1% among the lowest in the industry. Simple Buy / Convert: typically built into a slightly wider spread instead of a separate visible fee. Card deposits: an additional ~1.8–3.5% processing fee on top.'),
        para('3. The spread — On Binance\'s Simple Buy feature, the price you\'re quoted may be slightly above the live spot price — this gap is the spread. To check: compare the price shown in Binance\'s buy interface against the live price on CoinGecko.'),
        para('4. The total cost — On a $50 Simple Buy purchase via card on Binance, expect total fees (spread + card processing) of roughly 2–4%. Using Spot Trading with a bank-transferred balance instead can bring this down closer to Binance\'s 0.1% base trading fee.'),
      ],
    },
    {
      title: 'Step 7 — Execute Your Purchase on Binance',
      content: [
        para('• Navigate to "Buy Crypto" on Binance\n• Select Bitcoin (BTC)\n• Enter your purchase amount in fiat (e.g., $50)\n• Review the order summary: amount of BTC you\'ll receive, fee breakdown, total cost\n• Confirm the purchase\n• Binance will show a confirmation screen and send a confirmation email\nYour Bitcoin will appear in your Binance Spot Wallet almost immediately after confirmation.'),
      ],
    },
    {
      title: 'Step 8 — Verify Your Purchase on the Blockchain',
      content: [
        para('This step introduces a skill you\'ll use constantly as you go deeper into Web3. Find your Bitcoin deposit address on Binance: Go to Wallet → Spot → Bitcoin → Deposit. Binance generates a unique Bitcoin address tied to your account.'),
        para('Look up your transaction on a block explorer: Go to mempool.space or blockchain.com/explorer. While your purchased Bitcoin sits in Binance\'s pooled custody (not a unique address visible on-chain until you withdraw), you can use this step fully once you withdraw to your personal wallet in Chapter 7 — at which point your specific transaction becomes visible on-chain.'),
      ],
    },
    {
      title: 'How Much Should You Buy on Binance?',
      content: [
        para('For Phase 1: $20–50. This is not about returns. It\'s about learning Binance\'s mechanics without meaningful financial risk:\n• Understand how Binance\'s deposit and buy process works end to end\n• Experience price volatility firsthand\n• Have a real asset to transfer to your personal wallet in Chapter 7\n• Build the habit of checking Binance\'s fees against the real market price before every purchase'),
      ],
    },
    {
      title: 'Frequently Asked Questions',
      content: [
        para('What if my bank blocks a transfer to Binance? Some banks flag crypto-related transactions as suspicious and decline them. Call your bank and confirm you\'re intentionally sending funds to a cryptocurrency exchange. Most banks will clear the transaction once confirmed.'),
        para('Can I buy a fraction of Bitcoin on Binance? Yes. Binance allows purchases as small as a few dollars worth of Bitcoin. $50 at current prices buys you a small fraction of one BTC — you own that fraction completely.'),
        para('Does Binance lock in the price while I\'m buying? On Binance\'s Simple Buy / Convert feature, the quoted price is typically locked for a short countdown window (often 10–15 seconds) before you confirm. If it expires, Binance will refresh the quote.'),
        para('Should I use Binance Simple Buy or Spot Trading? Simple Buy for Phase 1 — it\'s guided and beginner-friendly despite the slightly higher cost. Spot Trading becomes relevant in Phase 3 once you understand limit orders.'),
        para('What if I accidentally buy the wrong asset on Binance? Sell it back immediately through Binance\'s Convert feature. You\'ll pay a small fee on the round trip — treat it as a minor tuition cost — then buy Bitcoin correctly.'),
      ],
    },
    {
      title: 'Chapter Summary',
      content: [
        para('Choose deposit method: Bank transfer vs card vs P2P — Bank transfer or P2P for lower fees where available.\nMake your deposit: Send fiat to Binance — Double-check bank details and reference code.\nWait for clearance: Funds confirmed in Binance wallet — Don\'t buy until funds are fully reflected.\nChoose what to buy: Select your asset — Bitcoin only for Phase 1.\nChoose how to buy: Simple Buy vs Spot Trading — Simple Buy for Phase 1.\nUnderstand fees: Spread + trading fee + card fee — Always review Binance\'s order summary before confirming.\nExecute purchase: Confirm the order on Binance — Check the exact amount of BTC received.\nVerify: Find your deposit address, check on a block explorer — Fully visible once withdrawn to your own wallet (Ch. 7).'),
      ],
    },
  ],
}

const phase1chapter4: ArticleData = {
  title: 'Common Mistakes When Buying on a CEX',
  level: 1,
  chapterIndex: 4,
  blurb: 'Most beginner mistakes happen in the first 48 hours of owning crypto — before they understand what they\'re doing. This chapter covers the ten most costly, most common errors and the exact fix for each one.',
  description: 'Most beginner mistakes happen in the first 48 hours of owning crypto — before they understand what they\'re doing.',
  featured: false,
  author: 'Kumami Team',
  status: 'published',
  sections: [
    {
      title: 'Key Takeaways',
      content: [
        para('• Most beginner mistakes happen in the first 48 hours of owning crypto — before they understand what they\'re doing\n• Buying based on price per token instead of market cap is one of the most expensive misconceptions in crypto\n• FOMO is the single most reliable way to buy at the top — learning to recognize it is a tradeable skill\n• Fees are often hidden across multiple layers — always calculate the total cost before confirming\n• The mistake itself is rarely the problem — not learning from it is'),
      ],
    },
    {
      title: 'Why This Chapter Exists',
      content: [
        para('Most people learn about crypto mistakes the hard way — after they\'ve made them. This chapter exists to short-circuit that process. Every mistake covered here is drawn from patterns that repeat across millions of first-time buyers. None of them are unique to you. All of them are avoidable once you know what to look for. Read this before your first purchase. Read it again after.'),
      ],
    },
    {
      title: 'Mistake 1 — Buying Based on Price Per Token, Not Market Cap',
      content: [
        para('"Bitcoin is $67,000 — I can\'t afford that. But this token is $0.001. If it just reaches $1, I\'ll make 1000x." This is not how valuation works.'),
        para('Price per token is meaningless without knowing the total supply. A token priced at $0.001 with 100 trillion tokens in circulation has a market cap of $100 billion — larger than most established companies in the world. For that token to reach $1, its market cap would need to reach $100 trillion. The entire global stock market is worth approximately $110 trillion.'),
        para('The correct way to think about it: Market cap = price × circulating supply. This is the number that matters. A $0.001 token is not cheap. A $67,000 token is not expensive. Market cap tells you the real size of the asset. Where to check: CoinGecko and CoinMarketCap both display market cap prominently for every listed asset.'),
      ],
    },
    {
      title: 'Mistake 2 — Buying During Peak Hype',
      content: [
        para('By the time an asset appears in mainstream media and everyday conversations, the price has almost always already reflected that attention. The people profiting from hype are the ones who were early — weeks or months before the headlines. The people who lose money from hype are the ones who arrive last.'),
        para('How to recognize it:\n• The asset is being discussed by people who have never talked about crypto before\n• Price has already increased significantly in a short window — 50%+ in weeks\n• Social media volume is at an extreme high\n• You feel an urgent need to act before you "miss it"'),
        para('That last feeling — urgency — is the most reliable signal that you are about to buy at the wrong time. What to do instead: Observe. Let the hype cycle play out. Prices almost always give you a second entry at better levels after the initial excitement fades.'),
      ],
    },
    {
      title: 'Mistake 3 — Not Understanding the Total Cost',
      content: [
        para('"I\'m buying $100 of Bitcoin." The exchange shows a fee of $1.50. Seems fine. You confirm. Your Bitcoin balance shows $95.20. The full cost of a purchase typically includes: deposit fee, spread (built invisibly into the quoted price), trading fee, and currency conversion fee.'),
        para('How to calculate total cost before buying:\n• Check the current Bitcoin price on CoinGecko — this is the real market price\n• Check the price shown in your exchange\'s Simple Buy interface — the difference is the spread\n• Add the trading fee percentage on top\n• Add any deposit fee you paid to fund your account'),
        para('Example: Real BTC price $67,000. Exchange buy price $67,500 (spread ~0.75%). Trading fee 0.5%. Total effective cost above market: 1.25%. On a $100 purchase: you are paying $101.25 for $100 worth of Bitcoin. For small amounts this is acceptable. For large amounts, using the spot trading interface and a bank transfer significantly reduces total cost.'),
      ],
    },
    {
      title: 'Mistake 4 — Investing More Than You Can Afford to Lose',
      content: [
        para('"I really believe in Bitcoin. I\'m going to put in $2,000 — my whole savings buffer." Bitcoin has dropped 50–80% from peak in every major bear market in its history. Altcoins regularly drop 80–99%. If you invest money you cannot afford to lose, you will make emotional decisions — and emotional decisions in crypto almost always cost more than the original investment.'),
        para('The moment your investment represents money you need — for rent, for emergencies, for anything essential — your decision-making changes completely. You will panic-sell at the bottom. You will hold a bad position too long hoping for recovery.'),
        para('The rule: Invest only what you would be comfortable seeing go to zero tomorrow. Not uncomfortable. Not upset. Comfortable. For Phase 1, $20–50 is the right amount.'),
      ],
    },
    {
      title: 'Mistake 5 — Panic Selling at a Loss',
      content: [
        para('You buy Bitcoin at $67,000. Two weeks later it drops to $55,000. You sell — locking in a 17% loss. Three months later Bitcoin is at $80,000. Volatility is intellectually understood by most beginners before they invest — but emotionally experienced for the first time after they do.'),
        para('Bitcoin has had drawdowns of 30%+ multiple times within broader bull markets. It has recovered from every single one of them. The people who panic-sold at the bottom of every one of those drawdowns locked in permanent losses on an asset that ultimately recovered.'),
        para('What to do instead: Before you buy anything, define two things: your time horizon — how long are you willing to hold this asset? — and your exit conditions — what would make you sell? If nothing has changed about why you bought — a lower price is not a reason to sell. It is often a reason to buy more.'),
      ],
    },
    {
      title: 'Mistake 6 — Chasing a Token Because It "Already Went Up"',
      content: [
        para('"A token went up 400% last month. If I had bought then I\'d be up 4x. Maybe it keeps going." Most tokens that spike 400% in a month give back 60–80% of those gains in the following weeks as early buyers take profit. This is called "chasing" — entering a position because the price has already moved significantly in one direction, hoping it continues. It is one of the most consistent ways to buy the top.'),
      ],
    },
    {
      title: 'Mistake 7 — Using the Wrong Network for Withdrawal',
      content: [
        para('Many assets on exchanges exist across multiple blockchains — for example, USDC exists on Ethereum, Solana, Polygon, Arbitrum, and others. When you withdraw, the exchange asks which network to use. If you send to an address on a different network than the one you selected — the funds are gone.'),
        para('The rule: Always match the network selected on the exchange with the network of the receiving address. When in doubt — send a small test amount first. The fee for a test transaction is insurance against losing everything.'),
      ],
    },
    {
      title: 'Mistake 8 — Falling for Fake Exchange Promotions',
      content: [
        para('You receive an email: "Congratulations — you\'ve been selected for Binance\'s 30th Anniversary promotion. Deposit $500 and receive $1,000 in BTC." These promotions look real. The logos are correct. The language is professional. The URLs are close — coinbase-promotion.com instead of coinbase.com.'),
        para('The rule: No legitimate exchange runs promotions that double your deposit or guarantee returns. Ever. If you receive an offer that sounds too good to be true — it is a scam. Go directly to the exchange\'s official website to verify. Never click links from emails or social media.'),
      ],
    },
    {
      title: 'Mistake 9 — Not Recording Your Transactions',
      content: [
        para('In some countries crypto gains are subject to tax. Keeping records helps you stay compliant. You make several purchases over a few months. You lose track of what you paid for each asset. When tax season arrives — you have no idea what your cost basis is.'),
        para('In most countries, crypto is a taxable asset. When you sell, you owe tax on the gain — calculated from what you originally paid. What to do: Keep a simple record of every transaction. Date. Asset. Amount. Price paid. Total cost including fees. A dedicated crypto tax tool like Koinly, CoinTracker, or TaxBit works well — they connect directly to your exchange and calculate everything automatically.'),
      ],
    },
    {
      title: 'Mistake 10 — Thinking Short-Term on a Long-Term Asset',
      content: [
        para('"I bought Bitcoin two weeks ago and it\'s only up 3%. I expected more. Maybe I should try something else." Bitcoin\'s most significant price moves happen over months and years — not days and weeks. Measuring a long-term asset over a short-term window is like planting a tree and digging it up after two weeks because you can\'t see any growth yet.'),
        para('The median holding period of Bitcoin for profitable investors is over a year. When you buy Bitcoin, set a calendar reminder for 12 months from today. Check the price then. Let it do what it does in between.'),
      ],
    },
    {
      title: 'Quick Reference — Mistakes and Fixes',
      content: [
        para('Buying by price per token → Check market cap on CoinGecko first\nBuying during peak hype → Wait for the hype to fade — second entries are usually better\nNot understanding total cost → Calculate spread + fee + deposit fee before confirming\nInvesting too much → Only invest what you can afford to lose entirely\nPanic selling → Define your exit conditions before you enter\nChasing pumps → Look for value before hype — not after\nWrong withdrawal network → Always match networks — test with a small amount first\nFake promotions → No legitimate exchange guarantees returns. Ever.\nNot recording transactions → Log every trade — date, asset, amount, price, fee\nShort-term thinking on BTC → Measure Bitcoin over years, not weeks'),
      ],
    },
    {
      title: 'Frequently Asked Questions',
      content: [
        para('I already made one of these mistakes. What should I do? Assess the damage. If it is recoverable — wrong network, panic sell — document what happened and move forward. If it is not recoverable — fell for a scam — report it to the exchange, document everything, and treat it as expensive tuition.'),
        para('How do I know if a promotion is legitimate? Go directly to the exchange\'s official website and look for the promotion there. If it doesn\'t appear on the official site — it doesn\'t exist.'),
        para('Is it normal to be in the red after my first purchase? Yes — especially if you bought during a period of high volatility or paid a significant spread and fee. Give it time.'),
        para('How do I avoid buying during peak hype if I\'m new? Check the Fear and Greed Index at alternative.me/crypto. A reading of 75+ (Greed or Extreme Greed) means the market is running hot — historically a time to be cautious, not aggressive.'),
      ],
    },
    {
      title: 'Chapter Summary',
      content: [
        para('Price per token: Market cap is what matters — not price per coin.\nBuying during hype: Urgency to buy is a signal to wait.\nHidden fees: Calculate spread + fee + deposit cost before confirming.\nOver-investing: Only invest what you can lose entirely without stress.\nPanic selling: Define your exit before you enter.\nChasing pumps: Value before hype — always.\nWrong network: Match networks — test first.\nFake promotions: No legitimate platform guarantees returns.\nNo records: Log every transaction from day one.\nShort-term thinking: Bitcoin is a years-long asset — not a weeks-long trade.'),
      ],
    },
  ],
}

const phase1chapter5: ArticleData = {
  title: 'Risks of Keeping Your Crypto on an Exchange',
  level: 1,
  chapterIndex: 5,
  blurb: '"Not your keys, not your coins" is the most important phrase in crypto — and most beginners learn it too late. This chapter explains every way exchange custody can go wrong, from hacks and bankruptcies to account freezes and regulatory seizures.',
  description: 'Crypto held on an exchange is not truly yours — it is an IOU from the exchange.',
  featured: false,
  author: 'Kumami Team',
  status: 'published',
  sections: [
    {
      title: 'Key Takeaways',
      content: [
        para('• Crypto held on an exchange is not truly yours — it is an IOU from the exchange\n• "Not your keys, not your coins" is the most important phrase in crypto — and most beginners learn it too late\n• Exchanges can be hacked, frozen, bankrupted, or shut down by regulators — and users are almost never first in line to recover funds\n• Keeping small amounts on an exchange for trading is acceptable — keeping your long-term holdings there is not\n• The solution is simple: move your crypto to a personal wallet where only you hold the private key'),
      ],
    },
    {
      title: 'The Most Important Phrase in Crypto',
      content: [
        para('"Not your keys, not your coins." This is not a slogan. It is a description of how custody actually works in crypto — and understanding it changes how you think about every decision you make.'),
        para('When you buy Bitcoin on an exchange, the exchange holds the private key to that Bitcoin — not you. The Bitcoin is registered to a wallet the exchange controls. You have an account balance that says you own it. But the actual asset is in their custody. That is an IOU. Not ownership.'),
        para('In traditional finance, this is normal and acceptable — banks hold your money, governments insure deposits, and legal systems protect you if the bank fails. In crypto, the protections are thinner, the regulation is newer, and the history of exchange failures is long and brutal.'),
      ],
    },
    {
      title: 'Exchange Hacks',
      content: [
        para('Exchanges are among the most targeted institutions in the world by hackers. They hold billions of dollars in digital assets and — if security is compromised — those assets can be moved in minutes with no way to reverse the transaction.'),
        para('Mt. Gox (2014): The largest Bitcoin exchange in the world at the time. Handled 70% of all global Bitcoin transactions. Hacked over several years — 850,000 BTC stolen. Exchange collapsed. Users waited over a decade for partial repayment. Many never recovered their full funds.'),
        para('Bitfinex (2016): Nearly 120,000 BTC stolen in a targeted hack. The exchange survived — but users received "recovery tokens" instead of immediate repayment, effectively locking their funds for years.'),
        para('Binance (2019): 7,000 BTC stolen in a single transaction through a combination of phishing, malware, and API exploits. Binance covered all losses from its SAFU fund — a rare best-case outcome. Most exchanges that get hacked do not have this safety net.'),
        para('Bybit (2025): $1.5 billion stolen in what became the largest crypto hack in history — attributed to North Korea\'s Lazarus Group. The exchange survived but the incident demonstrated that even well-funded, security-conscious exchanges remain targets.'),
        para('The pattern: No exchange — regardless of size, reputation, or age — is immune to hacking. The question is not whether an exchange can be hacked. It is whether they can cover the losses if it happens.'),
      ],
    },
    {
      title: 'Exchange Bankruptcy',
      content: [
        para('An exchange going bankrupt is in some ways more dangerous than a hack — because it can happen slowly, invisibly, and without warning.'),
        para('FTX (2022): The second-largest crypto exchange in the world. Valued at $32 billion. Backed by major venture capital firms. Celebrity-endorsed. Collapsed in 72 hours when it emerged that customer funds had been misused to cover trading losses at its affiliated hedge fund. $8 billion in customer funds disappeared. Founder Sam Bankman-Fried convicted of fraud. Sentenced to 25 years in prison.'),
        para('Celsius (2022): A crypto lending platform that paid users interest on deposits. Halted all withdrawals in June 2022. Filed for bankruptcy weeks later. $4.7 billion in user funds frozen. Users became unsecured creditors in bankruptcy court.'),
        para('Voyager (2022): Another crypto lending platform. Paused withdrawals in July 2022. Filed for bankruptcy. $1.3 billion in user assets affected.'),
        para('The pattern: When an exchange freezes withdrawals, users find out at the same time as everyone else — through a public announcement or a failed withdrawal attempt. By then, it is too late to act.'),
      ],
    },
    {
      title: 'Regulatory Seizure and Shutdown',
      content: [
        para('Governments can order exchanges to freeze accounts, halt operations, or shut down entirely. When this happens, user funds become inaccessible immediately — sometimes permanently. What triggers regulatory action: exchange operating without proper licensing, suspected money laundering or sanctions violations, government changing its stance on crypto regulation, political pressure in specific jurisdictions.'),
        para('The key point: Regulatory risk is unpredictable and jurisdiction-specific. An exchange that is fully legal in your country today may face restrictions tomorrow. Users have very limited recourse when regulators act.'),
      ],
    },
    {
      title: 'Account Freezes — Even Without Exchange Failure',
      content: [
        para('Your account can be frozen even if the exchange itself is perfectly healthy. Reasons this happens:\n• KYC disputes — your identity verification is flagged for additional review\n• Suspicious activity flags — automated systems detect unusual behavior and lock the account pending review\n• Legal holds — your account is linked to an investigation, even as a third party\n• Government orders — a court or regulator orders your account frozen as part of a broader case\n• Geographic restrictions — the exchange changes its operating territory and your country is no longer supported\nIn any of these scenarios, your funds are inaccessible for an indeterminate period.'),
      ],
    },
    {
      title: 'The Deposit Insurance Problem',
      content: [
        para('In traditional banking, your deposits are typically insured by a government agency — up to a specified limit. In the US, FDIC insurance covers up to $250,000 per depositor per bank. In the EU, the Deposit Guarantee Scheme covers up to €100,000. Crypto exchanges do not have equivalent protection in most jurisdictions.'),
        para('Some exchanges maintain their own emergency funds — Binance\'s SAFU fund holds over $1 billion. But this is voluntary, not regulated, and covers only hacking incidents — not bankruptcy, fraud, or regulatory seizure. Coinbase\'s USD balances are FDIC-insured — but only the fiat currency portion. The crypto holdings are not insured.'),
        para('The bottom line: When you hold crypto on an exchange, you are an unsecured creditor of that exchange. If they fail for any reason, your crypto is part of their bankruptcy estate — not a separately protected asset.'),
      ],
    },
    {
      title: 'What "Self-Custody" Means',
      content: [
        para('Self-custody means holding your own private key — and therefore having direct control over your crypto without relying on any third party. When you self-custody:\n• You hold the private key — not an exchange\n• Nobody can freeze your account\n• Nobody can prevent you from sending or receiving\n• No exchange bankruptcy affects your holdings\n• No regulatory action against an exchange touches your funds'),
        para('The trade-off: you are entirely responsible for securing your private key. There is no customer support. There is no account recovery. Lose the private key and lose the funds — permanently, with no recourse. This trade-off is manageable — and Chapter 7 covers exactly how to handle it.'),
      ],
    },
    {
      title: 'When Keeping Crypto on an Exchange Is Acceptable',
      content: [
        para('Self-custody is the right long-term solution — but there are legitimate reasons to keep some funds on an exchange. Active trading: If you are regularly buying, selling, and trading — keeping funds on an exchange is operationally necessary. The key is keeping only your active trading allocation there — not your entire portfolio. Short-term holdings: If you plan to sell within days or a few weeks, the friction of moving to a personal wallet and back may not be worth it for small amounts. Learning phase: While you are in Phase 1 — buying your first $20–50 of Bitcoin — keeping it on the exchange temporarily is fine.'),
        para('The rule of thumb: Keep on exchange what you need for active trading. Move to personal wallet everything else.'),
      ],
    },
    {
      title: 'Frequently Asked Questions',
      content: [
        para('Is my crypto insured if the exchange is hacked? Usually not — unless the exchange has a specific emergency fund and the hack is covered by it. Binance\'s SAFU fund has covered past hacks. Most exchanges do not have equivalent protection. Assume your crypto on an exchange is uninsured unless the exchange explicitly states otherwise.'),
        para('What if I don\'t trust myself to manage a private key? This is a valid concern — and it is exactly why Chapter 7 covers wallet setup in detail. The mechanics of securing a private key are simpler than most people expect. You are writing down a 12 or 24-word phrase and storing it somewhere safe.'),
        para('Should I spread my funds across multiple exchanges to reduce risk? For active trading — yes, diversifying across exchanges reduces the risk that one failure wipes out your entire trading balance. For long-term holdings — the better solution is moving them off exchanges entirely into a personal wallet.'),
      ],
    },
    {
      title: 'Chapter Summary',
      content: [
        para('Exchange hack: Funds potentially stolen — recovery depends on exchange\'s safety net.\nExchange bankruptcy: Funds frozen — you become an unsecured creditor in legal proceedings.\nRegulatory seizure: Funds inaccessible — timeline for recovery unknown.\nAccount freeze: Your specific account locked — requires documentation to resolve.\nMismanagement: Exchange fails financially — users last in line for recovery.\nNo deposit insurance: Unlike banks, crypto exchanges offer no government-backed protection in most jurisdictions.\nThe single most important thing to remember: Crypto on an exchange is an IOU. Crypto in your own wallet — secured by a private key only you hold — is ownership.'),
      ],
    },
  ],
}

const phase1chapter6: ArticleData = {
  title: 'Why You Should Eventually Move to a Personal Wallet',
  level: 1,
  chapterIndex: 6,
  blurb: 'A personal wallet gives you direct ownership of your crypto — no exchange, no middleman, no counterparty risk. This chapter explains how wallets actually work, why your seed phrase is the most important thing you\'ll ever write down, and the exact steps to move Bitcoin from Binance to your own wallet.',
  description: 'A personal wallet gives you direct ownership of your crypto — no exchange, no middleman, no counterparty risk.',
  featured: false,
  author: 'Kumami Team',
  status: 'published',
  sections: [
    {
      title: 'Key Takeaways',
      content: [
        para('• A personal wallet gives you direct ownership of your crypto — no exchange, no middleman, no counterparty risk\n• Your wallet does not store crypto — it stores the private key that proves the crypto on the blockchain is yours\n• There are two main types of personal wallets: software (hot) and hardware (cold) — each with different trade-offs\n• Your seed phrase is the master key to everything — securing it properly is the most important action in this chapter\n• Moving crypto to a personal wallet is not complicated — but it requires attention to detail every single time'),
      ],
    },
    {
      title: 'The Difference Between Holding and Owning',
      content: [
        para('In Chapter 6 you learned that crypto held on an exchange is an IOU — the exchange holds the private key, not you. A personal wallet changes that entirely.'),
        para('When you move your Bitcoin to a personal wallet:\n• You hold the private key\n• The Bitcoin on the blockchain is directly controlled by you\n• No exchange, company, or government stands between you and your asset\n• Nobody can freeze it, confiscate it, or prevent you from sending it — as long as you have your private key'),
        para('This is what ownership in crypto actually means. Not a balance on a platform. Not an account number. Direct control over an asset recorded permanently on a global blockchain. The trade-off is responsibility. With full ownership comes full accountability. There is no customer support line. There is no account recovery. There is no "forgot my password" button. If you lose your private key — you lose your crypto. Permanently.'),
      ],
    },
    {
      title: 'How a Crypto Wallet Actually Works',
      content: [
        para('The name "wallet" is misleading. A crypto wallet does not store cryptocurrency. Your Bitcoin lives on the blockchain — a permanent public ledger maintained by thousands of computers worldwide. What your wallet stores is a private key — a unique cryptographic string that proves you have the right to move the Bitcoin associated with a specific address.'),
        para('Think of it this way:\n• The blockchain is a public safe deposit vault that everyone can see but nobody can open without a key\n• Your wallet address is the box number — public, visible to anyone, used to receive funds\n• Your private key is the key to that box — secret, known only to you, used to authorize transactions\n• Your seed phrase is the master key that can recreate your private key on any device\nYou do not move Bitcoin into your wallet. You move the authority to control Bitcoin. The Bitcoin itself never leaves the blockchain.'),
      ],
    },
    {
      title: 'The Seed Phrase — The Most Important Thing in This Chapter',
      content: [
        para('When you set up a personal wallet, it generates a seed phrase — also called a recovery phrase or mnemonic phrase. It looks like this: witch collapse practice feed shame open despair creek road again ice least. Twelve or twenty-four ordinary English words, in a specific order. That sequence of words is a human-readable representation of your private key. Anyone who has those words — in that order — has complete control over every wallet and every asset associated with them.'),
        para('What your seed phrase can do:\n• Recreate your wallet on any compatible device\n• Recover your funds if your phone or computer is lost, stolen, or destroyed\n• Access your funds if the wallet app stops working or the company shuts down\n• Give complete control to anyone who obtains it'),
        para('If you lose your seed phrase and lose access to your device — your funds are gone. Permanently. No company can recover them. No court order can unlock them. The blockchain does not know your name. If someone else obtains your seed phrase — they can drain your wallet completely. Immediately. Irreversibly. There is no middle ground. The seed phrase is everything.'),
      ],
    },
    {
      title: 'How to Store Your Seed Phrase Safely',
      content: [
        para('Write it down on paper. By hand. Do not type it into your phone. Do not take a screenshot. Do not email it to yourself. Do not store it in Google Drive, iCloud, Dropbox, or any cloud service. Every digital storage method can be hacked, breached, or accessed by a third party. Write the words on paper. Number them in order. Check them twice.'),
        para('Store it somewhere physically secure. Not in your wallet. Not in a drawer next to your computer. Options: a fireproof safe, a safety deposit box at a bank, a secure location only you know about.'),
        para('Make a second copy and store it separately. If your only copy is in one location and that location is destroyed — fire, flood, theft — your funds are gone.'),
        para('Never share it with anyone. Ever. No legitimate wallet company, exchange, or support team will ever ask for your seed phrase. If anyone asks for it — they are attempting to steal your funds.'),
        para('Do not photograph it. Photo storage syncs to the cloud automatically on most phones. Your iCloud or Google Photos album is not a secure location for a seed phrase.'),
      ],
    },
    {
      title: 'Types of Personal Wallets',
      content: [
        para('There are two main categories of personal wallet — each suited to different amounts and use cases.'),
        para('Software Wallets (Hot Wallets): A software wallet is an app — on your phone or computer — that stores your private key on the device. Advantages: Free to use. Easy to set up — takes under 10 minutes. Convenient for regular transactions. Accessible from anywhere with your device. Compatible with most Web3 applications — DeFi, NFTs, DAOs. Risks: Your device is connected to the internet — malware and phishing attacks can potentially access your private key. Best for: Beginners learning self-custody, small to moderate amounts.'),
        para('Recommended software wallets:\nMetaMask — Best for Ethereum and EVM-compatible chains\nPhantom — Best for Solana ecosystem, also supports Ethereum, Bitcoin, Polygon\nTrust Wallet — Best for multi-chain mobile users (100+ blockchains)\nRabby — Best for advanced Ethereum users'),
        para('For Phase 1 — buying Bitcoin and learning the basics — Phantom is a good multi-chain option. MetaMask is the better choice when you move into Ethereum-based DeFi in Phase 3.'),
      ],
    },
    {
      title: 'Hardware Wallets (Cold Wallets)',
      content: [
        para('A hardware wallet is a physical device — roughly the size of a USB drive — that stores your private key completely offline. How it works: Your private key is generated and stored inside the hardware device and never leaves it. When you want to make a transaction, you connect the device, review the transaction on the device\'s screen, and physically confirm it by pressing a button. The transaction is signed inside the device — your private key is never exposed to the internet.'),
        para('Advantages:\n• Private key never touches the internet — immune to remote hacking\n• Physical confirmation required for every transaction\n• Industry standard for securing significant crypto holdings\n• Works even if the company that made it goes out of business — your seed phrase works with any compatible wallet'),
        para('Risks: Costs money — $79 to $179 depending on model. Slightly more friction for regular transactions. Must be purchased from the official manufacturer — never from third-party sellers on Amazon or eBay (devices can be tampered with).'),
        para('Recommended hardware wallets:\nLedger Nano X — ~$149 — Most users — supports 5,500+ coins, Bluetooth, mobile compatible\nLedger Nano S Plus — ~$79 — Budget option — excellent security, USB only\nTrezor Model T — ~$179 — Open-source advocates — fully open-source firmware\nTrezor Safe 3 — ~$79 — Budget Trezor option — strong security, open source'),
        para('Important note on Ledger: In 2023, Ledger introduced a "Recover" service that optionally backs up your seed phrase to encrypted cloud storage. This generated significant controversy — because it demonstrated that the device\'s firmware could theoretically access and transmit the seed phrase. This does not affect the default security of the device if you do not use the Recover service.'),
        para('The practical rule: Start with a software wallet for Phase 1. Once your holdings exceed an amount you would be genuinely upset to lose — invest in a hardware wallet. Most experienced crypto participants use both: a software wallet for day-to-day Web3 interactions and a hardware wallet for long-term storage.'),
      ],
    },
    {
      title: 'How to Set Up a Software Wallet — Step by Step',
      content: [
        para('This walkthrough uses Phantom — recommended for Phase 1 as it supports Bitcoin natively.'),
        para('Step 1 — Download from the official source only. Go to phantom.com directly. Do not search "Phantom wallet" on Google and click the first result — phishing sites appear as paid ads and look identical to the real thing.'),
        para('Step 2 — Create a new wallet. Open Phantom → Select "Create a new wallet" → Set a strong password. This password protects the wallet on your specific device. It is not your seed phrase.'),
        para('Step 3 — Write down your seed phrase. Phantom will display your 12-word seed phrase. Before writing anything down: Make sure nobody can see your screen. Get a pen and paper ready. Write every word in order, exactly as shown. Number each word (1 through 12). Double-check every word before clicking continue.'),
        para('Step 4 — Verify your seed phrase. Phantom will ask you to confirm your seed phrase by selecting words in order. If you cannot complete this step — you did not write it down accurately. Start over.'),
        para('Step 5 — Store your seed phrase. Follow the seed phrase storage rules covered earlier in this chapter. Before you do anything else — before you send a single dollar to this wallet — your seed phrase needs to be securely stored.'),
        para('Step 6 — Find your wallet address. Your wallet address is the string of characters displayed at the top of the Phantom interface. For Bitcoin, it will start with "bc1" or "1". This is the address you will use to receive Bitcoin from your exchange.'),
      ],
    },
    {
      title: 'How to Transfer Bitcoin from Your Exchange to Your Wallet',
      content: [
        para('Once your wallet is set up and your seed phrase is secured:'),
        para('Step 1 — Copy your wallet address. Open Phantom → Select Bitcoin → Tap "Receive" → Copy the address. Triple-check the address is exactly correct. One wrong character sends your Bitcoin to an inaccessible address permanently.'),
        para('Step 2 — Go to your exchange. Navigate to your exchange\'s withdrawal section. Select Bitcoin as the asset.'),
        para('Step 3 — Select the correct network. For Bitcoin — select the Bitcoin network (BTC). Not wrapped Bitcoin (WBTC). Not Bitcoin on another chain. Native Bitcoin on the Bitcoin network.'),
        para('Step 4 — Paste your wallet address. Paste — do not type — your Phantom wallet address into the destination field. After pasting, compare the first 4 characters and last 4 characters against your wallet to confirm it pasted correctly.'),
        para('Step 5 — Send a test transaction first. For your very first transfer — send the minimum amount allowed. Confirm it arrives in your wallet before sending the rest. This costs you a small network fee — consider it insurance against sending the full amount to a wrong address.'),
        para('Step 6 — Confirm the test transaction arrived. Open Phantom and check your Bitcoin balance. You can also verify the transaction by searching your wallet address on mempool.space — Bitcoin\'s most widely used block explorer.'),
        para('Step 7 — Send the remaining balance. Once the test transaction is confirmed, send the rest of your Bitcoin from the exchange to the same wallet address.'),
      ],
    },
    {
      title: 'Understanding Network Fees',
      content: [
        para('Every transaction on the Bitcoin blockchain costs a small fee — paid to the miners who process and validate it. This fee is not paid to your exchange or your wallet app. It goes directly to the network. Fees are measured in satoshis per byte of transaction data. Higher fees = faster confirmation. Lower fees = slower confirmation.'),
        para('For small Phase 1 transfers: Bitcoin network fees can sometimes exceed the value of a small transfer. If you are moving $20–50, check the current fee level before sending. During periods of high network activity, fees can be $5–15 per transaction. How to check current fees: Go to mempool.space. The homepage shows the current recommended fee levels and estimated confirmation times at each fee rate.'),
      ],
    },
    {
      title: 'What Self-Custody Does Not Protect Against',
      content: [
        para('Self-custody solves counterparty risk — the risk that an exchange fails. But it introduces new risks you are solely responsible for managing:\n• Seed phrase loss — If you lose your seed phrase and lose access to your device — your funds are gone. No recovery is possible.\n• Seed phrase theft — If someone obtains your seed phrase — through physical access, social engineering, or a compromised device — they can drain your wallet immediately and irreversibly.\n• Sending to wrong address — Crypto transactions are irreversible. If you send Bitcoin to a wrong address — a typo, a different network, a copied address manipulated by clipboard malware — those funds cannot be recovered.\n• Device malware — A software wallet on a compromised device is at risk.\n• Phishing attacks — Fake wallet websites, fake browser extension updates, fake customer support — all designed to steal your seed phrase.'),
      ],
    },
    {
      title: 'Frequently Asked Questions',
      content: [
        para('What if I lose my phone with my wallet on it? As long as you have your seed phrase — you have your funds. Download the wallet app on a new device, select "Import existing wallet," enter your seed phrase in order, and your wallet and all its funds are fully restored.'),
        para('Can I have the same wallet on multiple devices? Yes. Your seed phrase recreates the same wallet on any compatible device. The security consideration: each device that holds the wallet is a potential attack surface.'),
        para('Is MetaMask or Phantom safer than keeping funds on Binance? For counterparty risk — yes, significantly. Your funds are not subject to exchange bankruptcy, hacks, or regulatory freezes. For device security risk — it depends on how well your device is secured.'),
        para('What happens to my wallet if the wallet company shuts down? Nothing — because your funds are not held by the wallet company. They are on the blockchain, controlled by your private key. If Phantom or MetaMask shuts down tomorrow, you can import your seed phrase into any compatible wallet and access your funds immediately.'),
      ],
    },
    {
      title: 'Chapter Summary',
      content: [
        para('What a wallet stores: Your private key — not your crypto. Crypto lives on the blockchain.\nThe seed phrase: 12–24 words that recreate your private key on any device. Treat it like cash.\nSoftware wallet: App on your device. Free. Convenient. Good for small amounts and active use.\nHardware wallet: Physical device. Paid. Offline. Best for significant long-term holdings.\nHow to transfer: Copy address → select correct network → test transaction first → verify → send remainder.\nWhat self-custody doesn\'t fix: Seed phrase loss, wrong address transfers, device malware, phishing.'),
      ],
    },
  ],
}

// ── Phase 2 articles (level: 2) ──────────────────────────────────────────────

const phase2chapter0: ArticleData = {
  title: 'What Is Blockchain and Why It Exists',
  level: 2,
  chapterIndex: 0,
  blurb: 'Blockchain is a shared database that nobody owns and nobody can tamper with. Built in response to the 2008 financial crisis, it removes the need for institutional trust by recording every transaction permanently across thousands of computers worldwide.',
  description: 'Blockchain is a shared database that nobody owns and nobody can tamper with.',
  featured: true,
  author: 'Kumami Team',
  status: 'published',
  sections: [
    {
      title: 'Key Takeaways',
      content: [
        para('• Blockchain is a shared database that nobody owns and nobody can tamper with\n• It was created in 2008 to remove the need for banks and middlemen in financial transactions\n• Every transaction ever made is recorded permanently and visible to anyone\n• Three properties make it work: decentralization, immutability, and transparency\n• The Bitcoin you bought in Phase 1 lives on exactly this kind of system — now you\'ll understand how'),
      ],
    },
    {
      title: 'What Is Blockchain?',
      content: [
        para('Blockchain is a type of database. But it works very differently from any database you\'ve used before. A normal database is stored on servers owned by one company. That company controls who can access it, who can edit it, and what happens to your data. If they make a mistake, get hacked, or decide to freeze your account, there\'s very little you can do about it.'),
        para('Blockchain removes that single point of control entirely. Instead of one company holding one copy of the database, blockchain stores identical copies across thousands of computers around the world simultaneously. There is no headquarters. No CEO. No single server that can be switched off. Every transaction ever made is recorded in chronological order. Once recorded, it cannot be changed or deleted — not by any government, company, or hacker. The record is permanent. That\'s the core idea: a shared record that nobody owns and nobody can alter.'),
      ],
    },
    {
      title: 'Why Was It Built?',
      content: [
        para('Blockchain wasn\'t invented in a lab. It was invented in response to a crisis. In 2008, the global financial system collapsed. Banks that had been trusted for decades revealed they had been making reckless bets with customer money. Governments bailed them out using public funds. Millions of ordinary people lost their savings, their homes, and their jobs — while the banks responsible faced no consequences.'),
        para('On October 31, 2008 — in the middle of that crisis — an anonymous person or group using the name Satoshi Nakamoto published a 9-page document titled: "Bitcoin: A Peer-to-Peer Electronic Cash System." The first block of the Bitcoin blockchain, mined on January 3, 2009, contained a hidden message: "The Times 03/Jan/2009 Chancellor on brink of second bailout for banks." It was a newspaper headline from that exact day. And it was a statement of intent.'),
        para('Blockchain was built to answer one question: What if you didn\'t need to trust a bank or any single institution at all?'),
      ],
    },
    {
      title: 'How Does It Actually Work?',
      content: [
        para('Think of blockchain like a Google Doc, but with three critical differences:\n\nGoogle Doc vs Blockchain:\nGoogle owns the server vs Thousands of computers share identical copies\nGoogle can delete or edit anything vs Nobody can edit a confirmed record\nGoogle can shut it down vs No single point of shutdown\nYou need Google\'s permission vs Anyone can access, anywhere, anytime'),
        para('When a transaction happens on a blockchain, here\'s what occurs:\nStep 1 — Broadcast: The transaction is sent to the network. Thousands of computers see it simultaneously.\nStep 2 — Validate: The network checks the transaction is legitimate — the sender has the funds, the signature is real.\nStep 3 — Group: The transaction is bundled with others into a "block."\nStep 4 — Add: The block is added to the chain of all previous blocks permanently, in order.\nStep 5 — Update: Every computer on the network updates their copy at the same time.'),
        para('This is exactly what happened when you bought Bitcoin on Binance. When you eventually withdraw that Bitcoin to your own wallet, this is the process that records the transfer permanently, on a public ledger, with no bank in the middle.'),
      ],
    },
    {
      title: 'The Three Properties That Make It Work',
      content: [
        para('Decentralization: No single entity controls the network. Thousands of independent computers called nodes each hold a complete copy of the entire blockchain. To attack it, you\'d need to simultaneously control more than 50% of all nodes. For a network the size of Bitcoin or Ethereum, that\'s practically impossible.'),
        para('Immutability: Each block contains a mathematical fingerprint of the block before it — called a hash. Change one record and you change the fingerprint, breaking every block after it. To alter history, you\'d need to redo the entire chain faster than the honest network adds new blocks. The computational cost makes this economically impossible.'),
        para('Transparency: Every transaction is publicly visible. Not your name, just your wallet address and the transaction details. This creates accountability without requiring you to identify yourself. Anyone can verify any transaction ever made.'),
      ],
    },
    {
      title: 'What Can Blockchain Actually Be Used For?',
      content: [
        para('Most people associate blockchain only with cryptocurrency. That\'s just the first application. The underlying technology — a tamper-proof shared record that nobody controls — has far wider uses.'),
        para('Money and payments — Send money anywhere in the world in minutes for cents. No bank, no intermediary.\nOwnership — Prove you own a digital asset: art, music, intellectual property — without a lawyer or registrar.\nContracts — Agreements that execute automatically when conditions are met.\nIdentity — Control your own personal data without handing it to a centralized company.\nSupply chain — Track a product from factory to consumer with a permanent, tamper-proof record.\nVoting — Cast and count votes that cannot be manipulated or deleted.'),
        para('The common thread: remove the middleman. Remove the single point of control. Remove the single point of failure.'),
      ],
    },
    {
      title: 'Common Misconceptions',
      content: [
        para('"Blockchain is anonymous." It\'s pseudonymous, not anonymous. Your wallet address is public, but it isn\'t directly linked to your real name. If your wallet is ever connected to your identity through an exchange like Binance, a public post, or on-chain behavior — your entire transaction history becomes visible.'),
        para('"Blockchain is unhackable." The blockchain itself has never been successfully hacked. But the things built on top of it — exchanges, wallets, and smart contracts — can be and regularly are. The code is secure. The humans using it are the vulnerability.'),
        para('"All blockchains are the same." They\'re not. Bitcoin is optimized for security and storing value. Ethereum is optimized for running applications. Solana is optimized for speed.'),
        para('"Blockchain is only for crypto." Crypto is the first application. The technology is general purpose.'),
      ],
    },
    {
      title: 'Frequently Asked Questions',
      content: [
        para('Do I need to understand the technical details to use blockchain? No. You don\'t need to understand how Binance\'s matching engine works to buy Bitcoin on it. You just need to understand what blockchain does and why it matters.'),
        para('Is blockchain the same as Bitcoin? No. Bitcoin is a currency that runs on a blockchain. Blockchain is the underlying technology.'),
        para('Who controls the blockchain? Nobody — and everybody. The rules are written in code. The code runs automatically. Participants in the network agree to follow those rules.'),
        para('Can blockchain be shut down? A public blockchain like Bitcoin or Ethereum cannot be shut down by any single actor, because thousands of independent computers run it simultaneously.'),
      ],
    },
    {
      title: 'Chapter Summary',
      content: [
        para('What blockchain is: A shared database nobody owns where records cannot be changed.\nWhy it was built: To remove the need for institutional trust after the 2008 financial crisis.\nHow it works: Transactions grouped into blocks, chained together, copied across thousands of computers.\nThree core properties: Decentralization · Immutability · Transparency.\nConnection to Phase 1: The Bitcoin you bought on Binance ultimately lives on exactly this kind of system.'),
      ],
    },
  ],
}

const phase2chapter1: ArticleData = {
  title: 'What Is Bitcoin — The Original Use Case',
  level: 2,
  chapterIndex: 1,
  blurb: 'Bitcoin is the first real-world application of blockchain technology — digital money that nobody controls. With only 21 million ever to exist, and a halving cycle that reduces new supply every four years, Bitcoin\'s scarcity is hardcoded and cannot be changed by anyone.',
  description: 'Bitcoin is the first real-world application of blockchain technology — digital money that nobody controls.',
  featured: false,
  author: 'Kumami Team',
  status: 'published',
  sections: [
    {
      title: 'Key Takeaways',
      content: [
        para('• Bitcoin is the first real-world application of blockchain technology — digital money that nobody controls\n• It was designed to let two people transact directly without a bank, government, or any third party\n• Only 21 million Bitcoin will ever exist — this scarcity is hardcoded and cannot be changed\n• Bitcoin is secured by a global network of computers competing to validate transactions\n• The Bitcoin sitting in your Binance account right now is governed by all of these rules'),
      ],
    },
    {
      title: 'What Is Bitcoin?',
      content: [
        para('Bitcoin is money, but it works completely differently from any money you\'ve used before. Regular money — the kind in your bank account — is created and controlled by governments and central banks. They decide how much of it exists. They can print more whenever they want. They can freeze accounts, reverse transactions, and block payments to anyone for any reason. You don\'t actually own the money in your bank account. You have a promise from the bank that they\'ll give it to you when you ask.'),
        para('Bitcoin removes all of that. Bitcoin is a digital currency that exists only on the blockchain you learned about in the previous chapter. Nobody created it after the fact. Nobody controls it. Nobody can freeze it, print more of it, or stop you from sending it to anyone in the world. When you hold Bitcoin in your own wallet — you own it completely. Not a promise. Not a balance on Binance\'s internal ledger. The actual asset.'),
      ],
    },
    {
      title: 'Why Did Bitcoin Need to Exist?',
      content: [
        para('To understand Bitcoin, you need to understand one problem that existed before it: the double-spend problem. Digital files can be copied infinitely. If you send someone a photo, you still have the photo. This is great for sharing files. It\'s catastrophic for money. Before Bitcoin, digital money always required a trusted middleman — a bank, or a payment processor — to keep the official record of who owns what.'),
        para('The middleman solves the problem. But the middleman is also the vulnerability. They can: charge fees on every transaction, freeze your account without explanation, go bankrupt and take your money with them, be hacked or pressured by governments, and exclude billions of people who don\'t have access to banking.'),
        para('Satoshi Nakamoto\'s breakthrough was solving the double-spend problem without a middleman, using mathematics and a global network of computers instead of institutional trust. Bitcoin was the proof that it worked.'),
      ],
    },
    {
      title: 'How Does Bitcoin Actually Work?',
      content: [
        para('Bitcoin runs on the blockchain. Understanding Bitcoin specifically requires understanding three things: wallets, transactions, and mining.'),
        para('Wallets: A Bitcoin wallet doesn\'t actually store Bitcoin. It stores a private key — a unique string of numbers and letters that proves you own the Bitcoin associated with a specific address on the blockchain. Your wallet address is like your email address — public, shareable, used to receive Bitcoin. Your private key is like your password — secret, never shared, used to authorize transactions. The Bitcoin itself lives on the blockchain. Your wallet just holds the key that proves it\'s yours.'),
        para('Transactions: When Bitcoin moves on the blockchain: Step 1 — A transaction is created: "Send 0.1 BTC from this address to that address." Step 2 — It\'s signed with a private key — cryptographic proof of authorization. Step 3 — The transaction is broadcast to the Bitcoin network — thousands of computers see it simultaneously. Step 4 — Miners validate the transaction. Step 5 — The transaction is added to the blockchain permanently. It cannot be reversed. From your end, this takes minutes. From the network\'s end, it\'s a global consensus process involving hundreds of thousands of computers.'),
      ],
    },
    {
      title: 'Mining',
      content: [
        para('Mining is how Bitcoin transactions get validated and added to the blockchain — and how new Bitcoin is created. Miners are computers that compete to solve a complex mathematical puzzle. The first one to solve it gets to add the next block of transactions to the blockchain — and receives a reward of newly created Bitcoin for doing so. This competition is called Proof of Work.'),
        para('Key mining facts:\n• A new block is added approximately every 10 minutes\n• Each block currently rewards miners with 3.125 BTC — this reward halves every 210,000 blocks in an event called the halving\n• The last Bitcoin will be mined around the year 2140\n• There are currently over 19.7 million BTC in circulation out of the 21 million maximum'),
      ],
    },
    {
      title: 'The 21 Million Cap — Why It Matters',
      content: [
        para('Satoshi hardcoded a maximum supply of 21 million Bitcoin into the protocol. No more can ever be created. Not by miners. Not by developers. Not by any government or institution.'),
        para('Bitcoin vs US Dollar comparison:\nMaximum supply — 21 million fixed forever (Bitcoin) vs No limit, government decides (Dollar)\nWho controls supply — Nobody, hardcoded in the protocol (Bitcoin) vs Federal Reserve (Dollar)\nCan more be created — No (Bitcoin) vs Yes, and regularly is (Dollar)\nHistorical inflation — Deflationary by design (Bitcoin) vs Purchasing power fell ~97% since 1913 (Dollar)'),
        para('This fixed supply is why many people refer to Bitcoin as "digital gold." Like gold, it is scarce, cannot be manufactured at will, and its value is determined entirely by demand against a fixed supply.'),
      ],
    },
    {
      title: 'The Halving',
      content: [
        para('Every 210,000 blocks — approximately every four years — the Bitcoin mining reward is cut in half.\n\n2009: 50 BTC per block\n2012: 25 BTC per block\n2016: 12.5 BTC per block\n2020: 6.25 BTC per block\n2024: 3.125 BTC per block\n2028 (estimated): 1.5625 BTC per block'),
        para('The halving reduces the rate at which new Bitcoin enters circulation. Basic economics: when supply growth slows and demand stays the same or increases, price tends to go up. Every major Bitcoin bull market in history has occurred within 12–18 months of a halving. This isn\'t a guarantee, but it\'s a pattern worth understanding before you invest a single dollar.'),
      ],
    },
    {
      title: 'What Bitcoin Is NOT',
      content: [
        para('Bitcoin is not a company. There is no Bitcoin Inc. No headquarters. No CEO who can be arrested and take the network down with them.'),
        para('Bitcoin is not anonymous. Every transaction is permanently visible on the blockchain. Bitcoin is pseudonymous — your address is public, but not directly linked to your name.'),
        para('Bitcoin is not only for criminals. The overwhelming majority of Bitcoin transactions are legitimate.'),
        para('Bitcoin is not a get-rich-quick scheme. Bitcoin has had drawdowns of 50–80% from peak multiple times in its history.'),
        para('Bitcoin is not Ethereum, Solana, or any other cryptocurrency. Bitcoin does one thing and does it well: store and transfer value.'),
      ],
    },
    {
      title: 'Frequently Asked Questions',
      content: [
        para('How do I get more Bitcoin? The same way you got your first — buy more on Binance, or earn it as payment. You\'ll learn about other acquisition methods, including DeFi, in Phase 3.'),
        para('Is Bitcoin safe to invest in? Bitcoin is highly volatile. It has gained significantly over its lifetime — and also dropped 80% from peak multiple times. Never invest more than you can afford to lose entirely.'),
        para('What gives Bitcoin its value? The same things that give any scarce asset value: scarcity, utility, network effects, and collective belief. Bitcoin has a fixed supply, a global network of users, and 15+ years of track record.'),
        para('Who owns the most Bitcoin? The largest known holder is Satoshi Nakamoto — estimated to hold approximately 1 million BTC that has never moved.'),
        para('What happens to Bitcoin miners when all 21 million are mined? Miners will be compensated entirely by transaction fees instead of block rewards. This transition is built into the protocol and expected to complete around 2140.'),
      ],
    },
    {
      title: 'Chapter Summary',
      content: [
        para('What Bitcoin is: Digital money nobody controls — owned entirely by whoever holds the private key.\nThe problem it solved: Double-spend without a middleman — using math instead of trust.\nHow it works: Wallets hold keys, transactions are validated by miners, everything recorded on blockchain.\nThe 21M cap: Fixed supply hardcoded into the protocol — cannot be changed by anyone.\nMining: Computers compete to validate transactions and earn newly created Bitcoin as reward.\nThe halving: Mining reward halves every ~4 years — historically precedes bull markets.'),
      ],
    },
  ],
}

const phase2chapter2: ArticleData = {
  title: 'What Is Ethereum — And Why "Programmable Money" Matters',
  level: 2,
  chapterIndex: 2,
  blurb: 'Bitcoin solved money. Ethereum asked a bigger question: what if the blockchain could run any application — not just currency? Ethereum introduced smart contracts, enabling DeFi, NFTs, DAOs, and most of what people call "Web3" to exist without any company\'s permission.',
  description: 'Ethereum extends blockchain beyond money because it can run actual programs, called smart contracts.',
  featured: false,
  author: 'Kumami Team',
  status: 'published',
  sections: [
    {
      title: 'Key Takeaways',
      content: [
        para('• Ethereum extends blockchain beyond money because it can run actual programs, called smart contracts\n• "Programmable money" means code can move funds automatically based on conditions — no human required\n• Ethereum is the foundation for DeFi, NFTs, DAOs, and most of what people mean by "Web3"\n• Ether (ETH) is both a currency and the fuel that powers every action on the Ethereum network\n• Bitcoin answered "can money exist without a bank?" Ethereum answered "can an entire financial system exist without a company?"'),
      ],
    },
    {
      title: 'Why Bitcoin Wasn\'t Enough',
      content: [
        para('Bitcoin proved something remarkable: you can send value across the world without a bank. But Bitcoin was deliberately built to do one thing well — store and transfer value. It does not run applications. It does not execute complex agreements. It is, by design, simple and limited.'),
        para('In 2013, a 19-year-old programmer named Vitalik Buterin published a whitepaper asking a bigger question: What if a blockchain could do more than just track who owns what coin? What if it could run actual programs automatically, without anyone able to stop or alter them? That question became Ethereum, launched in 2015.'),
      ],
    },
    {
      title: 'What Is Ethereum?',
      content: [
        para('Ethereum is a blockchain, built on the same core principles: decentralization, immutability, transparency. But Ethereum adds one critical capability Bitcoin does not have: it can execute code.'),
        para('Bitcoin vs Ethereum comparison:\nWhat it is — A ledger that tracks who owns what (Bitcoin) vs A ledger that tracks who owns what and runs programs (Ethereum)\nBest analogy — A calculator — does one thing well (Bitcoin) vs A smartphone — runs any app you build for it (Ethereum)\nWhat you can build — Just transactions (Bitcoin) vs Apps, agreements, entire financial systems (Ethereum)'),
        para('Ethereum didn\'t just create a new currency. It created a global, decentralized computer that anyone can build on and nobody can shut down.'),
      ],
    },
    {
      title: 'What Is a Smart Contract?',
      content: [
        para('A smart contract is the core innovation that makes Ethereum powerful. It is a program stored on the blockchain that executes automatically when specific conditions are met. No human approves it. No company processes it. No bank authorizes it. The code runs exactly as written, every time, for everyone.'),
        para('A simple real-world analogy: the vending machine. A vending machine is a primitive smart contract. You don\'t need to trust the company that owns it, or negotiate with an employee. You insert money, select an item, and the machine automatically gives you what you paid for. No human judgment involved.'),
        para('A smart contract can:\n• Automatically swap one cryptocurrency for another at a fair market rate\n• Hold funds in escrow until both parties confirm a deal is complete\n• Pay out an insurance claim automatically when a verifiable condition is met\n• Distribute rewards to thousands of people simultaneously, with no manual processing\n• Lend you money against collateral with no bank, no credit check, no human loan officer'),
      ],
    },
    {
      title: 'What "Programmable Money" Actually Means',
      content: [
        para('Bitcoin is money you can send. That\'s it. Simple, secure, limited. Ethereum\'s Ether is money you can program. You can write rules into the money itself — or into contracts that control the money — and those rules execute automatically, with no human in the loop.'),
        para('Example: Imagine you want to say: "Send $100 to my landlord automatically, every month, but only if my account balance is above $500 and if it ever drops below that, send a partial amount instead, calculated automatically." A bank cannot easily do this without complex rules behind the scenes, with fees and delays. A smart contract on Ethereum can encode this exact logic once, and it will execute precisely, forever, with no one needing to intervene. That is programmable money.'),
      ],
    },
    {
      title: 'What Ethereum Enabled',
      content: [
        para('Because Ethereum can run smart contracts, an entire ecosystem of applications became possible that simply cannot exist on Bitcoin.'),
        para('DeFi (Decentralized Finance): Lending, borrowing, trading, and earning interest — all without a bank. Every DeFi application is, at its core, a collection of smart contracts running on Ethereum or a similar smart-contract blockchain.'),
        para('NFTs (Non-Fungible Tokens): A smart contract that proves unique digital ownership of art, music, game items, or real-world assets.'),
        para('DAOs (Decentralized Autonomous Organizations): Organizations governed by smart contracts and member votes instead of a traditional company structure.'),
        para('Stablecoins: Tokens like USDC that are programmed to maintain a stable value, typically pegged to the US dollar, built and managed through smart contracts.'),
        para('Tokenization: The ability to represent literally anything — a share of a company, a piece of real estate, a loyalty point — as a programmable token on the blockchain.'),
        para('None of this requires a company\'s permission to exist. Once a smart contract is deployed to Ethereum, it runs forever, exactly as written, accessible to anyone in the world.'),
      ],
    },
    {
      title: 'What Is Ether (ETH)?',
      content: [
        para('Ether is Ethereum\'s native currency but it serves two distinct purposes.'),
        para('1. Ether as money: Like Bitcoin, Ether can be sent, held, and used as a store of value or medium of exchange.'),
        para('2. Ether as "gas" — the fuel for computation: This is unique to Ethereum. Every action on the Ethereum network — sending a transaction, interacting with a smart contract, swapping a token — requires a small amount of Ether to pay for the computational work involved. This payment is called gas.'),
        para('Why gas exists: Running a smart contract requires real computing resources from the thousands of nodes maintaining the network. Gas fees compensate those nodes and prevent the network from being clogged with spam or infinite-loop programs that would otherwise run forever for free.'),
      ],
    },
    {
      title: 'Ethereum vs. Bitcoin — Side by Side',
      content: [
        para('Launched: 2009 (Bitcoin) vs 2015 (Ethereum)\nCreated by: Satoshi Nakamoto, anonymous (Bitcoin) vs Vitalik Buterin and team (Ethereum)\nPrimary purpose: Digital store of value (Bitcoin) vs Programmable global computing platform (Ethereum)\nCan run smart contracts: No, by design (Bitcoin) vs Yes (Ethereum)\nMaximum supply: 21 million — fixed (Bitcoin) vs No fixed cap — supply changes based on network activity (Ethereum)\nNative asset: Bitcoin (BTC) vs Ether (ETH)\nOften compared to: Digital gold (Bitcoin) vs A global, decentralized app platform (Ethereum)'),
        para('An important nuance: Bitcoin and Ethereum are not competitors trying to do the same thing better. They are solving different problems. Bitcoin optimizes for being the most secure, simple store of value possible. Ethereum optimizes for being the most flexible platform for building decentralized applications.'),
      ],
    },
    {
      title: 'Frequently Asked Questions',
      content: [
        para('Do I need to learn to code to use Ethereum? No. You\'ll interact with smart contracts through simple interfaces like apps and websites. Coding becomes relevant only if you want to build your own smart contracts, covered in Phase 5.'),
        para('Can smart contracts be hacked? Yes. A smart contract is only as secure as the code it\'s written in. Bugs in smart contract code have led to major losses across DeFi history.'),
        para('What does "Ethereum killer" mean? It refers to newer blockchains like Solana, Avalanche, and others that aim to offer similar smart contract capabilities with different tradeoffs — usually faster speed or lower fees.'),
        para('Why does Ethereum need gas fees at all? Free computation would mean anyone could write a program that runs forever, consuming the network\'s resources at no cost — effectively breaking the system for everyone. Gas fees ensure computational resources are used efficiently.'),
      ],
    },
    {
      title: 'Chapter Summary',
      content: [
        para('What Ethereum is: A blockchain that can run programs, not just track currency.\nWhat a smart contract is: Code on the blockchain that executes automatically when conditions are met.\nProgrammable money: Money with rules built directly into it — executing without human approval.\nWhat Ethereum enabled: DeFi, NFTs, DAOs, stablecoins, and tokenization.\nWhat Ether (ETH) is: Both a currency and the "gas" that pays for computation on the network.\nBitcoin vs Ethereum: Different tools for different jobs — store of value vs. programmable platform.'),
      ],
    },
  ],
}

const phase2chapter3: ArticleData = {
  title: 'What Are Layer 1 and Layer 2 Blockchains',
  level: 2,
  chapterIndex: 3,
  blurb: 'Ethereum\'s success created a congestion problem — too many people, not enough space, and gas fees that sometimes hit $100 per transaction. Layer 2 blockchains solve this without abandoning Ethereum\'s security, and understanding this distinction is essential before you send crypto between chains.',
  description: 'A Layer 1 is a standalone blockchain with its own network of validators — Bitcoin, Ethereum, and Solana are all Layer 1s.',
  featured: false,
  author: 'Kumami Team',
  status: 'published',
  sections: [
    {
      title: 'Key Takeaways',
      content: [
        para('• A Layer 1 is a standalone blockchain with its own network of validators — Bitcoin, Ethereum, and Solana are all Layer 1s\n• A Layer 2 is a separate network built on top of a Layer 1 to make it faster and cheaper, while still relying on it for security\n• Ethereum\'s popularity created a problem — too many people, not enough space — which is exactly why Layer 2s exist\n• Layer 2s are not a separate "lesser" blockchain but inherit Ethereum\'s security while solving its speed and cost problems\n• Understanding this distinction explains why you\'ll see "ETH" and "Arbitrum" or "Base" mentioned together — they\'re connected, not competing'),
      ],
    },
    {
      title: 'The Problem Ethereum Created',
      content: [
        para('Ethereum lets you run programs — smart contracts — directly on the blockchain. This unlocked DeFi, NFTs, DAOs, and an entire ecosystem of applications. But Ethereum\'s design has a tradeoff: every single transaction has to be processed by every node maintaining the network. This is what makes Ethereum secure and decentralized, but it also means Ethereum can only process a limited number of transactions per second.'),
        para('When demand is high — when thousands of people want to use Ethereum at the same time — two things happen:\n• Transactions slow down — your transaction has to wait in line behind everyone else\'s\n• Gas fees spike — people compete by paying more gas to get their transaction processed faster, driving the price up for everyone'),
        para('During peak periods, gas fees on Ethereum have spiked to $50, $100, or even higher for a single simple transaction. For a beginner wanting to swap $20 worth of tokens, paying $40 in gas fees makes no sense. This is the exact problem that Layer 2 blockchains were built to solve.'),
      ],
    },
    {
      title: 'What Is a Layer 1?',
      content: [
        para('A Layer 1 is a standalone, independent blockchain. It has its own network of validators or miners, its own consensus mechanism, and its own native token. It does not depend on any other blockchain to function.'),
        para('Examples of Layer 1 blockchains:\nBitcoin (BTC) — Security, store of value\nEthereum (ETH) — Smart contracts, the largest DeFi ecosystem\nSolana (SOL) — High speed, low fees, popular for trading and consumer apps\nBNB Chain (BNB) — Binance\'s own blockchain — fast and low-cost\nAvalanche (AVAX) — Fast finality, used for both DeFi and enterprise applications'),
        para('Each Layer 1 is its own complete blockchain with its own rules, its own security model, and its own tradeoffs. This tradeoff is sometimes called the blockchain trilemma: it\'s extremely difficult for any single blockchain to be maximally decentralized, maximally secure, and maximally fast all at once.'),
      ],
    },
    {
      title: 'What Is a Layer 2?',
      content: [
        para('A Layer 2 is a separate network built on top of an existing Layer 1 — most commonly Ethereum — specifically designed to process transactions faster and cheaper, while still relying on the Layer 1 underneath it for final security.'),
        para('The simplest analogy: the highway express lane. Imagine Ethereum as a busy highway during rush hour. Everyone is stuck in traffic because there\'s only one road. A Layer 2 is like building an express lane next to that highway. It handles a large volume of traffic separately and efficiently, but it still connects back to the same highway system.'),
        para('How Layer 2s actually work, simplified:\n• Transactions happen on the Layer 2 network — fast and cheap\n• The Layer 2 periodically bundles up a large batch of these transactions\n• That bundled summary gets posted back to the Ethereum Layer 1\n• Ethereum\'s security guarantees this summary is valid and permanent'),
        para('Examples of Layer 2 blockchains (all built on Ethereum):\nArbitrum — One of the largest Layer 2s by activity and total value\nBase — Built by Coinbase, rapidly growing ecosystem\nOptimism — One of the earliest major Layer 2s, pioneered key technology\nPolygon — Popular for gaming and consumer applications\nzkSync — Uses zero-knowledge proofs for speed and security'),
      ],
    },
    {
      title: 'Layer 1 vs Layer 2 — Side by Side',
      content: [
        para('Independence: Standalone blockchain (L1) vs Built on top of a Layer 1 (L2)\nSecurity: Has its own security model (L1) vs Inherits security from its underlying Layer 1 (L2)\nSpeed: Varies — Bitcoin and Ethereum are slower, Solana is faster (L1) vs Generally much faster than the Layer 1 it\'s built on (L2)\nCost: Varies — can be expensive during high demand (L1) vs Generally much cheaper (L2)\nNative token: Yes — BTC, ETH, SOL, etc. (L1) vs Sometimes — some L2s have their own token, others use the L1\'s token directly (L2)\nExamples: Bitcoin, Ethereum, Solana (L1) vs Arbitrum, Base, Optimism, Polygon (L2)'),
      ],
    },
    {
      title: 'Why There Are So Many Chains',
      content: [
        para('Different priorities lead to different chains. Bitcoin prioritizes security and simplicity above all else. Ethereum prioritizes flexibility for building applications. Solana prioritizes raw speed. Each of these is a legitimate, different answer to the blockchain trilemma. There is no single "best" blockchain, only different tradeoffs for different purposes.'),
        para('Ethereum\'s success created demand for alternatives. Because Ethereum became so popular, and because that popularity made it slow and expensive at peak times, two things happened: entirely new Layer 1 blockchains emerged to compete (Solana, Avalanche, BNB Chain), and Layer 2 networks emerged specifically to scale Ethereum itself (Arbitrum, Base, Optimism).'),
      ],
    },
    {
      title: 'What This Means for You Practically',
      content: [
        para('When you withdraw crypto from Binance, you will often be asked to choose a network — for example, when withdrawing USDC, Binance may offer you a choice between the Ethereum network, the BNB Chain network, the Polygon network, and others. Choosing the wrong network when sending to a wallet that doesn\'t support it can result in permanently lost funds.'),
        para('When you explore DeFi or NFTs in Phase 3, you\'ll notice that some applications run on Ethereum directly, while others run on Layer 2s like Arbitrum or Base — specifically because those applications would be too expensive to use efficiently on Ethereum\'s base layer.'),
        para('When you research a token, you\'ll need to know which chain it lives on — a token\'s behavior, fees, and ecosystem are deeply tied to which Layer 1 or Layer 2 it\'s built on.'),
      ],
    },
    {
      title: 'Frequently Asked Questions',
      content: [
        para('Why does Binance support so many different networks for the same token? Because many tokens — particularly stablecoins like USDC or USDT — exist on multiple blockchains simultaneously, to give users flexibility in fees and speed. Binance supports withdrawing to whichever network you actually need, which is why selecting the correct one matters so much.'),
        para('Is it cheaper to use a Layer 2 than Ethereum directly? Generally yes, often significantly so. This is the entire purpose of Layer 2s — to offer Ethereum-level security with dramatically lower costs and faster speeds for everyday transactions.'),
        para('What happens if I send funds on the wrong network? In most cases, if you send funds to an address using a network that the receiving wallet doesn\'t support, the funds become permanently inaccessible. Always double-check and match networks exactly before sending.'),
        para('Do I need to choose one blockchain and stick with it? No. Most experienced crypto users interact with multiple Layer 1s and Layer 2s depending on what they\'re doing.'),
      ],
    },
    {
      title: 'Chapter Summary',
      content: [
        para('Layer 1: A standalone blockchain with its own security — Bitcoin, Ethereum, Solana.\nLayer 2: A faster, cheaper network built on top of a Layer 1, inheriting its security.\nWhy Layer 2s exist: Ethereum got popular, got expensive, and Layer 2s solved that without abandoning its ecosystem.\nThe blockchain trilemma: Decentralization, security, and speed are hard to maximize all at once — different chains choose different tradeoffs.\nWhy this matters practically: Choosing the correct network when sending crypto is critical — wrong network can mean permanently lost funds.'),
      ],
    },
  ],
}

// ── Master article list ───────────────────────────────────────────────────────
const ALL_ARTICLES: ArticleData[] = [
  phase1chapter0,
  phase1chapter1,
  phase1chapter2,
  phase1chapter3,
  phase1chapter4,
  phase1chapter5,
  phase1chapter6,
  phase2chapter0,
  phase2chapter1,
  phase2chapter2,
  phase2chapter3,
]

// ── Seeder ───────────────────────────────────────────────────────────────────
async function seed() {
  // Compute read times
  for (const article of ALL_ARTICLES) {
    article.minutes = estimateMinutes(article.sections)
  }

  const filtered = LEVEL_FILTER !== null
    ? ALL_ARTICLES.filter(a => a.level === LEVEL_FILTER)
    : ALL_ARTICLES

  if (filtered.length === 0) {
    console.log(`No articles found for level ${LEVEL_FILTER}.`)
    return
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Seeding ${filtered.length} articles...`)
  console.log('─'.repeat(60))

  if (!DRY_RUN) {
    initFirebase()
  }

  const db = DRY_RUN ? null : admin.firestore()
  const col = db?.collection('education_articles')

  let skipped = 0
  let written = 0
  let errors = 0

  for (const article of filtered) {
    const label = `[L${article.level} Ch${article.chapterIndex}] ${article.title}`

    if (DRY_RUN) {
      console.log(`✓ WOULD WRITE: ${label} (${article.minutes} min, ${article.sections.length} sections)`)
      written++
      continue
    }

    try {
      // Check for existing
      if (!FORCE) {
        const existing = await col!
          .where('level', '==', article.level)
          .where('chapterIndex', '==', article.chapterIndex)
          .limit(1)
          .get()

        if (!existing.empty) {
          console.log(`  SKIP (exists): ${label}`)
          skipped++
          continue
        }
      }

      const docData = {
        ...article,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }

      await col!.add(docData)
      console.log(`  ✓ WRITTEN: ${label} (${article.minutes} min)`)
      written++
    } catch (err) {
      console.error(`  ✗ ERROR: ${label}`, err)
      errors++
    }
  }

  console.log('─'.repeat(60))
  console.log(`Done. Written: ${written} | Skipped: ${skipped} | Errors: ${errors}`)
}

seed().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
