# Education Dashboard — Changes (latest session)

## Files Created

### `src/app/education/dashboard/page.tsx`
New client component at `/education/dashboard`. Sections top to bottom:

- **Welcome header** — greets the user by `displayName` (or "Learner") and shows overall % progress across all 5 levels.
- **Continue Learning card** — dark surface card with a left accent border in the current level's color. Finds the first incomplete level then first incomplete chapter within it. "Resume chapter" links to `/education/article/[id]` when a Firestore article is found for that level+chapterIndex; otherwise links to the chapter placeholder route. "View level overview" links to `/education/[n]`.
- **My Insights** — 2x2 stat grid (sections visited, levels completed, estimated time learning, achievements earned). Time is derived from `minutes` fields on articles in completed chapters.
- **Learning history** — lists all 5 levels with colored number circle, title, chapter progress, tag, and % bar. Each row links to its level page. "See full history" links to `/education`.
- **Achievements** — five badge circles (earned = colored + checkmark, unearned = gray + lock), badge name, and status label. Links to `/education/achievements`.
- **New & updated lessons** — fetches published, non-comingSoon articles ordered by `createdAt desc` (with a client-side fallback if the Firestore composite index is absent), shows 3 cards with level tag, title, blurb, section count, minutes. Links to `/education`.

Data sources: `useEducationProgress` called once per level (5 hook calls), `useAuth` for display name, single Firestore query for articles.

## Files Modified

### `src/components/education/EducationSidebar.tsx`
- Added `Home` import from lucide-react.
- Added `{ key: 'dashboard', label: 'Dashboard', href: '/education/dashboard', icon: <Home> }` as the first item in `LEARN_ITEMS`.
- Updated `learnActive()` to highlight `'dashboard'` only when `pathname === '/education/dashboard'`, and updated `'courses'` to exclude `/education/dashboard`.

### `src/app/education/education.css`
Added ~280 lines of dashboard-specific CSS at the end of the file, all `edu-dash-` prefixed:
- Welcome section, top-row grid (continue + stats), continue learning card with left border accent, 2x2 stat grid, 3:2 history+achievements row, badge circle row, 3-column new-lessons grid. Responsive breakpoints at 1050px and 680px.

## Tester focus areas

1. **Logged-in vs guest** — The dashboard calls `useAuth()`. Verify it renders gracefully if `currentUser` is null; the "Learner" fallback name should appear.
2. **Progress tracking** — With some chapters marked complete, confirm the correct current level and chapter are identified. Edge: all levels 100% complete should show last level without error.
3. **Continue Learning article link** — If the current chapter has a published Firestore article with matching `chapterIndex`, button says "Resume chapter" and links to `/education/article/[id]`. If no article, button says "Start chapter" and links to the placeholder route.
4. **New lessons Firestore query** — Uses `orderBy('createdAt', 'desc')` with `where('status', '==', 'published')`. If the composite index is missing, the fallback full-scan runs silently. Check browser console for Firestore index errors.
5. **Sidebar Dashboard highlight** — Navigating to `/education/dashboard` should highlight "Dashboard" and NOT highlight "My Courses".
6. **Responsive layout** — At ~1050px: top row stacks, stats expand to 4 columns, history stacks. At ~680px: stats become 2 columns, lessons become 1 column.

---

# Education System Fixes — Changes (prior session)

## Files Created

### `src/hooks/useEducationProgress.ts`
Progress tracking hook for the education system. Reads/writes to Firestore `users/{uid}/education_progress/{levelNum}` subcollection when logged in; falls back to `localStorage` key `kumami_edu_progress` for unauthenticated users. Document structure: `{ completedChapters: number[], sectionProgress: { [chapterIndex: number]: number[] }, updatedAt: serverTimestamp() }`. Exports: `markSectionVisited(chapterIndex, sectionIndex)`, `markChapterComplete(chapterIndex)`, `isChapterComplete(chapterIndex)`, `getChapterSectionProgress(chapterIndex)`, `getProgress()`, `loaded` flag.

### `src/components/education/JourneyLevelCards.tsx`
Client component replacing the inline level-card grid in the journey page. Each `LevelCard` calls `useEducationProgress` for its own level number so it renders live progress (X/N chapters complete, % fill bar, status label "Not started" / "In progress" / "Complete!", check-mark icon when all chapters are done). Extracted as a separate client island so `page.tsx` can keep its `generateMetadata` server export.

