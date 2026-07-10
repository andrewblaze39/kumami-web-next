# Kumami Platform Architecture

> Last updated: 2026-07-10

Complete system architecture for the Kumami platform — a crypto/Web3 education, news, and market intelligence product.

---

## 1. System Overview

```
                                    kumami.world
                                        |
                            +-----------+-----------+
                            |                       |
                    Firebase App Hosting      Firebase Functions (gen2)
                    (Next.js SSR/SSG)         (Cloud Run containers)
                            |                       |
                    +-------+-------+       +-------+-------+
                    |               |       |               |
                Firestore    Firebase    Firebase Auth   Cloud Run
                  (DB)       Storage     (JWT tokens)   API endpoints
                    |                                       |
                    +-------------------+-------------------+
                                        |
                            +-----------+-----------+
                            |                       |
                        n8n (VPS)              External APIs
                    (AI workflows)          (CoinGecko, Alchemy)
                            |
                        Supabase
                    (pgvector / RAG)
```

---

## 2. Environments

### Production — `kumami-6df47`
| Resource | Value |
|----------|-------|
| Firebase project | `kumami-6df47` |
| Web app URL | `https://kumami.world` |
| Firebase Functions (Cloud Run) | `https://api-yg5t6jc2da-uc.a.run.app` |
| Git branch | `main` |
| Env file | `.env.local` with `NEXT_PUBLIC_ENV=production` |

### Development / Sandbox — `kumami-dev`
| Resource | Value |
|----------|-------|
| Firebase project | `kumami-dev` |
| Web app URL | `https://kumami-dev.web.app` (or Firebase App Hosting preview URL) |
| Firebase Functions (Cloud Run) | `https://api-h4o777ecua-uc.a.run.app` |
| Git branch | `dev` |
| Env file | `.env.local` with `NEXT_PUBLIC_ENV=development` |

### Shared across environments
| Resource | Value |
|----------|-------|
| n8n instance | `https://n8n.srv1258054.hstgr.cloud` (Hostinger VPS) |
| Supabase | `https://jzepsxbalptqhxynyedr.supabase.co` |

### Deployment Workflow

```
feature branch ──merge──> dev ──test on kumami-dev──> merge ──> main ──auto-deploy──> kumami.world
```

**How it works:**
1. All feature work happens on feature branches off `main` (or `dev`).
2. Merge to `dev` branch triggers a deploy to the `kumami-dev` Firebase project via Firebase App Hosting's branch-tracking. The dev site uses the dev Firebase project (separate Firestore, Auth, Storage) and the dev Cloud Run backend.
3. Test the feature on the dev site. If satisfied, merge `dev` → `main`.
4. Merge to `main` triggers a deploy to the production `kumami-6df47` project. The prod site uses the prod Firebase project and prod Cloud Run backend.

**Firebase App Hosting branch tracking:**
- The `kumami-6df47` project's App Hosting backend is configured to deploy from the `main` branch.
- The `kumami-dev` project's App Hosting backend should be configured to deploy from the `dev` branch.
- Environment variables (Firebase config, API URLs, service account) are set per-backend in the Firebase Console under App Hosting > Backend > Environment variables — NOT via local `.env` files.
- Firebase App Hosting builds the Next.js app in the cloud (no manual `npm run build` + deploy needed).

**Setting up the dev environment:**
1. Go to Firebase Console > `kumami-dev` project > App Hosting.
2. Create a new backend, connect the same GitHub repo.
3. Set the tracked branch to `dev`.
4. Add all required environment variables (see section 5) pointing to the `kumami-dev` Firebase project and dev Cloud Run URL.
5. First deploy triggers automatically when the branch is pushed.

---

## 3. Frontend — Next.js Web App

### Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Hosting | Firebase App Hosting (manages SSR via Cloud Run under the hood) |
| Styling | Tailwind CSS v4 + custom CSS (`world.css`) |
| Auth | Firebase Auth (client-side, JWT) |
| Icons | Lucide React + custom SVG icon set (`console-ui.tsx`) |
| Fonts | Plus Jakarta Sans (via `next/font/google`) |

