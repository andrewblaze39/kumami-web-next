# Task 4: Clean up EducationArticleRenderer.tsx — Changes

## Files changed

### `src/components/education/EducationArticleRenderer.tsx`
- Removed `tiptapToSections()` (~110 lines) — the function that converted TipTap JSONContent into the classic sections format. No longer needed because the admin always writes `sections` to Firestore on save.
- Removed `tiptapNodeToText()` helper used only by `tiptapToSections`.
- Simplified sections derivation: replaced the three-way conditional (`sections → tiptapContent fallback → []`) with `article.sections || []`.
- Removed `editorMode` and `tiptapContent` fields from the `EducationArticleContentProps` article type.

### `src/app/education/article/[id]/page.tsx`
- Removed `editorMode` and `tiptapContent` from the object literal passed to `<EducationArticleRenderer article={...}>`. These properties no longer exist on the interface and caused a TypeScript build error.

## Tester focus areas

- Open an education article that was saved in TipTap mode (`editorMode: 'tiptap'` in Firestore). It should render normally — `sections` is always populated by the admin save path so content appears as before.
- Open a classic-mode article — behaviour should be unchanged.
- Step-by-step section navigation, progress bar, visited-section checkmarks, and the rail sidebar should all work identically to before.
- Articles with zero sections should display the "This article has no content yet." message.

## Build status
Clean — `npm run build` exits with zero TypeScript errors.

---

# Tasks 2 & 3: TipTap sections bug fix — Changes

## Files changed

### `src/components/admin/PublishEducation.tsx`
- Added import: `tiptapToSections` from `@/lib/tiptapToSections`
- Fixed critical bug: replaced `docData.sections = []` with a call to `tiptapToSections(tiptapContent)` that derives a populated sections array from the TipTap JSON, then maps it to the Firestore shape (with `rowsJson` serialization for tables)
- Updated editor mode toggle buttons with symmetric informational warnings:
  - Classic button (switching from TipTap): shows `alert` if `tiptapContent` is non-null ("Your TipTap content will still be saved, but you will edit using the section builder.")
  - TipTap button (switching from Classic): shows `alert` if classic sections have any title or content ("Your classic sections will still be saved, but you will edit using the TipTap editor.")
  - Neither warning blocks the switch

### `src/components/admin/EditEducation.tsx`
- Added import: `tiptapToSections` from `@/lib/tiptapToSections`
- Fixed critical bug in `handleUpdate`: replaced `updatePayload.sections = []` with the same derived-sections mapping as PublishEducation
- Fixed secondary bug: removed `updatePayload.tiptapContent = null` from the classic-mode branch — TipTap content is now preserved when the user edits in Classic mode, so switching back to TipTap does not lose the previous TipTap content
- Updated editor mode toggle buttons with the same symmetric warnings as PublishEducation (also tightened the Classic→TipTap condition to check `s.title || s.content.length > 0`, matching the Publish component)

## Tester focus areas

1. **TipTap save populates `sections`**: Publish or update an article in TipTap mode with H2 headings, paragraphs, images, and a YouTube embed. After saving, open the Firestore doc and confirm `sections` is a non-empty array mirroring the content.
2. **Course page and progress tracking**: Load a TipTap-authored article on the public course page and confirm sections render and progress can be tracked (previously broken because `sections` was always `[]`).
3. **Classic save does NOT clear `tiptapContent`**: Open an article that has TipTap content, switch to Classic mode, make an edit, save — confirm `tiptapContent` field is still present in Firestore.
4. **Mode toggle warnings — Classic→TipTap**: Switch from Classic to TipTap when sections have any content. Should show the informational alert then switch.
5. **Mode toggle warnings — TipTap→Classic**: Switch from TipTap to Classic when `tiptapContent` is non-null. Should show the informational alert then switch.
6. **Table nodes**: Save a TipTap article that contains a table. Confirm the derived section contains a `table` item with `headers` and `rowsJson` (not `rows`) in Firestore.

## Build status
Clean — `npm run build` exits with zero TypeScript errors.

---

# Task 1: tiptapToSections utility — Changes

## Files Changed

### Created: `src/lib/tiptapToSections.ts`
Pure utility (no React, no hooks) that converts a TipTap JSONContent object into a `Section[]` array compatible with the existing `ArticleSection` shape used across the education system.

