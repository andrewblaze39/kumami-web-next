/**
 * Deletes the run's QA personas and every "[QA]" Pro-dashboard item, so
 * kumami-dev is left exactly as it was. Set QA_KEEP_ACCOUNTS=1 to keep the
 * accounts for manual inspection (they're removed at the start of the next run).
 */
import fs from 'node:fs';
import { deleteQaAccounts, deleteQaContent, PERSONAS_FILE, type Persona } from './personas';

export default async function globalTeardown() {
  const content = await deleteQaContent();
  if (process.env.QA_KEEP_ACCOUNTS === '1') {
    console.log(`[qa] kept QA accounts; removed ${content} [QA] content docs`);
    return;
  }
  const uids = fs.existsSync(PERSONAS_FILE)
    ? (JSON.parse(fs.readFileSync(PERSONAS_FILE, 'utf8')) as Persona[]).map((p) => p.uid).filter((u): u is string => !!u)
    : [];
  const n = await deleteQaAccounts(uids);
  console.log(`[qa] deleted ${n} QA accounts and ${content} [QA] content docs`);
}
