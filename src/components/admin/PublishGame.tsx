'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateId } from './utils';

const DEFAULT_GENRES = ['Action','Adventure','Arcade','RPG','MMORPG','Strategy','Puzzle','Simulation','Sports','Racing','Fighting','Shooter','MOBA','Battle Royale','Card Game','Other'];
const DEFAULT_NETWORKS = ['Ethereum','Solana','BSC','SUI','SEI','Starknet','Polygon','Avalanche','Immutable X','Arbitrum','Optimism','Base','None'];
const DEFAULT_PLATFORMS = ['PC','Website','Mobile App'];
const DEFAULT_CATEGORIES = ['Featured','Free to Play','Most Popular','Coming Soon'];

export default function PublishGame() {
  const { currentUser, userData } = useAuth();
  const isSuperOrGamesAdmin = ['superadmin', 'gamesadmin'].includes(userData?.role || '');
  const [title, setTitle] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [networks, setNetworks] = useState<string[]>([]);
  const [platformTypes, setPlatformTypes] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [discordLink, setDiscordLink] = useState('');
  const [twitterLink, setTwitterLink] = useState('');
  const [websiteLink, setWebsiteLink] = useState('');
  const [telegramLink, setTelegramLink] = useState('');
  const [appStoreLink, setAppStoreLink] = useState('');
  const [playStoreLink, setPlayStoreLink] = useState('');
  const [playNowButtonLink, setPlayNowButtonLink] = useState('');
  const [tagline, setTagline] = useState('');
  const [summary, setSummary] = useState('');
  const [detailContent1, setDetailContent1] = useState('');
  const [detailContent2, setDetailContent2] = useState('');
  const [imageDetail1, setImageDetail1] = useState<File | null>(null);
  const [imageDetail2, setImageDetail2] = useState<File | null>(null);
  const [portraitImage, setPortraitImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [genreOptions, setGenreOptions] = useState(DEFAULT_GENRES);
  const [networkOptions, setNetworkOptions] = useState(DEFAULT_NETWORKS);
  const [platformOptions, setPlatformOptions] = useState(DEFAULT_PLATFORMS);
  const [categoryOptions, setCategoryOptions] = useState(DEFAULT_CATEGORIES);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const snap = await getDocs(collection(db, 'gameDropdownOptions'));
        const g: string[] = [], n: string[] = [], p: string[] = [], c: string[] = [];
        snap.forEach((d) => { const data = d.data(); if (!data?.type || !data?.value) return; if (data.type === 'genre') g.push(data.value); if (data.type === 'network') n.push(data.value); if (data.type === 'platform') p.push(data.value); if (data.type === 'category') c.push(data.value); });
        if (g.length) setGenreOptions(Array.from(new Set([...DEFAULT_GENRES, ...g])).sort());
        if (n.length) setNetworkOptions(Array.from(new Set([...DEFAULT_NETWORKS, ...n])).sort());
        if (p.length) setPlatformOptions(Array.from(new Set([...DEFAULT_PLATFORMS, ...p])).sort());
        if (c.length) setCategoryOptions(Array.from(new Set([...DEFAULT_CATEGORIES, ...c])).sort());
      } catch (err) { console.error(err); }
    };
    fetchOptions();
  }, []);

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) => setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);

  const uploadImage = async (file: File, type: string) => {
    const ext = file.name.split('.').pop();
    const r = ref(storage, `game-images/${type}/${generateId()}.${ext}`);
    const snap = await uploadBytes(r, file, { contentType: file.type });
    return await getDownloadURL(snap.ref);
  };

  const saveGame = async (status: 'draft' | 'published') => {
    if (!currentUser) { setMessage('Please sign in'); return; }
    if (status === 'published' && !isSuperOrGamesAdmin) { setMessage('No permission'); return; }
    setLoading(true); setMessage('');
    try {
      let img1 = '', img2 = '', portrait = '';
      if (imageDetail1) img1 = await uploadImage(imageDetail1, 'imageDetail1Url');
      if (imageDetail2) img2 = await uploadImage(imageDetail2, 'imageDetail2Url');
      if (portraitImage) portrait = await uploadImage(portraitImage, 'portraitImageUrl');
      await addDoc(collection(db, 'games'), { title: title || 'Untitled', genres, networks, platformTypes, genre: genres[0] || null, network: networks[0] || null, platformType: platformTypes[0] || null, discordLink: discordLink || null, twitterLink: twitterLink || null, websiteLink: websiteLink || null, telegramLink: telegramLink || null, appStoreLink: appStoreLink || null, playStoreLink: playStoreLink || null, playNowButtonLink: playNowButtonLink || null, imageDetail1Url: img1 || null, imageDetail2Url: img2 || null, portraitImageUrl: portrait || null, detailContent1: detailContent1 || null, detailContent2: detailContent2 || null, tagline, summary, categories, popularityScore: 0, timestamp: serverTimestamp(), createdAt: serverTimestamp(), createdBy: currentUser.uid, status });
      setMessage(status === 'published' ? 'Game published!' : 'Draft saved!');
      setTitle(''); setGenres([]); setNetworks([]); setPlatformTypes([]); setCategories([]); setDiscordLink(''); setTwitterLink(''); setWebsiteLink(''); setTelegramLink(''); setAppStoreLink(''); setPlayStoreLink(''); setPlayNowButtonLink(''); setTagline(''); setSummary(''); setDetailContent1(''); setDetailContent2(''); setImageDetail1(null); setImageDetail2(null); setPortraitImage(null);
    } catch (err: unknown) { setMessage('Error: ' + (err instanceof Error ? err.message : 'Unknown')); }
    finally { setLoading(false); }
  };

  const CheckboxGrid = ({ options, selected, onToggle, label }: { options: string[]; selected: string[]; onToggle: (v: string) => void; label: string }) => (
    <div className="col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2 border border-gray-300 rounded-md bg-white">
        {options.map((opt) => (<div key={opt} className="flex items-center"><input type="checkbox" className="h-4 w-4 text-blue-600 rounded" checked={selected.includes(opt)} onChange={() => onToggle(opt)} /><label className="ml-2 text-sm text-gray-700">{opt}</label></div>))}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Publish Game</h2>
      <form onSubmit={(e) => { e.preventDefault(); saveGame('published'); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Game Title</label><input type="text" className="w-full p-2 border border-gray-300 rounded-md text-black" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label><input type="text" className="w-full p-2 border border-gray-300 rounded-md text-black" value={tagline} onChange={(e) => setTagline(e.target.value)} required /></div>
        <CheckboxGrid options={genreOptions} selected={genres} onToggle={(v) => toggle(genres, setGenres, v)} label="Genres" />
        <CheckboxGrid options={networkOptions} selected={networks} onToggle={(v) => toggle(networks, setNetworks, v)} label="Networks" />
        <CheckboxGrid options={platformOptions} selected={platformTypes} onToggle={(v) => toggle(platformTypes, setPlatformTypes, v)} label="Platform Types" />
        <CheckboxGrid options={categoryOptions} selected={categories} onToggle={(v) => toggle(categories, setCategories, v)} label="Categories" />
        <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Summary</label><textarea className="w-full p-2 border border-gray-300 rounded-md text-black h-24" value={summary} onChange={(e) => setSummary(e.target.value)} required /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Discord</label><input type="url" className="w-full p-2 border border-gray-300 rounded-md text-black" value={discordLink} onChange={(e) => setDiscordLink(e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Twitter</label><input type="url" className="w-full p-2 border border-gray-300 rounded-md text-black" value={twitterLink} onChange={(e) => setTwitterLink(e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Website</label><input type="url" className="w-full p-2 border border-gray-300 rounded-md text-black" value={websiteLink} onChange={(e) => setWebsiteLink(e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Telegram</label><input type="url" className="w-full p-2 border border-gray-300 rounded-md text-black" value={telegramLink} onChange={(e) => setTelegramLink(e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">App Store</label><input type="url" className="w-full p-2 border border-gray-300 rounded-md text-black" value={appStoreLink} onChange={(e) => setAppStoreLink(e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Play Store</label><input type="url" className="w-full p-2 border border-gray-300 rounded-md text-black" value={playStoreLink} onChange={(e) => setPlayStoreLink(e.target.value)} /></div>
        <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Detail Content 1</label><textarea className="w-full p-2 border border-gray-300 rounded-md text-black h-32" value={detailContent1} onChange={(e) => setDetailContent1(e.target.value)} /></div>
        <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Detail Content 2</label><textarea className="w-full p-2 border border-gray-300 rounded-md text-black h-32" value={detailContent2} onChange={(e) => setDetailContent2(e.target.value)} /></div>
        <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Image Detail 1 (Landscape 16:9)*</label><input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && setImageDetail1(e.target.files[0])} className="w-full text-sm text-gray-900" required />{imageDetail1 && <img src={URL.createObjectURL(imageDetail1)} alt="Preview" className="mt-2 max-h-48 rounded" />}</div>
        <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Portrait Image (3:4)*</label><input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && setPortraitImage(e.target.files[0])} className="w-full text-sm text-gray-900" required />{portraitImage && <img src={URL.createObjectURL(portraitImage)} alt="Preview" className="mt-2 h-48 rounded" />}</div>
        <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Image Detail 2 (Optional)</label><input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && setImageDetail2(e.target.files[0])} className="w-full text-sm text-gray-900" /></div>
        <div className="col-span-2 flex gap-3">
          <button type="button" onClick={() => saveGame('draft')} disabled={loading} className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md">{loading ? 'Saving...' : 'Save as Draft'}</button>
          <button type="submit" disabled={loading || !isSuperOrGamesAdmin} className={`px-4 py-2 rounded-md ${isSuperOrGamesAdmin ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>{loading ? 'Publishing...' : 'Publish Game'}</button>
        </div>
        {message && <p className={`col-span-2 text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
      </form>
    </div>
  );
}
