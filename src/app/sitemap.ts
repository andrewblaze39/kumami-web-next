import type { MetadataRoute } from 'next';

/**
 * /sitemap.xml — every page Google can actually read without an account.
 * Today that is only the landing page: the app shell (/world/*) needs a login,
 * and /research/:id and /blogs/:id redirect into it. When pages are made public
 * (Andrew's decision — see the roadmap), add them to PUBLIC_ROUTES, or add
 * per-article entries from Firestore here.
 */
const PUBLIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_ROUTES.map((r) => ({
    url: `https://kumami.world${r.path === '/' ? '' : r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
