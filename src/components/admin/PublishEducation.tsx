'use client';

import { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateId } from './utils';
import { PHASES } from '@/data/educationPhases';
import { resolveLevelNumber } from '@/lib/educationUtils';
import EducationArticleRenderer from '@/components/education/EducationArticleRenderer';
import RichTextEditor from './RichTextEditor';
import TipTapEditor from './TipTapEditor';
import type { JSONContent } from '@tiptap/react';
import { tiptapToSections } from '@/lib/tiptapToSections';

interface ContentItem {
  id: string;
  type: 'paragraph' | 'image' | 'youtube' | 'table';
  text?: string;
  src?: string;
  alt?: string;
  caption?: string;
  videoId?: string;
  title?: string;
  headers?: string[];
  rows?: string[][];
}

interface Section {
  id: string;
  title: string;
  content: ContentItem[];
}

export default function PublishEducation() {
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState<number>(1);
  const [chapterIndex, setChapterIndex] = useState<number>(0);
  const [author, setAuthor] = useState('Kumami Team');
  const [blurb, setBlurb] = useState('');
  const [minutes, setMinutes] = useState<number>(0);
  const [featured, setFeatured] = useState(false);
  const [comingSoon, setComingSoon] = useState(false);
  const [description, setDescription] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [sections, setSections] = useState<Section[]>([
    { id: generateId(), title: '', content: [{ id: generateId(), type: 'paragraph', text: '' }] },
  ]);
  const [loading, setLoading] = useState(false);
  const [conflictWarning, setConflictWarning] = useState('');
  const [editorMode, setEditorMode] = useState<'classic' | 'tiptap'>('classic');
  const [tiptapContent, setTiptapContent] = useState<JSONContent | null>(null);

  const levelPhase = PHASES.find(p => p.n === level);
  const chapters = levelPhase?.chapters ?? [];

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match('image.*')) { alert('Please select an image'); return; }
    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setThumbnailPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
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
  const removeSection = (id: string) =>
    setSections(p => p.filter(s => s.id !== id));
  const updateSectionTitle = (id: string, v: string) =>
    setSections(p => p.map(s => s.id === id ? { ...s, title: v } : s));
  const addItem = (sId: string) =>
    setSections(p => p.map(s =>
      s.id === sId
        ? { ...s, content: [...s.content, { id: generateId(), type: 'paragraph', text: '' }] }
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
  const changeItemType = (sId: string, iId: string, type: ContentItem['type']) => {
    if (type === 'paragraph') updateItem(sId, iId, { type: 'paragraph', text: '' });
    else if (type === 'image') updateItem(sId, iId, { type: 'image', src: '', alt: '', caption: '' });
    else if (type === 'youtube') updateItem(sId, iId, { type: 'youtube', videoId: '', title: '', caption: '' });
    else if (type === 'table') updateItem(sId, iId, { type: 'table', headers: ['Column 1', 'Column 2'], rows: [['', '']] });
  };

  const checkDuplicate = async (): Promise<string> => {
    try {
      const snap = await getDocs(collection(db, 'education_articles'));
      const conflict = snap.docs.find(d => {
        const data = d.data();
        return data.status === 'published'
          && resolveLevelNumber(data.level) === level
          && data.chapterIndex === chapterIndex;
      });
      if (conflict) {
        return `Warning: Another published article already occupies Level ${level}, Chapter ${chapterIndex + 1} ("${conflict.data().title}"). Saving anyway.`;
      }
    } catch { /* ignore */ }
    return '';
  };

  const saveArticle = async (status: 'draft' | 'published') => {
    if (!title) { alert('Title required'); return; }
    if (chapterIndex === -1) { alert('Please select a chapter'); return; }

    setLoading(true);
    setConflictWarning('');
    try {
      if (status === 'published') {
        const warning = await checkDuplicate();
        if (warning) setConflictWarning(warning);
      }

      let thumbnailUrl = '';
      if (thumbnailFile) {
        const r = ref(storage, `education-thumbnails/${generateId()}`);
        const snap = await uploadBytes(r, thumbnailFile, { contentType: thumbnailFile.type });
        thumbnailUrl = await getDownloadURL(snap.ref);
      }

      const docData: Record<string, unknown> = {
        title,
        level,
        chapterIndex,
        author,
        thumbnail: thumbnailUrl,
        status,
        blurb,
        minutes,
        featured,
        comingSoon,
        description,
        createdAt: serverTimestamp(),
        editorMode,
      };

      if (editorMode === 'tiptap') {
        docData.tiptapContent = tiptapContent ?? {};
        const derivedSections = tiptapToSections(tiptapContent);
        docData.sections = derivedSections.map(s => ({
          title: s.title,
          content: s.content.map(({ type, text, src, alt, caption, videoId, title: t, headers, rows }) =>
            type === 'paragraph' ? { type, text }
            : type === 'image' ? { type, src, alt, caption }
            : type === 'table' ? { type, headers, rowsJson: JSON.stringify(rows || []) }
            : { type, videoId, title: t, caption }
          ),
        }));
      } else {
        const cleanedSections = sections
          .filter(s => s.title || s.content.length > 0)
          .map(s => ({
            title: s.title,
            content: s.content.map(({ type, text, src, alt, caption, videoId, title: t, headers, rows }) =>
              type === 'paragraph'
                ? { type, text }
                : type === 'image'
                ? { type, src, alt, caption }
                : type === 'table'
                ? { type, headers, rowsJson: JSON.stringify(rows || []) }
                : { type, videoId, title: t, caption }
            ),
          }));
        docData.sections = cleanedSections;
      }

      await addDoc(collection(db, 'education_articles'), docData);

      alert(status === 'draft' ? 'Draft saved!' : 'Published!');
      setTitle('');
      setLevel(1);
      setChapterIndex(0);
      setAuthor('Kumami Team');
      setBlurb('');
      setMinutes(0);
      setFeatured(false);
      setComingSoon(false);
      setDescription('');
      setThumbnailFile(null);
      setThumbnailPreview('');
      setSections([{ id: generateId(), title: '', content: [{ id: generateId(), type: 'paragraph', text: '' }] }]);
      setTiptapContent(null);
      setEditorMode('classic');
      setConflictWarning('');
    } catch (err) {
      console.error(err);
      alert('Error saving');
    } finally {
      setLoading(false);
    }
  };

  // Build preview article object for EducationArticleRenderer
  const previewArticle = {
    title: title || 'Untitled',
    description,
    author,
    level,
    chapterIndex,
    thumbnail: thumbnailPreview,
    sections: editorMode === 'tiptap'
      ? []
      : sections
          .filter(s => s.title || s.content.length > 0)
          .map(s => ({
            title: s.title,
            content: s.content.map(({ type, text, src, alt, caption, videoId, title: t, headers, rows }) => ({
              type,
              text,
              src,
              alt,
              caption,
              videoId,
              title: t,
              headers,
              rows,
            })),
          })),
    blurb,
    minutes,
    editorMode,
    tiptapContent: editorMode === 'tiptap' ? (tiptapContent ?? undefined) : undefined,
  };

  const levelPhaseTitle = levelPhase?.title ?? '';

  return (
    <div className="p-4 bg-white rounded-lg shadow-md max-w-screen-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Publish Education Article</h1>

      {conflictWarning && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-md text-sm">
          {conflictWarning}
        </div>
      )}

      <div className="flex gap-6">
        {/* ── FORM (left) ── */}
        <div className="flex-1 min-w-0">
          <form onSubmit={(e) => { e.preventDefault(); saveArticle('published'); }} className="space-y-4">

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-black"
                required
              />
            </div>

            {/* Level + Chapter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                <select
                  value={level}
                  onChange={e => { setLevel(Number(e.target.value)); setChapterIndex(0); }}
                  className="w-full p-2 border border-gray-300 rounded-md text-black bg-white"
                >
                  {PHASES.map(p => (
                    <option key={p.n} value={p.n}>Level {p.n} — {p.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chapter position (0-based index)</label>
                <input
                  type="number"
                  min={0}
                  value={chapterIndex}
                  onChange={e => setChapterIndex(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md text-black"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Chapter {chapterIndex + 1} in Level {level}. The article title becomes the chapter name.
                </p>
              </div>
            </div>

            {/* Author + Minutes + Featured */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                <input
                  type="text"
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Read time (minutes)</label>
                <input
                  type="number"
                  min={0}
                  value={minutes}
                  onChange={e => setMinutes(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md text-black"
                />
              </div>
              <div className="flex flex-col gap-2 pt-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={featured}
                    onChange={e => setFeatured(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="featured" className="text-sm font-medium text-gray-700">Featured lesson</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="comingSoon"
                    checked={comingSoon}
                    onChange={e => setComingSoon(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="comingSoon" className="text-sm font-medium text-amber-700">Coming soon (placeholder, no content yet)</label>
                </div>
              </div>
            </div>

            {/* Blurb */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blurb (1–2 sentence summary for cards)</label>
              <textarea
                value={blurb}
                onChange={e => setBlurb(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-black"
                rows={2}
                placeholder="Short summary shown on lesson cards..."
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (SEO meta)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-black"
                rows={2}
                placeholder="SEO meta description..."
              />
            </div>

            {/* Thumbnail */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="w-full p-2 border border-gray-300 rounded-md text-black bg-white"
              />
              {thumbnailPreview && (
                <img src={thumbnailPreview} alt="Thumb" className="mt-2 w-32 h-20 object-cover rounded" />
              )}
            </div>

            {/* Editor mode toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Editor mode</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (editorMode !== 'classic' && tiptapContent) {
                      window.alert('Your TipTap content will still be saved, but you will edit using the section builder.');
                    }
                    setEditorMode('classic');
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${editorMode === 'classic' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                >Classic</button>
                <button
                  type="button"
                  onClick={() => {
                    if (editorMode !== 'tiptap' && sections.some(s => s.title || s.content.length > 0)) {
                      window.alert('Your classic sections will still be saved, but you will edit using the TipTap editor.');
                    }
                    setEditorMode('tiptap');
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${editorMode === 'tiptap' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                >TipTap</button>
              </div>
            </div>

            {/* TipTap editor */}
            {editorMode === 'tiptap' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content (TipTap)</label>
                <TipTapEditor content={tiptapContent} onChange={setTiptapContent} />
              </div>
            )}

            {/* Sections (classic mode) */}
            {editorMode === 'classic' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content Sections</label>
              <div className="space-y-4">
                {sections.map((section, si) => (
                  <div key={section.id} className="border-2 border-[#96EDD6]/80 rounded-xl p-4 bg-[#DFF7F0]">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveSection(si, -1)}
                          disabled={si === 0}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs disabled:opacity-30"
                          title="Move up"
                        >↑</button>
                        <button
                          type="button"
                          onClick={() => moveSection(si, 1)}
                          disabled={si === sections.length - 1}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs disabled:opacity-30"
                          title="Move down"
                        >↓</button>
                      </div>
                      <input
                        type="text"
                        value={section.title}
                        onChange={e => updateSectionTitle(section.id, e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-md text-black"
                        placeholder="Section title"
                      />
                      <button
                        type="button"
                        onClick={() => removeSection(section.id)}
                        disabled={sections.length === 1}
                        className="px-3 py-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100 text-sm"
                      >Remove</button>
                    </div>
                    <div className="space-y-3">
                      {section.content.map((item, ii) => (
                        <div key={item.id} className="border border-[#96EDD6]/40 rounded-lg p-3 bg-[#F3FFFC]">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => moveItem(section.id, ii, -1)}
                                disabled={ii === 0}
                                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs disabled:opacity-30"
                                title="Move up"
                              >↑</button>
                              <button
                                type="button"
                                onClick={() => moveItem(section.id, ii, 1)}
                                disabled={ii === section.content.length - 1}
                                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs disabled:opacity-30"
                                title="Move down"
                              >↓</button>
                            </div>
                            <select
                              value={item.type}
                              onChange={e => changeItemType(section.id, item.id, e.target.value as ContentItem['type'])}
                              className="p-2 border border-gray-300 rounded-md text-black bg-white text-sm"
                            >
                              <option value="paragraph">Paragraph</option>
                              <option value="image">Image</option>
                              <option value="youtube">YouTube</option>
                              <option value="table">Table</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => removeItem(section.id, item.id)}
                              className="px-2 py-1 bg-red-50 text-red-700 rounded text-sm"
                            >Remove</button>
                          </div>
                          {item.type === 'paragraph' && (
                            <RichTextEditor
                              value={item.text || ''}
                              onChange={(text) => updateItem(section.id, item.id, { text })}
                              placeholder="Paragraph text..."
                              rows={3}
                            />
                          )}
                          {item.type === 'image' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={item.src || ''}
                                onChange={e => updateItem(section.id, item.id, { src: e.target.value })}
                                className="md:col-span-2 p-2 border border-gray-300 rounded-md text-black"
                                placeholder="Image URL"
                              />
                              <input
                                type="text"
                                value={item.alt || ''}
                                onChange={e => updateItem(section.id, item.id, { alt: e.target.value })}
                                className="p-2 border border-gray-300 rounded-md text-black"
                                placeholder="Alt text"
                              />
                              <input
                                type="text"
                                value={item.caption || ''}
                                onChange={e => updateItem(section.id, item.id, { caption: e.target.value })}
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
                                onChange={e => updateItem(section.id, item.id, { videoId: e.target.value })}
                                className="p-2 border border-gray-300 rounded-md text-black"
                                placeholder="Video ID"
                              />
                              <input
                                type="text"
                                value={item.title || ''}
                                onChange={e => updateItem(section.id, item.id, { title: e.target.value })}
                                className="p-2 border border-gray-300 rounded-md text-black"
                                placeholder="Title"
                              />
                              <input
                                type="text"
                                value={item.caption || ''}
                                onChange={e => updateItem(section.id, item.id, { caption: e.target.value })}
                                className="md:col-span-2 p-2 border border-gray-300 rounded-md text-black"
                                placeholder="Caption"
                              />
                            </div>
                          )}
                          {item.type === 'table' && (
                            <div className="space-y-2">
                              {/* Column count */}
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-600 whitespace-nowrap">Columns:</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={(item.headers || []).length || 2}
                                  onChange={e => {
                                    const n = Math.max(1, Number(e.target.value));
                                    const oldHeaders = item.headers || [];
                                    const newHeaders = Array.from({ length: n }, (_, i) => oldHeaders[i] ?? `Column ${i + 1}`);
                                    const newRows = (item.rows || [['']]).map(row =>
                                      Array.from({ length: n }, (_, i) => row[i] ?? '')
                                    );
                                    updateItem(section.id, item.id, { headers: newHeaders, rows: newRows });
                                  }}
                                  className="w-16 p-1 border border-gray-300 rounded text-black text-sm"
                                />
                              </div>
                              {/* Header row */}
                              <div>
                                <div className="text-xs text-gray-500 mb-1 font-medium">Header row</div>
                                <div className="flex gap-1 flex-wrap">
                                  {(item.headers || []).map((h, hi) => (
                                    <input
                                      key={hi}
                                      type="text"
                                      value={h}
                                      onChange={e => {
                                        const newHeaders = [...(item.headers || [])];
                                        newHeaders[hi] = e.target.value;
                                        updateItem(section.id, item.id, { headers: newHeaders });
                                      }}
                                      className="flex-1 min-w-0 p-1 border border-gray-300 rounded text-black text-sm"
                                      placeholder={`Col ${hi + 1}`}
                                    />
                                  ))}
                                </div>
                              </div>
                              {/* Data rows */}
                              <div>
                                <div className="text-xs text-gray-500 mb-1 font-medium">Data rows</div>
                                <div className="space-y-1">
                                  {(item.rows || []).map((row, ri) => (
                                    <div key={ri} className="flex gap-1 items-center flex-wrap">
                                      {row.map((cell, ci) => (
                                        <input
                                          key={ci}
                                          type="text"
                                          value={cell}
                                          onChange={e => {
                                            const newRows = (item.rows || []).map((r, rIdx) =>
                                              rIdx === ri ? r.map((c, cIdx) => cIdx === ci ? e.target.value : c) : r
                                            );
                                            updateItem(section.id, item.id, { rows: newRows });
                                          }}
                                          className="flex-1 min-w-0 p-1 border border-gray-300 rounded text-black text-sm"
                                          placeholder={`Row ${ri + 1}, Col ${ci + 1}`}
                                        />
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newRows = (item.rows || []).filter((_, rIdx) => rIdx !== ri);
                                          updateItem(section.id, item.id, { rows: newRows.length > 0 ? newRows : [Array((item.headers || []).length).fill('')] });
                                        }}
                                        className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs flex-shrink-0"
                                      >−</button>
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cols = (item.headers || []).length || 2;
                                    const newRows = [...(item.rows || []), Array(cols).fill('')];
                                    updateItem(section.id, item.id, { rows: newRows });
                                  }}
                                  className="mt-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                >+ Add row</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addItem(section.id)}
                        className="px-3 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 text-sm"
                      >Add item</button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSection}
                  className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-black text-sm"
                >Add section</button>
              </div>
            </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => saveArticle('draft')}
                className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300"
              >{loading ? 'Saving...' : 'Save Draft'}</button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >{loading ? 'Publishing...' : 'Publish'}</button>
            </div>
          </form>
        </div>

        {/* ── PREVIEW (right) ── */}
        <div className="hidden xl:block w-[480px] flex-shrink-0">
          <div className="sticky top-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Live Preview</div>
            <div
              className="border border-gray-200 rounded-xl overflow-auto bg-white"
              style={{ maxHeight: '90vh' }}
            >
              <div style={{ fontSize: 12, transform: 'scale(0.85)', transformOrigin: 'top left', width: '118%' }}>
                <div className="p-2 text-gray-500 text-xs border-b">
                  Level {level}: {levelPhaseTitle} › Chapter {chapterIndex + 1}: {chapters[chapterIndex] ?? ''}
                </div>
                <EducationArticleRenderer
                  article={previewArticle}
                  articleId="preview"
                  prevArticleId={null}
                  nextArticleId={null}
                  levelNum={level}
                  chapterName={chapters[chapterIndex] ?? ''}
                  chapterIndex={chapterIndex}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