Logic:
- Iterates top-level nodes in the TipTap doc.
- Each H2 heading starts a new section. Content before the first H2 is collected into an "Introduction" section.
- Other headings (H1, H3, etc.) are emitted as bold paragraph text.
- Paragraphs are converted to markdown-ish strings via `nodeToMarkdown()`, which applies bold/italic/underline marks.
- Bullet and ordered lists are flattened into a single paragraph with `•` prefix per item.
- `image` nodes map to `{ type: 'image', src, alt, caption }`.
- `youtube` nodes extract the video ID from the `src` attribute and map to `{ type: 'youtube', videoId }`.
- `table` nodes extract the first row as headers and remaining rows as data rows.

## Build Status
`npm run build` passed with no TypeScript errors and no new warnings.

## Tester Focus
- Pass a TipTap JSON doc with no H2s — should return a single "Introduction" section.
- Pass a doc with H2s — each H2 should start a fresh section.
- Content before any H2 should be in "Introduction", not dropped.
- Verify empty doc (`{}` or `{ content: [] }`) returns `[]` without throwing.
- Verify `image` nodes carry `alt` and `caption` from attrs.
- Verify `youtube` nodes correctly parse the video ID from full YouTube URLs.
- Verify `table` nodes: first row → `headers`, subsequent rows → `rows`.
- Verify bold/italic/underline marks are wrapped with `**`, `*`, `__` respectively.

---

# TipTap Rich Text Editor — Changes (latest session)

## Files Changed

### New files

**`src/components/admin/TipTapEditor.tsx`**
Full-featured TipTap editor for the admin. Toolbar: Bold, Italic, Underline, Strikethrough, H1/H2/H3, Bullet list, Ordered list, Table (insert + add/delete row/col), Image (URL prompt), YouTube (URL prompt), Undo/Redo. Active state shown on toolbar buttons. Props: `content: JSONContent | null`, `onChange: (content: JSONContent) => void`. Table extensions imported as named exports (`{ Table, TableRow, TableCell, TableHeader }`) from `@tiptap/extension-table` — the package does not have a default export.

**`src/components/education/TipTapRenderer.tsx`**
Read-only TipTap renderer for article pages. `editable: false`. Same extensions as editor. Renders with `.tiptap-renderer` CSS class using education design-system CSS variables. Loaded with `next/dynamic` + `ssr: false` from EducationArticleRenderer to avoid SSR hydration issues.

### Modified files

**`src/types/education.ts`**
Added to `EducationArticleDoc`: `editorMode?: 'classic' | 'tiptap'` and `tiptapContent?: unknown`.

**`src/app/education/education.css`**
Added two CSS blocks: `.tiptap-renderer` (dark-themed article renderer using CSS variables), and `.tiptap-editor-wrap` / `.tiptap-toolbar` / `.tiptap-toolbar-btn*` / `.tiptap-editor-area` / `.tiptap-divider` (light admin editor, white background, min-height 400px).

**`src/components/admin/PublishEducation.tsx`**
- Added `TipTapEditor` import, `editorMode` state (default `'classic'`), `tiptapContent` state
- Editor mode toggle buttons above the sections block
- TipTap mode shows `<TipTapEditor>`; Classic mode shows existing section builder (unchanged)
- `saveArticle()` branches: TipTap stores `tiptapContent + sections: []`; Classic stores sections as before
- Reset on save clears tiptap state

**`src/components/admin/EditEducation.tsx`**
- Same additions as PublishEducation
- `handleEdit()` detects mode from loaded article (`tiptapContent` presence)
- Classic-to-TipTap switch shows `window.confirm` warning if sections have content
- `handleUpdate()` branches on mode; switching back to Classic writes `tiptapContent: null` to clear it

**`src/components/education/EducationArticleRenderer.tsx`**
- Extended `EducationArticleContentProps.article` with `editorMode?` and `tiptapContent?`
- Added conditional early return when `article.tiptapContent` is set: single-page layout with breadcrumb, header, thumbnail, full `<TipTapRenderer>` content, prev/next chapter nav, rail with "Full article" item and mark-complete button. No step-by-step navigation for TipTap articles.
- Classic articles render exactly as before.

**`src/app/education/article/[id]/page.tsx`**
- Added `editorMode?` and `tiptapContent?` to `ArticleDoc` interface
- Both passed through to `EducationArticleRenderer` in the article prop

