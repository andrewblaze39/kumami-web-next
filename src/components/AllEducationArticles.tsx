'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Clock, ArrowLeft, Search } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  level: string;
  thumbnail: string;
  blurb: string;
  minutes: number;
}

const LEVELS = ['All', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];

const LEVEL_COLORS: Record<string, string> = {
  'Level 1': '#86EFAC',
  'Level 2': '#5EEAD4',
  'Level 3': '#96EDD6',
  'Level 4': '#A78BFA',
  'Level 5': '#F472B6',
};

export default function AllEducationArticles() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');

  useEffect(() => {
    getDocs(collection(db, 'education_articles')).then(snap => {
      const docs = snap.docs
        .map(d => {
          const data = d.data() as Record<string, unknown>;
          if (data.status && data.status !== 'published') return null;
          return {
            id: d.id,
            title: (data.title as string) || 'Untitled',
            level: (data.level as string) || 'Level 1',
            thumbnail: (data.thumbnail as string) || '',
            blurb: (data.blurb as string) || (data.description as string) || '',
            minutes: (data.minutes as number) || (data.readTime as number) || 0,
          } as Article;
        })
        .filter((d): d is Article => d !== null);
      setArticles(docs);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = articles.filter(a => {
    const matchLevel = levelFilter === 'All' || a.level === levelFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || a.title.toLowerCase().includes(q) || a.blurb.toLowerCase().includes(q) || a.level.toLowerCase().includes(q);
    return matchLevel && matchSearch;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', padding: '32px 16px 64px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Back */}
        <button
          onClick={() => router.push('/education')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 14, cursor: 'pointer', marginBottom: 28, padding: 0 }}
        >
          <ArrowLeft size={15} /> Back to Education
        </button>

        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 6 }}>All Lessons</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, marginBottom: 28 }}>
          {loading ? 'Loading…' : `${articles.length} lessons available`}
        </p>

        {/* Search + filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 32 }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="text"
              placeholder="Search lessons…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px 10px 34px', borderRadius: 12,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {LEVELS.map(l => (
              <button
                key={l}
                onClick={() => setLevelFilter(l)}
                style={{
                  padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  border: levelFilter === l ? `1.5px solid ${LEVEL_COLORS[l] ?? '#96EDD6'}` : '1.5px solid rgba(255,255,255,0.1)',
                  background: levelFilter === l ? 'rgba(150,237,214,0.1)' : 'transparent',
                  color: levelFilter === l ? (LEVEL_COLORS[l] ?? '#96EDD6') : 'rgba(255,255,255,0.45)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
            <div style={{ width: 36, height: 36, border: '2px solid #96EDD6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', paddingTop: 60 }}>No lessons found.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {filtered.map(article => {
              const color = LEVEL_COLORS[article.level] ?? '#96EDD6';
              return (
                <button
                  key={article.id}
                  onClick={() => router.push(`/education-article?id=${article.id}`)}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
                    textAlign: 'left', padding: 0, transition: 'border-color 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}55`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'none'; }}
                >
                  {/* Thumbnail */}
                  <div style={{ width: '100%', aspectRatio: '3/2', background: article.thumbnail ? `url(${article.thumbnail}) center/cover` : 'rgba(150,237,214,0.06)', position: 'relative' }}>
                    {!article.thumbnail && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, opacity: 0.2 }}>📚</div>
                    )}
                  </div>

                  <div style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {article.level}
                    </span>
                    <h3 style={{ margin: '6px 0 8px', fontSize: 15, fontWeight: 700, lineHeight: 1.35, color: '#fff' }}>
                      {article.title}
                    </h3>
                    {article.blurb && (
                      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {article.blurb}
                      </p>
                    )}
                    {article.minutes > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                        <Clock size={11} /> {article.minutes} min
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
