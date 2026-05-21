import { NextRequest, NextResponse } from 'next/server';

const FUNCTIONS_URL =
  process.env.FIREBASE_FUNCTIONS_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'https://api-h4o777ecua-uc.a.run.app'
    : 'https://api-yg5t6jc2da-uc.a.run.app');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await fetch(`${FUNCTIONS_URL}/api/create-crypto-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    console.error('create-crypto-payment proxy error:', err);
    return NextResponse.json({ error: 'Failed to create crypto payment' }, { status: 500 });
  }
}
