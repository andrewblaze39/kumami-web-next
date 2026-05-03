import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { bootstrapTrackerBot } from '@/lib/intents/bootstrap_tracker';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const idToken = authHeader.replace('Bearer ', '').trim();

  let userId: string;
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    userId = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await bootstrapTrackerBot(adminDb(), userId);
  return NextResponse.json({ ok: true });
}
