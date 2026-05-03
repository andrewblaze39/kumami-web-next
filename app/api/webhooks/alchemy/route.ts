import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { dispatchAlchemyActivity } from '@/lib/alerts/dispatcher';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-alchemy-signature') ?? '';
  const expected = createHmac('sha256', process.env.ALCHEMY_WEBHOOK_SIGNING_KEY!)
    .update(rawBody)
    .digest('hex');

  if (expected !== signature) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  try {
    await dispatchAlchemyActivity(adminDb(), payload);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Webhook dispatch error:', err);
    return NextResponse.json({ error: 'Dispatch failed' }, { status: 500 });
  }
}
