# Mobile Handover — Education Feature

**For:** Kumami mobile app developer
**Scope:** Education section revamp — port the full feature set from web to mobile
**Source app:** `kumami-web-next` (Next.js / React / TypeScript / Firebase) — repo paths below are relative to its root
**Date:** 2026-06-27

---

## 1. What the feature does (one paragraph)

Kumami Education is a free, structured Web3 learning track for crypto beginners. It's organised as **5 fixed Levels (Phases)**, each containing an ordered set of **Chapters** (lessons). Each chapter renders as an **Article** with sectioned content (paragraphs, images, YouTube embeds, tables). Users track per-section reading progress and earn a **badge per Level** when they complete every chapter in that level. There are 4 screen surfaces: **Journey** (level overview), **Level detail** (chapter list), **Article** (lesson content), **Dashboard** (cross-level progress), and **Achievements** (badges). All progress syncs to Firestore for signed-in users; falls back to LocalStorage for guests.

---

## 2. Routes / screens to build on mobile

| Web route | Mobile screen name (suggested) | Purpose |
|---|---|---|
| `/education` | `JourneyScreen` | Top-level — hero + 5 Level cards. Entry point. |
| `/education/dashboard` | `EducationDashboardScreen` | "My Learning" — combined progress across all levels |
| `/education/achievements` | `AchievementsScreen` | All 5 badges (locked vs earned) |
| `/education/all` | `AllLessonsScreen` | Flat list of every published lesson across all levels |
| `/education/[phase]` (1–5) | `LevelDetailScreen` | One Level's chapter list with per-chapter progress |
| `/education/[phase]/[lesson]` | `ArticleScreen` (via lesson index) | Same as below — index-based routing into the article |
| `/education/article/[id]` | `ArticleScreen` (via Firestore doc ID) | Read a single article |

**Recommended bottom tab structure on mobile:** Journey · Dashboard · Achievements · (rest under hamburger / overflow). The sidebar on web (`src/components/education/EducationSidebar.tsx`) is the source of nav truth.

---

## 3. Data model

### 3.1 Static metadata (hardcoded in repo — copy to mobile)

`src/data/educationPhases.ts` defines the 5 Levels:

```ts
interface Phase {
  n: number              // 1–5
  slug: string           // "start-here", "understand", "learn-to-trade", "investor", "go-deeper"
  level: string          // "LEVEL 01" — display string
  tag: string            // "Beginner" | "Elementary" | "Intermediate" | "Advanced" | "Expert"
  hex: string            // accent color (e.g. "#5ee9a8")
  title: string          // "Start Here"
  blurb: string          // 1-sentence pitch
  detail: string         // 2-3 sentence longer description
  badge: string          // "First Steps" — badge name
  hours: string          // "2h 10m" — estimated time
  outcomes: string[]     // 4 learning outcomes
  chapters: string[]     // ordered list of chapter titles
}
```

**Copy this file verbatim into mobile.** It's the canonical chapter list. Chapter index in Firestore (`chapterIndex` field) maps directly into `PHASES[n-1].chapters[chapterIndex]`.

### 3.2 Firestore — `education_articles` collection

Each document = one chapter's article content. Document ID is auto-generated (use it as the article ID in URLs).

```ts
interface ArticleDoc {
  // Identity
  title: string                        // article display title
  description?: string                 // SEO description
  blurb?: string                       // short hook shown in lesson cards

  // Placement
  level: number | string               // 1–5, or "Level 1" string variants (use resolveLevelNumber helper)
  chapterIndex: number                 // 0-based index into PHASES[level].chapters

  // Metadata
  author?: string                      // usually "Kumami Team"
  thumbnail?: string                   // cover image URL (Firebase Storage or CDN)
  imageUrl?: string                    // fallback if thumbnail missing
  minutes?: number                     // estimated read time
  status: 'published' | 'draft'        // ONLY render 'published' on the client
  comingSoon?: boolean                 // if true, render as locked placeholder

  // Content — two possible formats:
  sections?: ArticleSection[]          // "classic" mode (most articles use this)
  editorMode?: 'classic' | 'tiptap'    // which content field is authoritative
  tiptapContent?: unknown              // TipTap rich-text JSON (newer articles may use this)

  // Timestamps
  createdAt: Timestamp
  updatedAt?: Timestamp
}

interface ArticleSection {
  title: string                        // section heading inside the article
  content: ArticleSectionContent[]     // ordered blocks
}

interface ArticleSectionContent {
  type: 'paragraph' | 'image' | 'youtube' | 'table'
  // for paragraph:
  text?: string                        // contains markdown (see §3.5)
  // for image:
  src?: string
  alt?: string
  caption?: string
  // for youtube:
  videoId?: string                     // 11-char YouTube ID
  title?: string                       // optional caption
  // for table:
  headers?: string[]
  rows?: string[][]
  rowsJson?: string                    // sometimes rows arrive as a JSON string — parse it
}
```

