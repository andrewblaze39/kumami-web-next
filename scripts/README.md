# Scripts

## seedEducation.ts

Seeds the `education_articles` Firestore collection from the Kumami Web3 curriculum.

### Prerequisites

Install dependencies if not already present:

```bash
npm install --save-dev ts-node firebase-admin dotenv @types/node
```

### Authentication

The script needs a Firebase service account. Two options:

**Option A — .env.local (recommended)**

Add to `.env.local`:

```
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccount.json
```

**Option B — --keyfile flag**

```bash
npx ts-node scripts/seedEducation.ts --keyfile /path/to/serviceAccount.json
```

Download your service account key from:
Firebase Console → Project Settings → Service Accounts → Generate new private key

### Usage

```bash
# Seed all articles
npx ts-node scripts/seedEducation.ts

# Dry run — logs what would be written, no Firestore writes
npx ts-node scripts/seedEducation.ts --dry-run

# Seed only a specific level (1–5)
npx ts-node scripts/seedEducation.ts --level 1

# Force overwrite existing articles (default: skip if level+chapterIndex exists)
npx ts-node scripts/seedEducation.ts --force

# Combine flags
npx ts-node scripts/seedEducation.ts --level 2 --dry-run
npx ts-node scripts/seedEducation.ts --level 1 --force --keyfile ./serviceAccount.json
```

### What gets seeded

| Level | Chapter | Title |
|-------|---------|-------|
| 1 | 0 | How Most Beginners Actually Get Into Crypto |
| 1 | 1 | Choosing a Safe and Beginner-Friendly CEX |
| 1 | 2 | How to Create and Secure a CEX Account Properly |
| 1 | 3 | How to Deposit Money and Buy Your First Crypto |
| 1 | 4 | Common Mistakes When Buying on a CEX |
| 1 | 5 | Risks of Keeping Your Crypto on an Exchange |
| 1 | 6 | Why You Should Eventually Move to a Personal Wallet |
| 2 | 0 | What Is Blockchain and Why It Exists |
| 2 | 1 | What Is Bitcoin — The Original Use Case |
| 2 | 2 | What Is Ethereum — And Why "Programmable Money" Matters |
| 2 | 3 | What Are Layer 1 and Layer 2 Blockchains |

Levels 3–5 and remaining Level 2 chapters will be added as curriculum content is finalised. The system shows "Coming Soon" for chapters with no matching Firestore document.

### Duplicate protection

By default the script checks for an existing document with the same `level` + `chapterIndex` before writing. Use `--force` to overwrite.

### Firestore document structure

Each document written to `education_articles`:

```
{
  title: string,
  level: number,          // 1–5
  chapterIndex: number,   // 0-based, matches educationPhases.ts chapters[]
  blurb: string,
  minutes: number,        // auto-calculated from word count ÷ 200
  featured: boolean,      // true for chapterIndex 0 of each level
  description: string,
  author: "Kumami Team",
  status: "published",
  createdAt: Timestamp,
  sections: [
    {
      title: string,
      content: [{ type: "paragraph", text: string }]
    }
  ]
}
```
