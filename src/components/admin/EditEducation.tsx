'use client';

import { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { formatTimestamp, generateId } from './utils';
import { PHASES } from '@/data/educationPhases';
import { resolveLevelNumber } from '@/lib/educationUtils';
import EducationArticleRenderer from '@/components/education/EducationArticleRenderer';

interface ContentItem {
  id?: string;
  type: 'paragraph' | 'image' | 'youtube';
  text?: string;
  src?: string;
  alt?: string;
  caption?: string;
  videoId?: string;
  title?: string;
}

interface Section {
  id: string;
  title: string;
  content: ContentItem[];
}

interface Article {
  id: string;
  title: string;
  level: number | string;
  chapterIndex: number;
  author: string;
  thumbnail: string;
  sections: Section[];
  status?: string;
  blurb?: string;
  minutes?: number;
  featured?: boolean;
  description?: string;
  createdAt: { seconds: number } | null;
  [key: string]: unknown;
}

interface FormData {
  title: string;
  level: number;
  chapterIndex: number;
  author: string;
  thumbnail: string;
  blurb: string;
  minutes: number;
  featured: boolean;
  description: string;
  createdAt: { seconds: number } | null;
}

export default function EditEducation() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    level: 1,
    chapterIndex: 0,
    author: '',
    thumbnail: '',
    blurb: '',
    minutes: 0,
    featured: false,
    description: '',
    createdAt: null,
  });
  const [sections, setSections] = useState<Section[]>([]);
  const [conflictWarning, setConflictWarning] = useState('');
  const auth = getAuth();

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        if (!auth.currentUser) { setError('Please sign in'); setLoading(false); return; }
        const snap = await getDocs(collection(db, 'education_articles'));
        setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Article)));
        setLoading(false);
      } catch { setError('Failed to load'); setLoading(false); }
    };
    fetchArticles();
  }, [auth.currentUser]);

  const handleEdit = (a: Article) => {
    const resolvedLevel = resolveLevelNumber(a.level) ?? 1;
    setEditingId(a.id);
    setConflictWarning('');
    setFormData({
      title: a.title || '',
      level: resolvedLevel,
      chapterIndex: a.chapterIndex ?? 0,
      author: a.author || '',
      thumbnail: a.thumbnail || '',
      blurb: (a.blurb as string) || '',
      minutes: (a.minutes as number) || 0,
      featured: (a.featured as boolean) || false,
      description: (a.description as string) || '',
      createdAt: a.createdAt,
    });
    setSections(
      Array.isArray(a.sections)
        ? a.sections.map(s => ({
            id: generateId(),
            title: s.title || '',
            content: Array.isArray(s.content)
              ? s.content.map(i => ({ id: generateId(), ...i }))
              : [],
          }))
        : []
    );
  };

  const refresh = async () => {
    const snap = await getDocs(collection(db, 'education_articles'));
    setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Article)));
  };

  const checkDuplicate = async (excludeId: string): Promise<string> => {
    try {
      const snap = await getDocs(collection(db, 'education_articles'));
      const conflict = snap.docs.find(d => {
        const data = d.data();
        return d.id !== excludeId
          && data.status === 'published'
          && resolveLevelNumber(data.level) === formData.level
          && data.chapterIndex === formData.chapterIndex;
      });
      if (conflict) {
        return `Warning: Another published article already occupies Level ${formData.level}, Chapter ${formData.chapterIndex + 1} ("${conflict.data().title}"). Saving anyway.`;
      }
    } catch { /* ignore */ }
    return '';
  };

  const handleUpdate = async (id: string) => {
    setConflictWarning('');
    const warning = await checkDuplicate(id);
    if (warning) setConflictWarning(warning);

    try {
      const cleanedSections = sections
        .filter(s => s.title || s.content.length > 0)
        .map(s => ({
          title: s.title,
          content: s.content.map(({ type, text, src, alt, caption, videoId, title: t }) =>
            type === 'paragraph'
              ? { type, text: text || '' }
              : type === 'image'
              ? { type, src: src || '', alt: alt || '', caption: caption || '' }
              : { type, videoId: videoId || '', title: t || '', caption: caption || '' }
          ),
        }));

      await updateDoc(doc(db, 'education_articles', id), {
        title: formData.title,
        level: formData.level,
        chapterIndex: formData.chapterIndex,
        author: formData.author,
        thumbnail: formData.thumbnail,
        sections: cleanedSections,
        blurb: formData.blurb,
        minutes: formData.minutes,
        featured: formData.featured,
        description: formData.description,
      });
      setEditingId(null);
      await refresh();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete?')) return;
    try { await deleteDoc(doc(db, 'education_articles', id)); await refresh(); }
    catch (err) { console.error(err); }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const r = ref(storage, `education-thumbnails/${Date.now()}_${file.name}`);
      const snap = await uploadBytes(r, file, { contentType: file.type });
      const url = await getDownloadURL(snap.ref);
      setFormData(p => ({ ...p, thumbnail: url }));
    } catch (err) { console.error(err); }
  };

  // Section / item ordering helpers
  const moveSection = (idx: number, dir: -1 | 1) => {
    setSections(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const moveItem = (sId: string, iIdx: number, dir: -1 | 1) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sId) return s;
      const next = [...s.content];
      const target = iIdx + dir;
      if (target < 0 || target >= next.length) return s;
      [next[iIdx], next[target]] = [next[target], next[iIdx]];
      return { ...s, content: next };
    }));
  };

  const addSection = () =>
    setSections(p => [...p, { id: generateId(), title: '', content: [] }]);
  const addItem = (sId: string) =>
    setSections(p => p.map(s =>
      s.id === sId
        ? { ...s, content: [...s.content, { id: generateId(), type: 'paragraph' as const, text: '' }] }
        : s
    ));
  const removeItem = (sId: string, iId: string) =>
    setSections(p => p.map(s =>
      s.id === sId ? { ...s, content: s.content.filter(i => i.id !== iId) } : s
    ));
  const updateItem = (sId: string, iId: string, patch: Partial<ContentItem>) =>
    setSections(p => p.map(s =>
      s.id === sId
        ? { ...s, content: s.content.map(i => i.id === iId ? { ...i, ...patch } : i) }
        : s
    ));

  const editingLevelPhase = PHASES.find(p => p.n === formData.level);
  const editingChapters = editingLevelPhase?.chapters ?? [];

  const previewArticle = {
    title: formData.title || 'Untitled',
    description: formData.description,
    author: formData.author,
    level: formData.level,
    chapterIndex: formData.chapterIndex,
    thumbnail: formData.thumbnail,
    sections: sections
      .filter(s => s.title || s.content.length > 0)
      .map(s => ({
        title: s.title,
        content: s.content.map(({ type, text, src, alt, caption, videoId, title: t }) => ({
          type, text, src, alt, caption, videoId, title: t,
        })),
      })),
    blurb: formData.blurb,
    minutes: formData.minutes,
  };

  if (loading) return <div className="p-6 text-gray-600">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Education Articles</h2>
      <div className="space-y-4">
        {articles.map(article => (
          <div key={article.id} className="bg-white border border-gray-200 rounded-lg p-4">
            {editingId === article.id ? (
              <div className="flex gap-6">
                {/* Form */}
                <div className="flex-1 min-w-0 space-y-3">
                  {conflictWarning && (
                    <div className="p-3 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-md text-sm">
                      {conflictWarning}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md text-black"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Level</label>
                      <select
                        value={formData.level}
                        onChange={e => setFormData(p => ({ ...p, level: Number(e.target.value), chapterIndex: 0 }))}
                        className="w-full p-2 border border-gray-300 rounded-md text-black bg-white"
                      >
                        {PHASES.map(p => (
                          <option key={p.n} value={p.n}>Level {p.n} — {p.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Chapter</label>
                      <select
                        value={formData.chapterIndex}
                        onChange={e => setFormData(p => ({ ...p, chapterIndex: Number(e.target.value) }))}
                        className="w-full p-2 border border-gray-300 rounded-md text-black bg-white"
                      >
                        {editingChapters.map((ch, i) => (
                          <option key={i} value={i}>Chapter {i + 1}: {ch}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Author</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={e => setFormData(p => ({ ...p, author: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md text-black"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Read time (minutes)</label>
                      <input
                        type="number"
                        min={0}
                        value={formData.minutes}
                        onChange={e => setFormData(p => ({ ...p, minutes: Number(e.target.value) }))}
                        className="w-full p-2 border border-gray-300 rounded-md text-black"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id={`featured-${article.id}`}
                        checked={formData.featured}
                        onChange={e => setFormData(p => ({ ...p, featured: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      <label htmlFor={`featured-${article.id}`} className="text-sm font-medium text-gray-700">Featured lesson</label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Blurb</label>
                    <textarea
                      value={formData.blurb}
                      onChange={e => setFormData(p => ({ ...p, blurb: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md text-black"
                      rows={2}
                      placeholder="Short summary for cards..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description (SEO)</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md text-black"
                      rows={2}
                      placeholder="SEO meta description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Upload Thumbnail</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="w-full p-2 border border-gray-300 rounded-md text-black bg-white"
                    />
                    {formData.thumbnail && (
                      <img src={formData.thumbnail} alt="Thumb" className="mt-2 max-h-20 rounded" />
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Sections</label>
                    {sections.map((section, si) => (
                      <div key={section.id} className="border-2 border-[#96EDD6]/80 rounded-xl p-3 bg-[#DFF7F0]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => moveSection(si, -1)}
                              disabled={si === 0}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs disabled:opacity-30"
                            >↑</button>
                            <button
                              type="button"
                              onClick={() => moveSection(si, 1)}
                              disabled={si === sections.length - 1}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs disabled:opacity-30"
                            >↓</button>
                          </div>
                          <input
                            type="text"
                            value={section.title}
                            onChange={e => setSections(p => p.map(s => s.id === section.id ? { ...s, title: e.target.value } : s))}
                            className="flex-1 p-2 border border-gray-300 rounded-md text-black"
                            placeholder="Section title"
                          />
                          <button
                            type="button"
                            onClick={() => setSections(p => p.filter(s => s.id !== section.id))}
                            className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs"
                          >Remove</button>
                        </div>
                        {section.content.map((item, ii) => (
                          <div key={item.id} className="border border-[#96EDD6]/40 rounded-lg p-2 bg-[#F3FFFC] mb-2">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveItem(section.id, ii, -1)}
                                  disabled={ii === 0}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs disabled:opacity-30"
                                >↑</button>
                                <button
                                  type="button"
                                  onClick={() => moveItem(section.id, ii, 1)}
                                  disabled={ii === section.content.length - 1}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs disabled:opacity-30"
                                >↓</button>
                              </div>
                              <select
                                value={item.type}
                                onChange={e => updateItem(section.id, item.id!, {
                                  type: e.target.value as ContentItem['type'],
                                  text: '', src: '', alt: '', caption: '', videoId: '', title: '',
                                })}
                                className="p-1 border rounded text-black text-sm bg-white"
                              >
                                <option value="paragraph">Paragraph</option>
                                <option value="image">Image</option>
                                <option value="youtube">YouTube</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => removeItem(section.id, item.id!)}
                                className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs"
                              >Remove</button>
                            </div>
                            {item.type === 'paragraph' && (
                              <textarea
                                value={item.text || ''}
                                onChange={e => updateItem(section.id, item.id!, { text: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-md text-black"
                                rows={3}
                              />
                            )}
                            {item.type === 'image' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={item.src || ''}
                                  onChange={e => updateItem(section.id, item.id!, { src: e.target.value })}
                                  className="md:col-span-2 p-2 border border-gray-300 rounded-md text-black"
                                  placeholder="Image URL"
                                />
                                <input
                                  type="text"
                                  value={item.alt || ''}
                                  onChange={e => updateItem(section.id, item.id!, { alt: e.target.value })}
                                  className="p-2 border border-gray-300 rounded-md text-black"
                                  placeholder="Alt text"
                                />
                                <input
                                  type="text"
                                  value={item.caption || ''}
                                  onChange={e => updateItem(section.id, item.id!, { caption: e.target.value })}
                                  className="p-2 border border-gray-300 rounded-md text-black"
                                  placeholder="Caption"
                                />
                              </div>
                            )}
                            {item.type === 'youtube' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={item.videoId || ''}
                                  onChange={e => updateItem(section.id, item.id!, { videoId: e.target.value })}
                                  className="p-2 border border-gray-300 rounded-md text-black"
                                  placeholder="Video ID"
                                />
                                <input
                                  type="text"
                                  value={item.title || ''}
                                  onChange={e => updateItem(section.id, item.id!, { title: e.target.value })}
                                  className="p-2 border border-gray-300 rounded-md text-black"
                                  placeholder="Title"
                                />
                                <input
                                  type="text"
                                  value={item.caption || ''}
                                  onChange={e => updateItem(section.id, item.id!, { caption: e.target.value })}
                                  className="md:col-span-2 p-2 border border-gray-300 rounded-md text-black"
                                  placeholder="Caption"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addItem(section.id)}
                          className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm"
                        >Add item</button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addSection}
                      className="px-3 py-2 bg-gray-900 text-white rounded-md text-sm"
                    >Add section</button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created At</label>
                    <input
                      type="text"
                      value={formatTimestamp(formData.createdAt as Parameters<typeof formatTimestamp>[0])}
                      disabled
                      className="w-full p-2 border border-gray-300 rounded-md text-gray-500 bg-gray-50"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(article.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md text-sm"
                    >Delete</button>
                    <button
                      onClick={() => handleUpdate(article.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm"
                    >Save</button>
                    <button
                      onClick={() => { setEditingId(null); setConflictWarning(''); }}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm"
                    >Cancel</button>
                  </div>
                </div>

                {/* Live preview */}
                <div className="hidden xl:block w-[420px] flex-shrink-0">
                  <div className="sticky top-4">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Live Preview</div>
                    <div
                      className="border border-gray-200 rounded-xl overflow-auto bg-white"
                      style={{ maxHeight: '80vh' }}
                    >
                      <div style={{ fontSize: 12, transform: 'scale(0.85)', transformOrigin: 'top left', width: '118%' }}>
                        <EducationArticleRenderer
                          article={previewArticle}
                          articleId="preview"
                          prevArticleId={null}
                          nextArticleId={null}
                          levelNum={formData.level}
                          chapterName={editingChapters[formData.chapterIndex] ?? ''}
                          chapterIndex={formData.chapterIndex}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {article.thumbnail && (
                    <img src={article.thumbnail} alt={article.title} className="w-16 h-16 object-cover rounded" />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{article.title}</h3>
                    <p className="text-sm text-gray-500">
                      {article.author} · Level {resolveLevelNumber(article.level) ?? article.level} · Ch. {(article.chapterIndex ?? 0) + 1}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatTimestamp(article.createdAt as Parameters<typeof formatTimestamp>[0])}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(article)} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm">Edit</button>
                  <button onClick={() => handleDelete(article.id)} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
