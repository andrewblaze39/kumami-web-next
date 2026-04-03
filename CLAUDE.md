# Kumami Web — Next.js (Active)

> **This is the active migration target.** The original CRA project lives at `/Users/andrew/Documents/kumami-web`. Public-facing pages are being migrated here incrementally. Admin and Pro Dashboard stay in CRA permanently.

Crypto/Web3 education and news platform. Live at https://kumami.world (eventually — currently CRA is live, this replaces it page by page).

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
| `src/app/page.tsx` | Home page (`/`) |
| `src/app/login/page.tsx` | Login page (`/login`) |
| `src/app/signup/page.tsx` | Signup page (`/signup`) |
| `src/components/` | Shared UI components (Navbar, CryptoTicker, etc.) |
| `src/components/ProtectedRoute.tsx` | Auth guard — wraps pages that require login |
| `src/contexts/AuthContext.tsx` | Firebase auth state + isAdmin + isPremium |
| `src/contexts/NotificationContext.tsx` | In-app notifications |
| `src/lib/firebase.ts` | Firebase initialization |

## Routing Conventions (App Router)

```
src/app/
  page.tsx                  → /
  layout.tsx                → wraps all pages
  login/page.tsx            → /login
  signup/page.tsx           → /signup
  news/page.tsx             → /news
  news/[id]/page.tsx        → /news/:id  (dynamic)
  research/page.tsx         → /research
  research/[id]/page.tsx    → /research/:id
  education/page.tsx        → /education
  games/page.tsx            → /games
  game-details/page.tsx     → /game-details
  ai-labs/
    page.tsx                → /ai-labs
    module/[id]/page.tsx    → /ai-labs/module/:id
```

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
| Home, Navbar, CryptoTicker | ✅ Done |
| Login, Signup | ✅ Done |
| News portal (`/news`) | 🔄 Mock data — needs Firebase |
| News detail (`/news/[id]`) | 🔄 Mock data — needs Firebase |
| Education, Research, Blogs | ⏳ Pending |
| Games, AI Labs | ⏳ Pending |
| Pro Dashboard | 🔒 Stays in CRA |
| Admin panel | 🔒 Stays in CRA |

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
