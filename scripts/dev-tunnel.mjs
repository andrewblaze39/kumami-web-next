#!/usr/bin/env node
/**
 * Local dev with a working Kuma AI chat: `npm run dev:kuma [-- --port 3300]`.
 *
 * n8n (on the Hostinger server) answers Kuma chats by POSTing to the
 * `callbackUrl` we send it, built from APP_BASE_URL. On a local dev server that
 * is http://localhost:3000, which n8n can't reach, so replies never arrive.
 * This opens a Cloudflare quick tunnel (random https://….trycloudflare.com URL,
 * new on every start) to the local port and starts `next dev` with
 * APP_BASE_URL set to it. The tunnel is public but unlisted; the callback route
 * only accepts the signed per-user token. Ctrl+C stops both.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const i = process.argv.indexOf('--port');
const PORT = String(i > 0 ? process.argv[i + 1] : process.env.PORT || 3000);

const tunnel = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://localhost:${PORT}`], { windowsHide: true });
let next;

const stop = (code = 0) => {
  next?.kill();
  tunnel.kill();
  process.exit(code);
};
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
tunnel.on('error', (e) => {
  console.error(`[dev:kuma] cloudflared failed to start (${e.message}). Install it: winget install Cloudflare.cloudflared`);
  stop(1);
});
tunnel.on('exit', (code) => {
  console.error(`[dev:kuma] tunnel closed (exit ${code})`);
  stop(1);
});

const timer = setTimeout(() => {
  console.error('[dev:kuma] no tunnel URL after 30 s');
  stop(1);
}, 30_000);

let buf = '';
const onOutput = (d) => {
  if (next) return;
  buf += d.toString();
  const m = buf.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (!m) return;
  clearTimeout(timer);
  console.log(`[dev:kuma] Kuma replies come back via ${m[0]}`);
  console.log(`[dev:kuma] open the site at http://localhost:${PORT}`);
  next = spawn(process.execPath, [path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-p', PORT], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, APP_BASE_URL: m[0] }, // process env wins over .env.local
  });
  next.on('exit', (code) => stop(code ?? 0));
};
tunnel.stdout.on('data', onOutput);
tunnel.stderr.on('data', onOutput);
