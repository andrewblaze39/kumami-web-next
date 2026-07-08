/**
 * Returns true only for paths that are safe to use as internal redirect
 * targets, i.e. paths that start with `/` but whose second character is
 * neither `/` nor `\`.
 *
 * This rejects:
 *  - Protocol-relative URLs like `//evil.com`
 *  - Backslash-normalised variants like `/\evil.com`
 *    (browsers normalise `/\` to `//` before navigation)
 *  - Absolute URLs like `https://evil.com`
 *  - Empty strings
 */
export function isSafeInternalPath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length < 1) return false;
  if (path[0] !== '/') return false;
  const second = path[1];
  if (second === '/' || second === '\\') return false;
  return true;
}