**Query pattern:**
```
collection('education_articles')
  .where('level', '==', levelNum)
  .where('status', '==', 'published')
  .orderBy('chapterIndex')
```

Note: `level` can be stored as either `number` or `string` ("Level 1", "Level 01", "level 1"). Use the `resolveLevelNumber` helper (see §3.4) before comparing.

### 3.3 Firestore — `users/{uid}/education_progress/{levelNum}` subcollection

One document per Level (so `users/{uid}/education_progress/1`, `.../2`, etc).

```ts
interface LevelProgress {
  completedChapters: number[]              // [0, 1, 4] — chapter indexes marked complete
  sectionProgress: {
    [chapterIndex: number]: number[]       // visited section indexes per chapter
                                           // e.g. { 0: [0, 1, 2], 1: [0] }
  }
  updatedAt?: Timestamp                    // serverTimestamp on write
}
```

**Firestore rule (already shipped):** users can read/write their own `education_progress` subcollection — see `firestore.rules:192-194`. No additional rules work needed on mobile.

### 3.4 Utility helpers to port

Copy these from `src/lib/educationUtils.ts` (they're trivial):

- `resolveLevelNumber(level: unknown): number | null` — handles `1`, `"Level 1"`, `"Level 01"`, `"level 1"` → returns the number
- `getLevelData(levelNum)` → returns the Phase object from PHASES
- `getChapterName(levelNum, chapterIndex)` → string | undefined
- `getChaptersForLevel(levelNum)` → string[]
- `getLevelColor(levelNum)` → hex string

### 3.5 Markdown subset used in `paragraph.text`

`src/components/education/EducationArticleRenderer.tsx:60-80` shows the renderer. Mobile must support:

| Syntax | Renders as |
|---|---|
| `**bold**` | `<strong>` |
| `__underline__` | `<u>` |
| `*italic*` or `_italic_` | `<em>` |
| `• item` or `- item` (line-leading) | `<li>` inside `<ul>` |
| `\n` | `<br />` |

That's it. No code blocks, no headings, no links. Headings are the `section.title` field — render as your h2/h3.

---

## 4. Progress tracking — exact behavior to replicate

`src/hooks/useEducationProgress.ts` is the authority. Behavior:

1. **On load (per level):**
   - If user is signed in → read from Firestore `users/{uid}/education_progress/{levelNum}`
   - If guest → read from LocalStorage key `kumami_edu_progress` (a `{ [levelNum]: LevelProgress }` object)

2. **On section visit** (`markSectionVisited(chapterIndex, sectionIndex)`):
   - Add the sectionIndex to `sectionProgress[chapterIndex]` if not already there
   - Persist immediately (write to Firestore if signed in, else LocalStorage)
   - **Don't mark chapter complete** — that happens explicitly

3. **On chapter complete** (`markChapterComplete(chapterIndex, totalSections?)`):
   - Optionally mark all sections in that chapter as visited (if totalSections provided)
   - Add chapterIndex to `completedChapters` if not already there
   - Persist
   - Web triggers this when user reaches the bottom of the last section AND clicks "Mark complete" / "Next chapter"

4. **Section progress within chapter (UI):**
   - Compute as `sectionProgress[chapterIndex].length / totalSectionsInChapter`
   - Show as a thin progress bar on each chapter card

5. **Chapter completion (UI):**
   - `completedChapters.includes(chapterIndex)` → green check, "Done" label

6. **Badge earned (achievements):**
   - For Level N: `completedChapters.length === PHASES[N-1].chapters.length`
   - Web renders earned badges with the Level's `hex` color, locked badges greyed out

**Critical:** writes are fire-and-forget (no `await` blocking the UI). Show optimistic UI immediately.

---

## 5. Article rendering — what each block type looks like

Mobile must render each `ArticleSectionContent.type`:

| Type | What to render | Notes |
|---|---|---|
| `paragraph` | Multi-line text from `text` field, parse with §3.5 markdown subset | Most common. Body font, comfortable line-height. |
| `image` | Image from `src`, alt text from `alt`, optional caption below | Cache with whatever image lib you use; consider downloading on first view. |
| `youtube` | Embed YouTube player using `videoId` | Use react-native-youtube-iframe or similar. Web uses the iframe embed URL `https://www.youtube.com/embed/{videoId}`. |
| `table` | Tabular layout with `headers` + `rows` | If `rowsJson` is present, parse it (`JSON.parse(rowsJson)`) — it's a fallback shape. On narrow screens, horizontal scroll is fine. |

Section structure: each `ArticleSection` has a `title` (render as h2) and an array of `content` blocks (render in order).

---

## 6. Article navigation (prev / next)

Inside an article, web shows **Previous chapter** and **Next chapter** buttons. The sibling lookup logic (`src/app/education/article/[id]/page.tsx:55-78`):

1. Query `education_articles` where `level == currentLevel` AND `status == 'published'`
2. Filter out `comingSoon` entries
3. Sort by `chapterIndex` ascending
4. Find current article's position by ID
5. Prev = item at index - 1 (or null), Next = item at index + 1 (or null)

Mobile should replicate this. When user taps Next → navigate to next article ID and (optionally) auto-call `markChapterComplete` for the just-finished chapter.

---

## 7. Auth & sync

### 7.1 Firebase Auth

- Same Firebase project as web (use the same `google-services.json` / `GoogleService-Info.plist`)
- Sign-in methods: Email/Password + Google
- **Email verification is enforced** — web won't treat user as signed-in until `user.emailVerified === true` (Google sign-in is auto-verified). Mobile should match this rule.
- `users/{uid}` document has `isPremium: boolean` and `role: 'user'|'admin'|'superadmin'` — education is **free for all users**, no Pro gate.

### 7.2 Offline behavior

Web doesn't have explicit offline support, but:
- Guest progress lives in LocalStorage → on mobile use AsyncStorage / SQLite
- When user signs in, **merge** local progress with Firestore (per-level: union of `completedChapters` and `sectionProgress` arrays). Web doesn't currently do this merge — mobile should do it better.

---

## 8. Visual / UX cues

These are conventions from the web. Keep them recognizable, adapt for mobile idioms:

- **Level color (`hex`)** is used as accent throughout that Level's UI — buttons, badges, progress bars
- **Locked badges** = greyed lock icon. **Earned badges** = trophy icon in the level color, with a radial glow background
- **Chapter cards** show: title, optional "HANDS-ON:" prefix (lab vs lecture — strip the prefix and tag visually), minutes, progress bar, check icon if complete
- **Hero on Level page** shows: tag pill, level number, title, blurb, detail, outcomes list, "Start Level X" CTA, chapter list
- **"HANDS-ON: " prefix** in chapter names indicates a lab — render with a distinct icon/tag (web strips the prefix and adds a "Lab" badge)

---

## 9. Where to get content

- **Static metadata (Phases, chapters, outcomes, badges, level colors):** copy `src/data/educationPhases.ts` verbatim. Don't fetch from Firestore.
- **Article content:** Firestore `education_articles` collection (real-time or one-shot, your choice).
- **Images:** Firebase Storage URLs (or any CDN URL stored in `thumbnail` / `src` fields)
- **Author info:** static — "Kumami Team / Web3 Education · Kumami World"

---

## 10. Step-by-step build order

Ship in this order so each phase is independently usable.

### Phase 1 — Read-only browsing (no progress)
1. Copy `educationPhases.ts` + utility helpers to mobile codebase
2. Build `JourneyScreen` — list 5 Levels from PHASES (no Firestore needed)
3. Build `LevelDetailScreen` — query `education_articles where level == X and status == 'published'` ordered by `chapterIndex`. Render the chapter list joined with PHASES.chapters as the canonical order (Firestore docs fill in the actual published content)
4. Build `ArticleScreen` — fetch one doc by ID, render sections + blocks using §3.5 markdown rules
5. Wire prev/next navigation per §6

**Acceptance:** user can read every published article. No progress yet.

### Phase 2 — Progress tracking
6. Build `useEducationProgress` equivalent (one per level; copy logic from `src/hooks/useEducationProgress.ts`)
7. Wire `markSectionVisited` to fire on section scroll-into-view (debounce ~500ms)
8. Wire `markChapterComplete` to fire when user taps "Mark complete" or "Next chapter" on the last section
9. Show progress bars + check icons on chapter cards
10. Merge LocalStorage progress into Firestore on first sign-in

**Acceptance:** progress persists across sessions and devices for signed-in users; guest progress survives app restart via AsyncStorage.

### Phase 3 — Dashboard + Achievements
11. Build `EducationDashboardScreen` — per-level summary (X/Y chapters done, % complete, "Continue Level X" button to last incomplete chapter)
12. Build `AchievementsScreen` — 5 badge tiles; earned vs locked logic from §4.6
13. Hero "Continue learning" surface on Dashboard pointing at the user's most-recent incomplete chapter

**Acceptance:** user sees overall progress at a glance; earning a badge reflects within seconds.

### Phase 4 — Polish
14. Pull-to-refresh on article + level lists
15. Skeleton loaders while Firestore queries resolve
16. Empty states (no published articles in a level yet, no progress, etc.)
17. Coming-soon chapters render as locked placeholders (don't error)
18. Optional: offline reading via cached article docs

---

## 11. Things web does NOT do (but mobile probably should)

Flag these to product before building, but they're natural mobile improvements:

- **Offline article cache** — web is online-only. Mobile users will expect to read on transit.
- **Progress merge on sign-in** — web overwrites local with Firestore on sign-in (loses guest progress). Mobile should union them.
- **Push notifications** — "you're 1 chapter away from your next badge"
- **Reading position resume** — scroll position per article, restored on revisit
- **Light/dark theme** — web has a dark education theme via CSS vars (`--surface`, `--text`, `--mint`, etc.); mobile should pick design tokens up front

---

## 12. Things NOT to port to mobile

- **EducationTopbar.tsx** — recently removed from web layout because the breadcrumb duplicated info. Mobile should use native nav header.
- **TipTap rich-text** (`editorMode: 'tiptap'` articles) — only a few articles use this. If you encounter a doc with `editorMode === 'tiptap'` and no `sections`, skip it for now (or render a "Open in browser" fallback). Most articles use the `sections` format.
- **EducationArticleRenderer.tsx** — web React; rebuild natively, don't try to bridge.

---

## 13. Reference files to read in the web repo

When in doubt, read these in order:

1. `src/data/educationPhases.ts` — canonical Phase/chapter metadata
2. `src/lib/educationUtils.ts` — pure helpers
3. `src/hooks/useEducationProgress.ts` — full progress logic
4. `src/app/education/article/[id]/page.tsx` — fetching + sibling lookup
5. `src/app/education/dashboard/page.tsx` — how dashboard aggregates per-level stats
6. `src/app/education/achievements/page.tsx` — badge earned logic
7. `src/components/education/EducationArticleRenderer.tsx` — markdown parsing + block rendering
8. `src/components/education/EducationSidebar.tsx` — navigation surfaces
9. `firestore.rules` — exact rules for `users/{uid}/education_progress`

---

## 14. Questions to confirm before starting

- Auth: are you reusing the existing Firebase project? (You should — keep one source of truth for users)
- Are mobile users granted the same identity as web (same uid)? (Yes if same Firebase project + same sign-in method)
- Do you want to start with iOS, Android, or both?
- Are we adding any mobile-only features (push notifs, offline cache) in v1, or pure parity first?
- Who owns the article authoring tool (currently web admin panel)? Mobile doesn't need it but flag for product.

Send questions/blockers in whatever channel the team uses — don't guess on data shapes; the source files above are the truth.
