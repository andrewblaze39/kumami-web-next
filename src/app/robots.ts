import type { MetadataRoute } from 'next';

/**
 * /robots.txt — crawl the public site; keep crawlers out of the admin panel,
 * internal APIs and the signed-in app shell (every /world page needs a login,
 * so crawling it only yields redirects to the gate).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/world/'] }],
    sitemap: 'https://kumami.world/sitemap.xml',
    host: 'https://kumami.world',
  };
}
