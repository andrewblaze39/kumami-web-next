import 'server-only';
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';

/**
 * Send JSON to the n8n chat webhook. The live "Kuma AI Agent" workflow's
 * webhook node accepts GET and reads `body.*` (the old Firebase Function sent a
 * GET with a JSON body via axios). fetch() can't send a body on GET, so this
 * uses node:http(s) directly. Method is configurable (N8N_CHAT_METHOD) for when
 * the workflow is switched to POST.
 */
export function sendToN8n(url: string, method: 'GET' | 'POST', payload: unknown, timeoutMs = 15_000): Promise<{ status: number }> {
  const u = new URL(url);
  const body = Buffer.from(JSON.stringify(payload));
  const req = u.protocol === 'http:' ? httpRequest : httpsRequest;
  return new Promise((resolve, reject) => {
    const r = req(u, { method, headers: { 'Content-Type': 'application/json', 'Content-Length': body.length } }, (res) => {
      res.resume(); // the workflow answers "started" — the reply comes via the callback
      res.on('end', () => resolve({ status: res.statusCode ?? 0 }));
    });
    r.setTimeout(timeoutMs, () => r.destroy(new Error('n8n timeout')));
    r.on('error', reject);
    r.end(body);
  });
}