### App Structure
The app is a single-page-app-style shell called "Kumami World":
- **`/`** — Gate/landing page with login/signup modals
- **`/world/*`** — The shell: persistent sidebar (248px) + topbar (62px) + mode toggle (Beginner/Advanced/Pro)
- All content pages render inside `src/app/world/(app)/` under the shell layout
- All legacy routes (`/news`, `/education`, `/games`, etc.) redirect into `/world/*`

### Three Modes
| Mode | Target user | Key pages |
|------|------------|-----------|
| Beginner | New to crypto | News portal, Education, Courses, Games, AI Labs |
| Advanced | Active traders | Console, On-Chain insights, Intelligence, Watchlist |
| Pro | Premium subscribers | Portfolio manager, Alpha Room, Market Analysis, Market Cap |

### Auth & Roles
Auth lives in `src/contexts/AuthContext.tsx`. Firestore `users/{uid}` document fields:
- `role`: `superadmin` / `admin` / `user`
- `isPremium`: boolean (controls Pro content access)
- Email verification enforced; Google sign-in auto-verified

---

## 4. Backend Services

### 4a. Next.js API Routes (in this repo)

These run on Firebase App Hosting's managed Cloud Run. Located in `src/app/api/`.

| Endpoint | Method | Purpose | Auth | Notes |
|----------|--------|---------|------|-------|
| `/api/market/console` | GET | Full console payload | Bearer | Cached 300s, free-tier delay on flow radar |
| `/api/market/flow-radar` | GET | Flow radar events | Bearer | Cached 60s, 30-min delay for free tier |
| `/api/market/heatmap` | GET | Liquidation heatmap | Bearer | Cached 300s, free: 5 assets / pro: 10 |
| `/api/market/intelligence` | GET | Intelligence briefs | Bearer | Cached 300s, strips `proInterpretation` for free |
| `/api/market/onchain` | GET | On-chain metrics per asset | Bearer | Cached 300s, `?asset=BTC&range=24h` |
| `/api/market/watchlist` | GET/POST/DELETE | Watchlist management | Bearer | Free: 5 slots, Pro: unlimited |
| `/api/education/progress` | GET/POST | Course progress tracking | Bearer | Per-phase completion + notes |
| `/api/portfolio-scan` | POST | Portfolio risk analysis | None* | Proxies to n8n webhook |
| `/api/wallet-data` | GET | Wallet balances (ETH/Base/ARB) | Bearer | Uses Alchemy SDK |
| `/api/intents` | POST | Tracker bot wallet intents | Bearer | Writes to Firestore |
| `/api/tracker/bootstrap` | POST | Bootstrap tracker bot | Bearer | Creates initial bot state |
| `/api/webhooks/alchemy` | POST | Alchemy webhook receiver | HMAC | Validates signature, dispatches to Firestore |
| `/api/subscribe-checkout` | POST | Subscription checkout | None | Proxies to Firebase Functions |
| `/api/create-crypto-payment` | POST | Crypto payment | None | Proxies to Firebase Functions |
| `/api/coingecko/search` | GET | Coin search | None | Proxies to CoinGecko API |
| `/api/coingecko/markets` | GET | Market data | None | Proxies to CoinGecko API, cached 300s |

### 4b. Firebase Functions (gen2 on Cloud Run) — separate repo/deploy

These run on a separate Cloud Run service (the "API server"), deployed independently from the Next.js app.

| Endpoint | Purpose | Called from |
|----------|---------|------------|
| `/api/chat` | Kuma AI chat — receives user message, writes assistant reply to Firestore | `useKumaChat.ts`, `KumaAIChatTab.tsx` |
| `/api/subscribe-checkout` | Stripe checkout session creation | Proxied via Next.js `/api/subscribe-checkout` |
| `/api/create-crypto-payment` | Crypto payment processing | Proxied via Next.js `/api/create-crypto-payment` |

**URLs:**
- Production: `https://api-yg5t6jc2da-uc.a.run.app`
- Development: `https://api-h4o777ecua-uc.a.run.app`

Set via `NEXT_PUBLIC_API_URL` env var.

> **Backlog:** Migrate all Firebase Functions endpoints to Next.js API routes so the entire backend lives in one repo. See `docs/PLAN_Migrate_Chatbot_To_Next_Routes.md` for the chat migration plan.

