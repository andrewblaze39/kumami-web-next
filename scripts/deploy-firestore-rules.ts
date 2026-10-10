/**
 * Deploy firestore.rules to **kumami-dev** with the service account in
 * .env.local (no Firebase CLI needed). Refuses any other project — production
 * (kumami-6df47) is deployed by Andrew with the Firebase CLI:
 *   firebase deploy --only firestore:rules --project kumami-6df47
 *
 *   npx tsx scripts/deploy-firestore-rules.ts            # deploy
 *   npx tsx scripts/deploy-firestore-rules.ts --rollback # re-release the previous ruleset
 *
 * The ruleset that was live before each deploy is saved to
 * scripts/.firestore-rules-previous.txt (gitignored by name) for --rollback.
 */
import fs from 'node:fs';
import { loadEnvConfig } from '@next/env';
import { cert, initializeApp } from 'firebase-admin/app';
import { getSecurityRules } from 'firebase-admin/security-rules';

const PREVIOUS = 'scripts/.firestore-rules-previous.txt';

loadEnvConfig(process.cwd(), true, { info() {}, error: console.error });
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? 'null');
if (!sa || sa.project_id !== 'kumami-dev') {
  throw new Error(`Refusing: this script only deploys to kumami-dev (service account: ${sa?.project_id})`);
}
initializeApp({ credential: cert(sa) });
const rules = getSecurityRules();

(async () => {
  if (process.argv.includes('--rollback')) {
    const source = fs.readFileSync(PREVIOUS, 'utf8');
    const rs = await rules.releaseFirestoreRulesetFromSource(source);
    console.log(`Rolled back kumami-dev Firestore rules → ${rs.name}`);
    return;
  }
  const current = await rules.getFirestoreRuleset();
  fs.writeFileSync(PREVIOUS, current.source.map((s) => s.content).join('\n'));
  const source = fs.readFileSync('firestore.rules', 'utf8');
  const rs = await rules.releaseFirestoreRulesetFromSource(source); // compiles first; throws on syntax errors
  console.log(`Deployed firestore.rules to kumami-dev → ${rs.name} (previous saved to ${PREVIOUS})`);
})().catch((e) => { console.error(e?.message ?? e); process.exit(1); });
