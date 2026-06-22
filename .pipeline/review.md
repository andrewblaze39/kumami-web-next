# Education System Revamp -- Final Review

**Reviewer:** Claude Opus 4.6
**Date:** 2026-06-20
**Files reviewed:** 16 source files, 1 seeder script, pipeline documents

---

## 1. Level 1-5 / Chapter / Section Hierarchy Consistency

**PASS.** The hierarchy is consistent across all files:

- `educationPhases.ts` defines `PHASES[0..4]` with `.n` = 1-5, `.chapters[]` indexed 0-based
- Admin forms (Publish/Edit) write `level` as a number and `chapterIndex` as a 0-based integer
- `[phase]/page.tsx` iterates `levelData.chapters` by array index and looks up `articleMap.get(ci)`
- `[phase]/[lesson]/page.tsx` queries by `resolveLevelNumber(data.level) === levelNum && data.chapterIndex === lessonIdx`
- `article/[id]/page.tsx` sorts siblings by `chapterIndex` ASC
- `EducationArticleRenderer` displays `Chapter {resolvedChapterIndex + 1}: {chapterName}` (1-indexed for display, 0-indexed internally)
- Seeder writes `level` as number and `chapterIndex` as 0-based number

No mismatches found.

---

## 2. Admin Chapter Picker Shows Actual Chapter Names

**PASS.** Both `PublishEducation.tsx` (line 269) and `EditEducation.tsx` (line 309) render:
```
<option key={i} value={i}>Chapter {i + 1}: {ch}</option>
```
where `ch` comes from `PHASES.find(p => p.n === level).chapters`. These are the real chapter names from `educationPhases.ts`.

---

## 3. Phase/Lesson Redirect Queries by Level Number + ChapterIndex

**PASS.** `[phase]/[lesson]/page.tsx` lines 40-43:
```typescript
data.status === 'published' &&
resolveLevelNumber(data.level) === levelNum &&
data.chapterIndex === lessonIdx
```
Correctly uses `resolveLevelNumber` for backward compat and matches on `chapterIndex`.

---

## 4. Backward Compat with Old String "Level 1" Format

**PASS.** `resolveLevelNumber` is used in all read paths:
- `[phase]/page.tsx` line 33
- `[phase]/[lesson]/page.tsx` line 42
- `article/[id]/page.tsx` lines 61, 122
- `EducationGrid.tsx` lines 285, 451, 466-467
- `AllEducationArticles.tsx` lines 29, 34, 73
- `EditEducation.tsx` line 94 (on load, converts legacy string to number)
- `EducationArticleRenderer.tsx` line 77

The regex `/\bLevel\s*0?(\d+)\b/i` handles "Level 1", "Level 01", "level 1" etc.

---

## 5. TypeScript Type Consistency

**PASS with one minor note.**

`src/types/education.ts` defines `EducationArticleDoc` and `EducationArticle` (extends with `id: string`). These are imported in `EducationGrid.tsx` and used as the `[phase]/page.tsx` article map value type.

Several files still define local `Article` or `ArticleDoc` interfaces (e.g., `article/[id]/page.tsx`, `AllEducationArticles.tsx`, `EditEducation.tsx`). These local interfaces are compatible subsets of the shared type. Not a bug, but a missed consolidation opportunity.

---

## 6. Seeder Script Correctness

**PASS.** The seeder:
- Writes `level` as a number (1 or 2)
- Writes `chapterIndex` as a 0-based number
- Writes `blurb`, `description`, `featured`, `author`, `status: 'published'`
- Auto-computes `minutes` from word count / 200
- Sets `featured: true` only for chapterIndex 0 of each level
- Uses `serverTimestamp()` for `createdAt`
- Has duplicate protection (`--force` to override)
- Has `--dry-run`, `--level N`, `--keyfile` flags

One minor note: the seeder checks duplicates with a Firestore `where('level', '==', article.level)` query. Since it writes `level` as a number, this will not find existing articles that have `level` as a string "Level 1" from legacy data. The `--force` flag handles this, and the README documents the behavior. Not a blocker.

---

## 7. Security Review

**PASS.**

- **XSS:** The `parseMarkdown` function in `EducationArticleRenderer.tsx` correctly calls `escapeHtml()` before applying regex markdown transforms. The `dangerouslySetInnerHTML` usage is safe because `$1` captures only contain already-escaped content.
- **YouTube embeds:** `videoId` is admin-authored content interpolated into an iframe `src` attribute. Not exploitable in practice.
- **Image URLs:** `article.thumbnail` used in CSS `backgroundImage: url(...)` could theoretically allow CSS injection if it contained `)`. Risk is minimal since content is admin-authored, not user-submitted. Not a blocker.
- **Firestore reads:** All collection-wide fetches filter client-side. No user-supplied strings are used in Firestore queries (no injection risk).
- **No authentication bypass:** Admin components rely on the existing `ProtectedRoute` + role-based auth in `AuthContext`.

---

## 8. UX Gaps

**No blocking issues found.** Minor observations:

- **Prev/next on article page skips unpublished chapters:** `fetchSiblingIds` only finds published siblings sorted by `chapterIndex`. If chapters 0, 2, 5 are published, "next" from chapter 0 goes to chapter 2. This is correct behavior -- you navigate between what exists.
- **"Start course" button** on `[phase]/page.tsx` links to `/education/{n}/0` which will redirect to the article if one exists, or show "coming soon" if not. Correct.
- **No dead links found.** All internal navigation uses consistent URL patterns (`/education/{n}`, `/education/{n}/{ci}`, `/education/article/{id}`).

---

## Findings Summary

| # | Finding | Severity | File | Blocking? |
|---|---------|----------|------|-----------|
| 1 | Local `Article`/`ArticleDoc` interfaces not consolidated to shared type | Low | `article/[id]/page.tsx`, `AllEducationArticles.tsx`, `EditEducation.tsx` | No |
| 2 | Seeder duplicate check uses exact `level` match (number), won't catch legacy string-level duplicates | Low | `scripts/seedEducation.ts` line 1231 | No |
| 3 | `[phase]/page.tsx` status filter `if (data.status && data.status !== 'published')` admits articles with missing `status` field | Low | `src/app/education/[phase]/page.tsx` line 32 | No -- same pattern used in other files, and articles without status are likely old imports that should be visible |
| 4 | CSS `backgroundImage: url(${thumbnail})` has no sanitization of parentheses/quotes | Low | `EducationArticleRenderer.tsx` line 190, `EducationGrid.tsx` line 305 | No -- admin-authored content |
| 5 | `EditEducation.tsx` uses `item.id!` non-null assertion on content items | Low | Lines 435-502 | No -- `id` is assigned by `generateId()` in `handleEdit` |
| 6 | `no-unused-expressions` lint warning on `[phase]/page.tsx` line 52 (`if (!levelData) notFound()`) | Low | `src/app/education/[phase]/page.tsx` | No -- valid Next.js pattern, `notFound()` throws internally |

---

## VERDICT: SHIP

The implementation is correct, complete, and consistent with the spec. The Level/Chapter/Section hierarchy is uniform across all 16 files. Backward compatibility with legacy string `level` fields is handled via `resolveLevelNumber` at every read path. The admin forms write the correct new schema. The seeder is well-structured with proper CLI ergonomics. No security vulnerabilities, no type mismatches, no dead links. The six findings above are all low-severity and none warrant blocking the ship.