### 4c. n8n Workflows (Hostinger VPS)

n8n is deployed on a Hostinger VPS at `https://n8n.srv1258054.hstgr.cloud`.

| Workflow | Webhook URL | Purpose | Connected to |
|----------|-------------|---------|-------------|
| Portfolio Risk Scanner | `/webhook/portfolio-scan` | Receives portfolio holdings, runs AI risk analysis, returns scored assessment with dimensions, asset notes, and action items | Called from Next.js `/api/portfolio-scan` |
| Kuma AI Chat | (triggered internally by Firebase Functions `/api/chat`) | AI chat processing — the Firebase Function receives the message, may route to n8n for RAG/context enrichment, then writes the reply to Firestore | Supabase (pgvector for RAG), Gemini API |

**n8n infrastructure:**
- Hosted on Hostinger VPS (`srv1258054`)
- Connected to Supabase for vector storage (pgvector) — used for RAG knowledge base
- Uses Gemini API for embeddings (768-dim) and completions
- n8n stores workflow state in its own SQLite/Postgres (on the VPS)

### 4d. External APIs

| Service | Purpose | Env var |
|---------|---------|---------|
| CoinGecko | Coin search + market data | Free API (no key needed, rate-limited) |
| Alchemy | Wallet balances, token metadata, webhook notifications (ETH/Base/ARB) | `ALCHEMY_API_KEY_ETH`, `_BASE`, `_ARB` |
| Stripe | Subscription payments | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| CoinGlass | Market intelligence data (planned) | `COINGLASS_API_KEY` (not yet configured) |
| News API | News aggregation (configured, not actively used) | `NEXT_PUBLIC_NEWS_API_KEY` |

---

## 5. Database — Firestore

Same Firestore instance shared between web and mobile apps. Each Firebase project (prod/dev) has its own Firestore.

### Collections

#### User data

| Collection | Purpose | Key fields |
|-----------|---------|------------|
| `users` | User profiles | `uid`, `role` (superadmin/admin/user), `isPremium`, `subscriptionId`, `displayName`, `email`, `photoURL` |
| `users/{uid}/chatrooms` | Kuma AI chat rooms | `id`, `name`, `icon`, `type` (system/user), `isDefault`, `canDelete`, `lastMessage`, `lastMessageAt`, `createdAt` |
| `users/{uid}/chatrooms/{id}/messages` | Chat messages | `role` (bot/user), `message`/`content`, `buttons` (array: label, intentId, args), `buttonsUsed`, `timestamp` |
| `users/{uid}/watchlist` | Tracked wallets/addresses | `address`, `label`, `chains` (array), `minUsd`, `muteUntil` |
| `user_prefs/{uid}` | UI preferences | `mode` (beginner/advanced/pro) |
| `subscriptions` | Subscription records | `userId`, `status` (active), `startDate`, `createdAt` |

#### Content (admin-managed, draft/published pattern)

| Collection | Purpose | Key fields |
|-----------|---------|------------|
| `news` | News articles | `title`, `excerpt`, `summary`, `content`, `category`, `imageUrl`, `author`, `isPremium`, `isAdvanced`, `isPro`, `status`, `timestamp`, `date`, `kumamiInsight`, `source`, `tags` |
| `blogs` | Blog posts | `title`, `content`, `summary`, `author`, `timestamp`, `readTime`, `likes`, `status`, `thumbnailImageUrl`, `detailImageUrl` |
| `research_articles` | Research content | `title`, `author`, `status`, `timestamp`, `createdAt` |
| `education_articles` | Education lessons | `title`, `level`, `chapterIndex`, `author`, `thumbnail`, `sections`, `status`, `createdAt` |
| `ai_modules` | AI learning modules | `title`, `level`, `author`, `thumbnail`, `sections`, `status`, `createdAt` |
| `courses` | Course definitions (server-side) | `phase`, `title`, `tagline`, `level`, `chapters`, `instructor`, `faq` |
| `courses/{id}/reviews` | Course reviews | `author`, `rating`, `text`, `createdAt` |
| `games` | Game catalog | `title`, `genres`, `networks`, `platformType`, `tagline`, `summary`, `categories`, `popularityScore`, `status`, `timestamp`, `createdAt`, `createdBy`, social links, image URLs |
| `gameDropdownOptions` | Game form dropdown options | `type` (genre/network/platform/category), `value` |
| `marketAnalysis` | Market analysis content | `title`, `content`, `imageUrl`, `createdAt` |

