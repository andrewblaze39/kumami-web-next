'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface BlogPost {
  id: string;
  title?: string;
  summary?: string;
  content?: string;
  thumbnailImageUrl?: string;
  imageUrl?: string;
  status?: string;
  timestamp?: { seconds: number; toDate?: () => Date };
}

const BlogUpdatesSection = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestBlogs = async () => {
      try {
        const newsQuery = query(
          collection(db, 'blogs'),
          orderBy('timestamp', 'desc'),
          limit(6)
        );

        const snapshot = await getDocs(newsQuery);
        const all = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as BlogPost[];

        const published = all
          .filter((article) => article.status === 'published')
          .sort((a, b) => {
            const aTime = a.timestamp?.seconds || 0;
            const bTime = b.timestamp?.seconds || 0;
            return bTime - aTime;
          })
          .slice(0, 3);

        setPosts(published);
      } catch (err) {
        console.error('Error loading latest blog posts', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestBlogs();
  }, []);

  if (loading) return null;
  if (!posts.length) return null;

  return (
    <section className="py-12 md:py-16" style={{ background: '#000' }}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2
            style={{
              color: '#40e0d0',
              fontWeight: 'bold',
              fontSize: '2.5rem',
              marginBottom: '0.5rem',
            }}
          >
            Our Journey
          </h2>
          <p className="text-sm md:text-base text-gray-300">
            Stories, milestones, and insights from the Kumami World team.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blogs/${post.id}`}
              className="rounded-3xl overflow-hidden bg-[#101010] border border-white/10 shadow-lg hover:shadow-2xl transition transform hover:-translate-y-1 no-underline"
            >
              <div className="relative pb-[60%] overflow-hidden">
                <img
                  src={post.thumbnailImageUrl || post.imageUrl || '/trendingnews.png'}
                  alt={post.title || 'Blog post'}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).onerror = null;
                    (e.target as HTMLImageElement).src = '/trendingnews.png';
                  }}
                />
              </div>

              <div className="p-6 flex flex-col h-full">
                <h3 className="text-lg md:text-xl font-semibold text-white mb-2 line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-sm text-gray-300 mb-4 line-clamp-3">
                  {post.summary ||
                    (post.content
                      ? `${post.content.substring(0, 140)}...`
                      : 'Latest update from our project.')}
                </p>

                <div className="mt-auto flex items-center justify-between text-xs text-gray-400">
                  <span>
                    {post.timestamp?.toDate
                      ? post.timestamp.toDate().toLocaleDateString()
                      : ''}
                  </span>
                  <span className="text-[#96EDD6] font-semibold">
                    Read more
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/blogs"
            className="inline-flex items-center px-6 py-2 rounded-full border border-[#96EDD6] text-[#96EDD6] text-sm font-medium hover:bg-[#96EDD6] hover:text-black transition-colors no-underline"
          >
            See more
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BlogUpdatesSection;