### `src/app/education/achievements/page.tsx`
New client page at `/education/achievements`. Shows 5 achievement cards (one per level). Each card calls `useEducationProgress` to determine if all chapters are complete. Earned badges show the level color, a trophy icon, and a green "Earned" pill. Unearned badges are grayed/locked and display chapter progress count or "Complete Level N to unlock". Header shows "X of 5 earned" count.

## Files Modified

### `src/components/education/EducationSidebar.tsx`
- Removed "Dashboard" nav item (dead link, same href as "The Journey").
- Removed "Warm Up" nav item (future feature).
- Removed "Saved" nav item (future feature).
- Removed the "Close menu" button from the sidebar footer entirely.
- Updated "Achievements" href from `/education` to `/education/achievements`.
- Changed brand area from `kūmami WORLD` logo pill to plain `"Education"` text using the existing `.edu-brand-edu` CSS class (turquoise, 800 weight, 22px).
- Updated `learnActive` logic to correctly highlight "Achievements" on its route and "My Courses" on all other `/education/...` routes.

### `src/components/education/EducationTopbar.tsx`
- Removed `style={{ display: 'flex' }}` inline style from the `.edu-menu-btn` hamburger button. The CSS already sets `display: none` on desktop and `display: flex` at `max-width: 900px`; the inline style was overriding the CSS and making the button always visible.

### `src/components/education/EducationArticleRenderer.tsx`
- Imported `useEducationProgress` and `useEffect`.
- Added `handleMarkComplete` callback that calls `markChapterComplete(resolvedChapterIndex)` when the user clicks "Mark complete & continue", "Next chapter", or "Complete level" (both in rail and in section nav).
- Added `useEffect` that pre-fills `visitedSections` from saved Firestore/localStorage progress after the hook loads, so returning users see checkmarks on previously-read sections.
- `goToStep` now calls `markSectionVisited(chapterIndex, sectionIndex)` for each section the user navigates to.

### `src/app/education/[phase]/page.tsx`
- Imported `useEducationProgress`.
- Replaced hardcoded `pct = 0` / `doneCh = 0` with live values derived from `isChapterComplete(ci)` for each chapter slot.
- Chapter status (`'done'` / `'current'` / `'upcoming'`) now reflects real completion — the green check circles in the accordion header are accurate.

### `src/app/education/page.tsx`
- Replaced the inline PHASES level-card grid with `<JourneyLevelCards />`.
- Removed now-unused imports (`BookOpen`, `Clock`, `Trophy`, `ArrowRight`, `PHASES`).

---

## What the Tester Should Focus On

1. **Progress save/restore** — Log in, read through sections in an article (each section navigation fires `markSectionVisited`). Click "Mark complete & continue" or "Next chapter" on the last section. Reload the page — visited-section checkmarks should persist. Go to `/education/1` — the completed chapter should show a green check in the accordion.

2. **Unauthenticated fallback** — Log out, navigate the same flow. Progress should persist in localStorage across page reloads (check `kumami_edu_progress` key in DevTools > Application > Local Storage).

3. **Achievements page** (`/education/achievements`) — Complete all chapters in a level, then check the badge turns colored with a trophy icon and "Earned" pill. The "X of 5 earned" counter in the header should increment.

4. **Sidebar** — Confirm "Dashboard", "Warm Up", "Saved", and "Close menu" are gone. Confirm the brand shows "Education" in turquoise (not the `kūmami WORLD` pill). Confirm "Achievements" sidebar link navigates to `/education/achievements` and highlights correctly there.

5. **Hamburger button** — On desktop (>900px), the 3-line menu button should be invisible. On mobile (<900px) it should appear and toggle the sidebar.

6. **Journey page** (`/education`) — Level cards should show "Not started / 0/N" initially, update to show in-progress or complete status after chapters are marked complete.

7. **Build** — Confirmed zero errors with `npm run build`.

---

# Prior session changes preserved below

## Education UI Alignment — Reference Mockup Changes

### Files changed

#### `src/components/education/EducationSidebar.tsx`
- Replaced "Education" brand text with `kūmami WORLD` logo pill (uses existing `.edu-brand-logo` CSS class). Brand link now goes to `/` (home).
- Added Dashboard (Home icon → /education) and Achievements (Trophy icon → /education) to the LEARN group, filling the 4-item LEARN section from the reference mockup.
- Added a MORE nav group with Warm Up (Flame icon + green dot indicator → /education), Saved (Bookmark icon → /education), Settings (Settings icon → /education) — all visual-only stubs.
- `NavLink` updated to spread `flex: 1` on the label and render the green dot for items with `dot: true`.
- `learnActive()` helper ensures Dashboard and Journey don't conflict.
- Removed the standalone Home link that existed above the LEARN group.
- LEVELS section kept intact.

