// Renders public/og-default.png (1200×630 link-preview image) from scripts/og/og-default.html.
//   node scripts/og/render-og.mjs
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto(pathToFileURL(path.join(here, 'og-default.html')).href, { waitUntil: 'networkidle' });
await p.screenshot({ path: path.join(here, '..', '..', 'public', 'og-default.png') });
await b.close();
console.log('wrote public/og-default.png');
