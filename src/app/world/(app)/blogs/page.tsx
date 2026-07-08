import type { Metadata } from 'next';
import BlogsGrid from '@/components/BlogsGrid';

export const metadata: Metadata = {
  title: 'Blogs — Kumami World',
  description: 'Latest Kumami blog posts and updates.',
};

export default function WorldBlogsPage() {
  return (
    <div className="w-legacy-embed w-legacy-fullbleed">
      <BlogsGrid />
    </div>
  );
}
