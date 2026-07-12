import { NextRequest } from 'next/server';

/**
 * Firebase Auth's popup/redirect flow always hits `${authDomain}/__/auth/...`.
 * Classic Firebase Hosting auto-reserves that path, but Firebase App Hosting
 * (which now serves kumami.world) does not — it routes straight into this
 * Next.js app, which would otherwise 404. This proxies those requests to the
 * real reserved handler on the project's default `*.firebaseapp.com` domain
 * so kumami.world can stay the authDomain (no firebaseapp.com shown in the
 * OAuth popup).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const search = req.nextUrl.search;
  const target = `https://${projectId}.firebaseapp.com/__/auth/${path.join('/')}${search}`;

  const upstream = await fetch(target, { redirect: 'manual' });

  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const location = upstream.headers.get('location');
  if (location) headers.set('location', location);

  return new Response(upstream.body, { status: upstream.status, headers });
}