#### Partners

| Collection | Purpose | Key fields |
|-----------|---------|------------|
| `partner_articles` | Partner feature articles | `title`, `author`, `category`, `description`, `imageUrl`, social links, `createdAt`, `createdBy`, `status` |
| `all_partners` | Partner directory | `name`, `logoUrl`, `link`, `createdAt` |
| `homepage_partners` | Featured homepage partners | `name`, `logoUrl`, `link`, `createdAt` |

#### Market & Intelligence

| Collection | Purpose | Key fields |
|-----------|---------|------------|
| `watchlists` | User market watchlists | `symbols`, `uid` |
| `market_cache` | Server-side market data cache | `key`, `value`, `updatedAt` |
| `alerts` | Wallet activity alert log | `userId`, `watchlistId`, `chain`, `txHash`, `direction`, `address`, `asset`, `value`, `createdAt` |
| `whales` | Whale wallet tracking | `enabled`, `address` |

#### Community

| Collection | Purpose | Key fields |
|-----------|---------|------------|
| `alphaRoom` | Alpha/closed community room messages | `message`, `role`, `timestamp`, `buttons` (with intentId, args) |
| `youtube_shorts` | Video shorts for news grid | `videoId`, `title`, `order`, `isActive`, `createdAt` |

### Cross-collection queries
- `collectionGroup('watchlist')` — Used in alert dispatcher to find all users watching a specific address

### Storage
Firebase Storage used for user uploads (profile photos) and content images (news thumbnails, game covers, partner logos, market analysis images).

---

## 6. Mobile App (Flutter)

A Flutter mobile app is developed by a colleague and shares the same Firebase backend (Firestore, Auth, Storage).

### Handover considerations
- Backend changes (Firestore schema, API endpoints) must be communicated to the mobile team
- Existing handover docs: `docs/MOBILE_HANDOVER_Education.md`, `docs/MOBILE_HANDOVER_ProDashboard.md`
- The mobile app will mirror many of the web views — the web design system (especially mobile breakpoints) serves as the reference for mobile app UI consistency
- Any new Firestore collections, document schema changes, or API endpoint changes should include a handover note

### Shared resources
- Firebase Auth (same user accounts across web and mobile)
- Firestore (same collections and documents)
- Firebase Functions / Cloud Run endpoints
- n8n workflows (same webhook URLs)

---

## 7. Environment Variables

### Required for the Next.js app

```bash
# --- Firebase (project-specific, different per environment) ---
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=         # kumami-6df47 (prod) or kumami-dev (dev)
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# --- Environment indicator ---
NEXT_PUBLIC_ENV=                          # "production" or "development"

# --- Firebase Functions backend URL (project-specific) ---
NEXT_PUBLIC_API_URL=                      # https://api-yg5t6jc2da-uc.a.run.app (prod)
                                          # https://api-h4o777ecua-uc.a.run.app (dev)

# --- Firebase Admin (server-side, for token verification) ---
FIREBASE_SERVICE_ACCOUNT_JSON=            # Full JSON service account (project-specific)

# --- Alchemy (wallet tracking) ---
ALCHEMY_API_KEY_ETH=
ALCHEMY_API_KEY_BASE=
ALCHEMY_API_KEY_ARB=
ALCHEMY_WEBHOOK_SIGNING_KEY=
ALCHEMY_WEBHOOK_ID_ETH=
ALCHEMY_WEBHOOK_ID_BASE=
ALCHEMY_WEBHOOK_ID_ARB=

# --- n8n (AI workflows) ---
N8N_PORTFOLIO_SCAN_WEBHOOK_URL=           # https://n8n.srv1258054.hstgr.cloud/webhook/portfolio-scan

# --- External APIs ---
NEXT_PUBLIC_NEWS_API_KEY=                 # NewsAPI.org
NEXT_PUBLIC_COINMARKETCAP_API_KEY=        # CoinMarketCap
GEMINI_API_KEY=                           # Google Gemini
SUPABASE_URL=                             # Supabase instance
SUPABASE_ANON_KEY=                        # Supabase anon key
# COINGLASS_API_KEY=                      # Planned — not yet configured
# STRIPE_SECRET_KEY=                      # Planned — payment processing
```

