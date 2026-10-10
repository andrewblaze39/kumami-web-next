/**
 * Deletes the run's fresh qa0 account. The fixed qa1/qa2/qa3 accounts stay, and
 * so does the [TEST] content qa3 created (Andrew wants to look at it) — both
 * are cleaned up / re-asserted at the START of the next run (global-setup.ts).
 * Set QA_KEEP_ACCOUNTS=1 to keep qa0 too for manual inspection.
 */
import fs from 'node:fs';
import { deleteFreshAccounts, PERSONAS_FILE, type Persona } from './personas';

export default async function globalTeardown() {
  if (process.env.QA_KEEP_ACCOUNTS === '1') {
    console.log('[qa] kept qa0; [TEST] content stays until the next run');
    return;
  }
  const uids = fs.existsSync(PERSONAS_FILE)
    ? (JSON.parse(fs.readFileSync(PERSONAS_FILE, 'utf8')) as Persona[]).filter((p) => !p.fixed).map((p) => p.uid).filter((u): u is string => !!u)
    : [];
  const n = await deleteFreshAccounts(uids);
  console.log(`[qa] deleted ${n} throw-away account(s); [TEST] content stays until the next run`);
}