## Tester focus areas

1. **Admin Publish — Classic (regression)**: Create an article in Classic mode. Sections save and render correctly on the article page. Toggle defaults to Classic.
2. **Admin Publish — TipTap**: Switch to TipTap, type content with headings/bold/lists. Insert table, add/remove rows/cols. Insert image via URL and YouTube URL. Undo/redo. Save draft and publish.
3. **Admin Edit — mode detection**: Open a TipTap article — toggle shows TipTap, content loads. Open a classic article — shows Classic.
4. **Admin Edit — mode switch warning**: Switching a classic article (with content) to TipTap shows `window.confirm`.
5. **Article page — TipTap render**: Title, blurb, author, thumbnail at top. TipTap content renders with dark education styles. Tables, images, iframes render. Rail shows "Full article" + mark-complete. No step-by-step section nav.
6. **Article page — Classic unchanged**: Existing classic articles have identical behavior (section nav, progress bar, rail).
7. **Build**: `npm run build` passes with zero errors (verified).

---

# Rich Text Editor + Table Support — Changes (prior session)

## Files Changed

### `src/components/admin/RichTextEditor.tsx` (NEW)
A `contentEditable`-based rich text editor component. Features:
- Toolbar with B / I / U / bullet-point buttons
- Keyboard shortcuts: Ctrl+B, Ctrl+I, Ctrl+U
- Converts HTML to markdown-like text on every change (`**bold**`, `*italic*`, `__underline__`, `• bullet`, `\n` newlines)
- Syncs from external `value` prop without clobbering cursor when the editor is focused
- Placeholder via CSS `::before` on the editable area

### `src/types/education.ts`
- Added `type: 'table'` to `ArticleSectionContent` union
- Added `headers?: string[]` and `rows?: string[][]` to `ArticleSectionContent`

### `src/components/admin/PublishEducation.tsx`
- Imports `RichTextEditor`
- `ContentItem` interface extended with `type: 'table'`, `headers`, `rows`
- `changeItemType` handles `'table'` — defaults to 2 headers + 1 empty row
- Paragraph `<textarea>` replaced with `<RichTextEditor>`
- Table type added to item type dropdown
- Table editor UI added: column-count input, header row inputs, data row inputs, add/remove row buttons
- `cleanedSections` and `previewArticle` pass through `headers` and `rows`

### `src/components/admin/EditEducation.tsx`
- Imports `RichTextEditor`
- `ContentItem` interface extended with `type: 'table'`, `headers`, `rows`
- Item type dropdown handles `'table'` with correct default values
- Paragraph `<textarea>` replaced with `<RichTextEditor>`
- Table type added to dropdown
- Table editor UI added (mirrors PublishEducation)
- `cleanedSections` and `previewArticle` pass through `headers` and `rows`

### `src/components/education/EducationArticleRenderer.tsx`
- Local `ArticleSectionContent` interface extended with `type: 'table'`, `headers`, `rows`
- Added table render block: `<div class="edu-art-table-wrap"><table class="edu-art-table">...</table></div>` with thead/tbody

### `src/app/education/education.css`
- Added `.edu-art-table-wrap`, `.edu-art-table`, `.edu-art-table th`, `.edu-art-table td`, `.edu-art-table tr:hover td` styles using existing CSS variables

---

## Tester Focus Areas

1. **RichTextEditor — formatting round-trip**: Type bold via Ctrl+B (or toolbar B), save/publish the article, then edit it again — the bold text should reappear as bold in the editor (not as raw `**text**`).
2. **RichTextEditor — plain text backward compat**: Open an existing article in EditEducation that has plain paragraph text — it should render normally without any markdown noise.
3. **Table type — creation**: Change a content item to "Table" in PublishEducation or EditEducation. Verify 2 default column headers and 1 empty data row appear. Adjust column count, edit headers, add/remove rows, then save.
4. **Table rendering in EducationArticleRenderer**: Open a published article that has a table item. Verify it renders with header row and data rows. Hover a row to see the highlight. Test on a narrow viewport — `overflow-x: auto` should allow horizontal scroll.
5. **Live preview panel**: Changes to paragraph text (including formatting) and table data should appear in the right-side live preview in real time.
6. **Build**: Confirmed `npm run build` passes with zero errors or TypeScript warnings.

---

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
