# Kumami Web — Next.js (Active)

> **This is the active app.** The original CRA project lives at `/Users/andrew/Documents/kumami-web` and is being sunset — it survives only as the source reference for the Pro Dashboard (already migrated here as the `/world/pro` tab) and the Admin panel. All user-facing product lives in the **Kumami World shell** in this repo.

Crypto/Web3 education and news platform. Live at https://kumami.world. Accent color: turquoise `#00c2c7`.

## World-First Architecture

The entire product is a single-page-app-style shell ("Kumami World"):

- **`/` is the gate** — a branded landing page (`src/app/HomeGateClient.tsx` + `src/components/world/Gate.tsx`) with login/signup modals. Signed-in users enter the shell.
- **`/world/*` is the shell** — persistent sidebar (248px) + topbar (62px) with a Beginner/Advanced/Pro mode toggle (`src/contexts/WorldModeContext.tsx`). All content pages render inside `src/app/world/(app)/` under this layout.
- **All legacy routes redirect into the shell** — `/news`, `/research`, `/education/*`, `/games`, `/game-details`, `/ai-labs/*`, `/blogs`, `/profile`, `/login`, `/signup` are thin `redirect()` pages. Old components in `src/components/` (Navbar, CryptoTicker, GamesPortal, etc.) still exist but are intentionally unrouted or embedded via `w-legacy-embed`.
- **Exceptions (still standalone):** `/research/[id]` and `/blogs/[id]` article detail pages — they are linked from inside the shell (Education → Research tab, Blogs grid) and have no world-native detail route yet.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Routing:** Filesystem-based App Router — every folder under `src/app/` is a route
- **Backend/DB:** Firebase (same project as CRA — Auth, Firestore, Storage)
- **Styling:** Tailwind CSS v4 + custom CSS for legacy components
- **Icons:** Lucide React
- **Fonts:** Inter via `next/font/google`

## Key Directories

| Path | Purpose |
|------|---------|
| `src/app/` | All routes — each folder = a route segment |
| `src/app/layout.tsx` | Root layout — wraps every page with AuthProvider + NotificationProvider |
| `src/app/page.tsx` | World gate (`/`) — landing + auth modals |
| `src/app/world/(app)/` | All shell pages (console, news, education, pro, …) |
| `src/app/world/world.css` | World design tokens + all `w-*` component CSS |
| `src/components/world/` | Shell components (Sidebar, Gate, panels, education, pro, kuma) |
| `src/components/` | Legacy CRA-era components (some embedded in shell, some unrouted) |
| `src/components/ProtectedRoute.tsx` | Auth guard — wraps pages that require login |
| `src/contexts/AuthContext.tsx` | Firebase auth state + isAdmin + isPremium |
| `src/contexts/WorldModeContext.tsx` | Beginner / Advanced / Pro mode state |
| `src/contexts/NotificationContext.tsx` | In-app notifications |
| `src/lib/firebase.ts` | Firebase initialization |
| `src/lib/market/` | Market data providers + rule engines for console/intel/watchlist |

## Routing Conventions (App Router)

```
src/app/
  page.tsx                          → /            (World gate — landing + auth modals)
  layout.tsx                        → wraps all pages (AuthProvider + NotificationProvider)
  world/
    page.tsx                        → /world       (redirects back to the gate at /)
    (app)/layout                    → shell: sidebar + topbar + mode toggle + Kuma dock
    (app)/console/page.tsx          → /world/console    (market console, Advanced)
    (app)/news/page.tsx             → /world/news       (news portal: ticker, capsules, hero/aside/river)
    (app)/news/[id]/page.tsx        → /world/news/:id
    (app)/intel/page.tsx            → /world/intel      (intelligence feed, tiered)
    (app)/watchlist/page.tsx        → /world/watchlist
    (app)/onchain/page.tsx          → /world/onchain
    (app)/education/page.tsx        → /world/education  (subtabs via ?tab= — see below)
    (app)/courses/[phaseId]/...     → /world/courses/:phaseId[/:chapterId]
    (app)/pro/page.tsx              → /world/pro        (Portfolio / Alpha Room / Market Analysis / Market Cap)
    (app)/about|blogs|profile|ailabs|games/page.tsx → rendered inside the shell
  news, research, education, games, game-details,
  ai-labs, blogs, profile, login, signup            → redirect() into /world/* or /
```