#### `src/app/education/page.tsx` (Journey page)
- Restructured level card JSX from 3-column horizontal layout (marker | body | side) to a flat vertical sequence. Cards now stack: circle marker → tag → title → blurb → meta stats → badge pill → progress bar + CTA.
- `.edu-lv-side` is now at the bottom of each card (not a separate column).

#### `src/app/education/education.css`
- `.edu-journey`: changed to `display: grid; grid-template-columns: repeat(5, 1fr)` — 5-column horizontal grid.
- `.edu-lv-card`: changed to `display: flex; flex-direction: column; align-items: center; text-align: center` — vertical centered cards. Hover animation `translateX(3px)` → `translateY(-3px)`.
- `.edu-lv-marker`: `margin-bottom: 14px` (was `margin-top`).
- `.edu-lv-title`: reduced 20px → 15px for narrower column fit.
- `.edu-lv-meta`: added `justify-content: center`.
- `.edu-lv-side`: changed to full-width stretch with top border separator.
- `.edu-lv-go`: added `justify-content: center`.
- `@media (max-width: 900px)`: journey grid becomes 3 columns.
- Added `@media (max-width: 600px)`: journey grid becomes 1 column.

#### `src/app/education/[phase]/page.tsx` (Course page)
- Added `'instructor'` to the tab union type and TABS array (between Details and FAQ).
- Added Instructor tab content: Kumami Team card with colored avatar circle and bio paragraph.
- Chapter row subtitle now shows `⏱ N sections` and `⏰ Nm` from `linkedArticle.sections.length` and `linkedArticle.minutes`.
- Expanded chapter body now lists `linkedArticle.sections` as "Part 1: [title]" rows using existing `.edu-part` / `.edu-pdot` / `.edu-ptype` classes with "Read" label.
- CTA changed from "Review" to "Revisit chapter".

#### `src/components/education/EducationArticleRenderer.tsx` (Article renderer)
- Rail title changed to flex row showing "In this chapter" left-aligned and `{progressPercent}%` in mint on the right.
- Section items in rail: label gets `flex: 1`, each item now has a `<span className="edu-ptype">Read</span>` badge on the right.
- "Mark complete & continue" CTA added at bottom of rail: links to `nextArticleId` if present, else "Complete level →" linking to level page.

---

## Education System Revamp — Changes

### Files Created

#### `src/types/education.ts`
Shared TypeScript interfaces: `ArticleSectionContent`, `ArticleSection`, `EducationArticleDoc`, `EducationArticle`. Used across admin, public pages, and grid components.

#### `src/lib/educationUtils.ts`
Shared utility functions: `resolveLevelNumber`, `formatLevelLabel`, `getLevelData`, `getChapterName`, `getChaptersForLevel`, `getLevelColor`.

### Files Modified

#### `src/data/educationPhases.ts`
Removed `chapterParts()`, `PARTS_POOL`, `TYPE_POOL` exports.

#### `src/components/admin/PublishEducation.tsx`
Added level number picker, chapterIndex picker, blurb, minutes, featured, description fields. Up/down reordering on sections and items. Live preview panel. Duplicate level+chapterIndex warning.

#### `src/components/admin/EditEducation.tsx`
Mirrors all PublishEducation changes for the edit form.

#### `src/components/education/EducationArticleRenderer.tsx`
Extended props with `levelNum`, `chapterName`, `chapterIndex`. Full breadcrumb. blurb/minutes display.

#### `src/app/education/article/[id]/page.tsx`
`fetchSiblingIds` sorts by chapterIndex. Passes chapterIndex/levelNum/chapterName to renderer.

#### `src/app/education/[phase]/page.tsx`
Article linked by chapterIndex. Removed fake parts. Renamed phaseData→levelData.

#### `src/app/education/[phase]/[lesson]/page.tsx`
Redirects to article if found. Shows simplified coming-soon otherwise.

#### `src/components/EducationGrid.tsx`
Unified with PHASES. Uses resolveLevelNumber. Featured articles sorted by level+chapterIndex.

#### `src/components/AllEducationArticles.tsx`
Level filter uses resolveLevelNumber. Works with both string and number level fields.

#### `src/components/education/EducationSidebar.tsx`
Added Levels nav group with all 5 levels.

#### `src/components/education/EducationTopbar.tsx`
Breadcrumb uses Level N: Title format.

#### `src/app/education/page.tsx`
Level cards use Level N format.