### Where env vars are set
- **Local development:** `.env.local` (gitignored)
- **Firebase App Hosting:** Set in Firebase Console > App Hosting > Backend > Environment variables. These override any local `.env` files during cloud builds.

> **Security note:** Never commit `.env.local`, `.env.production.local`, or any file containing private keys/service accounts to git. Use `.gitignore` to exclude them. The `.env.local.backup` and `.env.production.local` files in the repo contain sensitive credentials and should be removed from version control or moved to a secrets manager.

---

## 8. Build & Deploy

### Local development
```bash
npm run dev       # Dev server at localhost:3000
npm run build     # Production build (validates types + lint)
npm run start     # Serve production build locally
npm run lint      # ESLint
```

### Production deployment
Firebase App Hosting handles deployment automatically:
1. Push to tracked branch (`main` for prod, `dev` for sandbox)
2. Firebase App Hosting detects the push via GitHub integration
3. Runs `npm run build` in a Cloud Build container
4. Deploys the built Next.js app to a managed Cloud Run service
5. Serves via Firebase Hosting CDN with the custom domain (`kumami.world`)

No manual deploy commands needed. No `firebase deploy` for the web app.

### Firebase Functions deployment (separate)
Firebase Functions are deployed separately from a different repo/setup. This is not managed by Firebase App Hosting — it requires manual `firebase deploy --only functions` or its own CI/CD.

---

## 9. Infrastructure Diagram

```
GitHub Repo (kumami-web-next)
    |
    +-- main branch ──> Firebase App Hosting (kumami-6df47)
    |                       |
    |                       +-- kumami.world (production)
    |                       +-- Firestore (prod)
    |                       +-- Firebase Auth (prod)
    |                       +-- Firebase Storage (prod)
    |                       +-- Cloud Run (managed SSR)
    |
    +-- dev branch ──> Firebase App Hosting (kumami-dev)
                            |
                            +-- kumami-dev.web.app (sandbox)
                            +-- Firestore (dev — isolated data)
                            +-- Firebase Auth (dev — separate users)
                            +-- Firebase Storage (dev)
                            +-- Cloud Run (managed SSR)

Firebase Functions (Cloud Run — separate deploy)
    +-- kumami-6df47: https://api-yg5t6jc2da-uc.a.run.app
    +-- kumami-dev:   https://api-h4o777ecua-uc.a.run.app

n8n (Hostinger VPS: srv1258054)
    +-- Portfolio scan webhook
    +-- Kuma AI chat (via Firebase Functions)
    +-- Connected to Supabase (pgvector RAG)

Supabase (shared instance)
    +-- pgvector for Kuma AI knowledge base
    +-- Used by n8n workflows

Flutter Mobile App (separate repo, same Firebase backend)
    +-- Shares Firestore, Auth, Storage, Cloud Run endpoints
```

---

## 10. Key Technical Decisions

1. **Firebase App Hosting over Vercel** — Chose Firebase App Hosting to keep the entire stack (auth, db, storage, hosting, functions) in one Firebase project. Simplifies env management and billing.

2. **Hybrid backend (Next.js routes + Firebase Functions)** — Historical: Firebase Functions were built first (CRA era). New endpoints are Next.js API routes. Migration to all-Next.js is on the backlog.

3. **n8n for AI workflows** — Provides a visual workflow builder for AI pipelines (RAG, portfolio analysis) without needing to redeploy code. Hosted on Hostinger VPS for cost efficiency.

4. **Shared Firestore between web and mobile** — Single source of truth for user data, content, and chat. Both apps read/write the same collections.

5. **Mode system instead of separate apps** — Beginner/Advanced/Pro modes in one shell, sharing navigation and auth, rather than three separate products.