**Education subtabs** — `/world/education?tab=` one of `dashboard` (default), `journey`, `courses`, `achievements`, `research`, `glossary` (`src/app/world/(app)/education/EducationTabs.tsx`).

**Pro tab** — `/world/pro` is live for premium users (`isPremium`), migrated from the CRA Pro Dashboard: Portfolio manager, Alpha Room, Market Analysis, Market Cap tool (`src/components/world/pro/`). Non-premium users see the locked teaser.

## Server vs Client Components

- **Default is Server** — no `useState`, `useEffect`, browser APIs
- Add `'use client'` at the top when the component needs: hooks, browser events, Firebase Auth (auth is always client-side)
- Auth-gated pages: wrap content with `<ProtectedRoute>` (client component)
- SEO metadata: use `generateMetadata()` in server components to fetch Firestore data server-side via Firebase Admin SDK

## Auth & Roles

Auth lives in `src/contexts/AuthContext.tsx`. Key fields on the Firestore `users/{uid}` document:

- `role`: `superadmin` | `admin` | `user` (controls admin access)
- `isPremium`: `boolean` (controls premium content)
- `isAdmin`: `boolean` (legacy field, check `role` instead)

Email verification is enforced — `currentUser` is only set once `emailVerified === true`. Google sign-in skips this (Google accounts are always verified).

## Post-Auth Redirect Pattern

Uses `sessionStorage` key `redirectAfterSignup` to preserve the intended URL through the signup flow:

1. `ProtectedRoute` saves `window.location.pathname + search` to sessionStorage → `router.replace('/signup')`
2. After Google sign-in on Signup page: `useEffect` watching `currentUser` reads sessionStorage → `router.replace(returnUrl)`
3. After email signup → "Go to Login" passes `?returnUrl=` as query param to `/login`
4. Login page reads `returnUrl` from query params or sessionStorage → redirects after login

## Build & Dev Commands

```bash
npm run dev       # Dev server at localhost:3000
npm run build     # Production build
npm run start     # Serve production build
npm run lint      # ESLint
```

## Environment Variables

Stored in `.env.local` (not committed). See `.env.local.backup` for the required keys:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
```

## Migration Status

| Page / Feature | Status |
|---|---|
| World gate at `/` + auth modals | ✅ Done |
| Shell (sidebar/topbar/mode toggle, profile block, About) | ✅ Done |
| Console, Intel, Watchlist, On-chain (mock market platform) | ✅ Done |
| News portal + detail (`/world/news`) — live Firestore | ✅ Done |
| Education tab with subtabs + courses/chapter reader | ✅ Done |
| Pro tab (Portfolio, Alpha Room, Market Analysis, Market Cap) | ✅ Done — premium-gated |
| About, Blogs, Profile, AI Labs, Games (in shell) | ✅ Done |
| Legacy route redirects into shell | ✅ Done |
| Research/Blog article detail inside shell | ⏳ Pending — still standalone pages |
| Market data — real provider (currently mock fixtures) | ⏳ Pending |
| Admin panel | 🔒 Stays in CRA |
| Pro Dashboard (CRA original) | 🌅 Sunset — migrated to `/world/pro`; CRA copy kept as source reference |

## Firebase Firestore Collections

Same collections as CRA — shared backend:

| Collection | Purpose |
|---|---|
| `users` | User profiles, roles, premium status |
| `news` | News articles (`status: 'published'/'draft'`) |
| `research_articles` | Research content |
| `education_articles` | Education modules |
| `blogs` | Blog posts |
| `games` | Game listings |
