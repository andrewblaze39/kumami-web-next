/**
 * Removes the smart-money-alerts chatroom (and all its messages) from every user.
 *
 * Usage:
 *   SERVICE_ACCOUNT_PATH=./serviceAccountKey.json node scripts/remove-smart-money-alerts.mjs
 *
 * Or if you have GOOGLE_APPLICATION_CREDENTIALS set in your environment:
 *   node scripts/remove-smart-money-alerts.mjs
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const ROOM_ID = 'smart-money-alerts';
const BATCH_SIZE = 400; // Firestore batch limit is 500

// ── Init ──────────────────────────────────────────────────────────────────────
const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH;

if (!getApps().length) {
  if (serviceAccountPath) {
    const serviceAccount = require(
      serviceAccountPath.startsWith('.')
        ? new URL(serviceAccountPath, import.meta.url).pathname
        : serviceAccountPath
    );
    initializeApp({ credential: cert(serviceAccount) });
  } else {
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS env var
    initializeApp();
  }
}

const db = getFirestore();

// ── Helpers ───────────────────────────────────────────────────────────────────
async function deleteCollection(colRef) {
  let deleted = 0;
  let snapshot = await colRef.limit(BATCH_SIZE).get();

  while (!snapshot.empty) {
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snapshot.size;
    snapshot = await colRef.limit(BATCH_SIZE).get();
  }

  return deleted;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Scanning users collection for chatroom: ${ROOM_ID} ...`);

  let usersProcessed = 0;
  let roomsDeleted = 0;
  let lastDoc = null;

  while (true) {
    let q = db.collection('users').limit(100);
    if (lastDoc) q = q.startAfter(lastDoc);

    const userSnap = await q.get();
    if (userSnap.empty) break;

    for (const userDoc of userSnap.docs) {
      const roomRef = db
        .collection('users')
        .doc(userDoc.id)
        .collection('chatrooms')
        .doc(ROOM_ID);

      const roomSnap = await roomRef.get();
      if (!roomSnap.exists) continue;

      // Delete all messages in the room first
      const messagesCol = roomRef.collection('messages');
      const msgCount = await deleteCollection(messagesCol);

      // Delete the room document itself
      await roomRef.delete();

      roomsDeleted++;
      console.log(
        `  [${roomsDeleted}] Deleted room for user ${userDoc.id} (${msgCount} messages)`
      );
    }

    usersProcessed += userSnap.size;
    lastDoc = userSnap.docs[userSnap.docs.length - 1];

    if (userSnap.size < 100) break;
  }

  console.log(`\nDone. Scanned ${usersProcessed} users, deleted ${roomsDeleted} rooms.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
