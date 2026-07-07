/**
 * scripts/seed-courses.ts — Seed the `courses` Firestore collection.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * USAGE (DO NOT RUN unless you intend to write to the shared Firebase project):
 *
 *   # Default (skips docs that already exist in Firestore):
 *   npx tsx scripts/seed-courses.ts
 *
 *   # Dry run (logs what would be written, no Firestore writes):
 *   npx tsx scripts/seed-courses.ts --dry-run
 *
 *   # Force overwrite all phases (even existing docs):
 *   npx tsx scripts/seed-courses.ts --force
 *
 *   # Point to a different service account key file:
 *   npx tsx scripts/seed-courses.ts --keyfile /path/to/serviceAccount.json
 *
 * PREREQUISITES:
 *   - .env.local must contain FIREBASE_SERVICE_ACCOUNT_JSON (JSON string of the
 *     service account), OR set GOOGLE_APPLICATION_CREDENTIALS to a key file path,
 *     OR pass --keyfile <path>.
 *   - Run from the project root.
 *
 * WHAT IT WRITES:
 *   Collection: courses/{phaseId}  (e.g. courses/phase-1 … courses/phase-5)
 *   Each document:
 *     phase:    number
 *     title:    string
 *     tagline:  string
 *     level:    string
 *     chapters: Array<{ id, title, parts: [{ id, title, type: 'text' }] }>
 *     instructor: undefined (not set — add manually in Firestore console)
 *     faq:      []          (empty — add manually in Firestore console)
 *
 *   Chapters = one per lesson (lesson title = chapter title).
 *   Each chapter has a single text part (placeholder — real content added later).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';
import { JOURNEY_PHASES } from '../src/lib/education/journeyData';

// ── Load .env.local ─────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), '.env.local');
config({ path: envPath });

// ── CLI flags ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const keyfileIdx = args.indexOf('--keyfile');
const KEYFILE: string | null = keyfileIdx !== -1 ? args[keyfileIdx + 1] : null;

// ── Firebase Admin init ──────────────────────────────────────────────────────
function initFirebase() {
  if (admin.apps.length > 0) return;

  if (KEYFILE) {
    const serviceAccount = JSON.parse(fs.readFileSync(KEYFILE, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('Initialized Firebase with --keyfile');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('Initialized Firebase with FIREBASE_SERVICE_ACCOUNT_JSON from .env.local');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    console.log('Initialized Firebase with GOOGLE_APPLICATION_CREDENTIALS');
  } else {
    throw new Error(
      'No Firebase credentials found.\n' +
        '  Set FIREBASE_SERVICE_ACCOUNT_JSON in .env.local, or\n' +
        '  set GOOGLE_APPLICATION_CREDENTIALS, or\n' +
        '  pass --keyfile /path/to/serviceAccount.json'
    );
  }
}

// ── Build course doc from phase ──────────────────────────────────────────────
function buildCourseDoc(phase: typeof JOURNEY_PHASES[number]) {
  return {
    phase: phase.phase,
    title: phase.title,
    tagline: phase.tagline,
    level: phase.level,
    chapters: phase.lessons.map((lesson, i) => ({
      id: `ch-${i + 1}`,
      title: lesson.title,
      parts: [
        {
          id: lesson.id,
          title: lesson.title,
          type: 'text',
          // videoUrl: not set — add manually once video content is ready
        },
      ],
    })),
    // instructor: not seeded — add manually via Firestore console
    faq: [],
    // Seed metadata
    _seededAt: new Date().toISOString(),
    _source: 'seed-courses.ts',
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n── Kumami World Course Seeder ──────────────────────────────');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE WRITE'}`);
  if (FORCE) console.log('Flag: --force (overwrite existing)');
  else console.log('Default: skipping existing docs (pass --force to overwrite)');
  console.log('');

  if (!DRY_RUN) initFirebase();

  const db = DRY_RUN ? null : admin.firestore();

  let written = 0;
  let skipped = 0;

  for (const phase of JOURNEY_PHASES) {
    const docData = buildCourseDoc(phase);
    const docPath = `courses/${phase.courseId}`;

    if (DRY_RUN) {
      console.log(`[DRY RUN] Would write ${docPath}:`);
      console.log(`  title: "${docData.title}"`);
      console.log(`  chapters: ${docData.chapters.length} (one per lesson)`);
      written++;
      continue;
    }

    const ref = db!.collection('courses').doc(phase.courseId);

    if (!FORCE) {
      const snap = await ref.get();
      if (snap.exists) {
        console.log(`SKIP  ${docPath} (already exists; use --force to overwrite)`);
        skipped++;
        continue;
      }
    }

    await ref.set(docData, { merge: false });
    console.log(`WRITE ${docPath}  (${docData.chapters.length} chapters)`);
    written++;
  }

  console.log('');
  console.log(`── Done ────────────────────────────────────────────────────`);
  console.log(`  Written : ${written}`);
  console.log(`  Skipped : ${skipped}`);
  if (DRY_RUN) {
    console.log('\n  This was a dry run. To write for real, omit --dry-run.');
  }
  console.log('');
}

main().catch(err => {
  console.error('\nSeeder error:', err.message);
  process.exit(1);
});
