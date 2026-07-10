# Review: `8e7c153` — safeInternalPath redirect validation

**Reviewer:** Claude Opus 4.6
**Date:** 2026-07-08

---

## Summary

New `src/lib/safeInternalPath.ts` adds an `isSafeInternalPath()` predicate to validate all redirect targets against open-redirect attacks. Applied at all four consumption sites. SignUpModal now preserves existing deep-links instead of overwriting them.

---

## Build & Tests

- `npx tsc --noEmit`: Clean (no errors)
- `npm test`: 657 tests passed (32 test files), including the 9 new `safeInternalPath` tests

---

## Predicate Correctness

The predicate in `src/lib/safeInternalPath.ts`:

```typescript
export function isSafeInternalPath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length < 1) return false;
  if (path[0] !== '/') return false;
  const second = path[1];
  if (second === '/' || second === '\\') return false;
  return true;
}
```

**Correctly rejects:**
- Protocol-relative URLs (`//evil.com`)
- Backslash-normalised variants (`/\evil.com`)
- Absolute URLs (`https://evil.com`)
- Empty strings, null, undefined
- Bare domains (`evil.com`)

**Correctly accepts:**
- Normal internal paths (`/world/pro`)
- Root slash (`/`)
- Paths with query strings (`/world/news?tab=all`)

**Edge case note:** `path[1]` on a single-char string `/` returns `undefined`, which is neither `/` nor `\`, so `/` correctly passes. This is sound.

No issues found with the predicate logic. The type guard (`path is string`) is appropriate for the usage sites which pass `string | null` from `sessionStorage.getItem()`.

---

## Consumption Site Coverage

All four redirect-consumption sites verified:

| Site | File | Validated |
|------|------|-----------|
| AuthModals `consumeRedirectTarget()` | `src/components/world/AuthModals.tsx` | Yes -- replaces old inline `startsWith('/') && !startsWith('//')` check |
| HomeGateClient useEffect | `src/app/HomeGateClient.tsx` | Yes -- wraps `stored` before passing to `router.replace()` |
| LoginClient (query param + sessionStorage) | `src/app/login/LoginClient.tsx` | Yes -- validates both `queryReturn` and `stored` paths |
| SignupClient (useEffect + Go to Login button) | `src/app/signup/SignupClient.tsx` | Yes -- validates in both locations |

**Write-side producers** (`ProtectedRoute.tsx`, `WorldProtected.tsx`) only write `window.location.pathname + window.location.search`, which is inherently same-origin and safe. No validation needed on the write side.

---

## Deep-link Preservation Fix

`SignUpModal` in `AuthModals.tsx` now guards `sessionStorage.setItem('redirectAfterSignup', REDIRECT_TARGET)` with `if (!sessionStorage.getItem('redirectAfterSignup'))` in both the Google sign-in handler and the "Go to Log In" button. This correctly preserves a deep-link that `WorldProtected` already saved, rather than overwriting it with the fallback `/world/news`.

---

## LoginClient sessionStorage Cleanup

The LoginClient now removes sessionStorage keys immediately after reading, regardless of whether the value passes validation. This is correct -- it prevents stale redirect targets from persisting if they fail validation.

---

## Test Quality

9 unit tests covering:
- 3 accepted paths (normal, root, with query string)
- 6 rejected paths (protocol-relative, backslash, absolute URL, empty, null, undefined, bare domain)

The tests are meaningful and cover the critical attack vectors. One minor gap: no test for paths with fragments (`/world/news#section`), but this would pass correctly and is not a security concern.

---

## Issues Found

None. No security, correctness, or performance issues identified.

---

VERDICT: SHIP
