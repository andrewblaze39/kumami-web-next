// Main Roadmap component — quadrant grid of categories + upcoming timeline.
// Drop at src/components/roadmap/Roadmap.tsx
//
// Persistence: writes to localStorage on every edit. To migrate to Firestore,
// replace the `useEffect` save + initial `roadmapStore.load()` with a Firestore
// snapshot subscription on a single doc (suggested path: `system/roadmap`).

'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Plus, X, Check, RotateCcw } from 'lucide-react';
import {
  ROADMAP_SEED,
  createId,
  dateUtil,
  roadmapStore,
} from './data';
import type { RoadmapCategory, RoadmapItem, RoadmapState } from './types';
import { DeadlinePill, EditableText, MintBtn } from './atoms';

// ─────────────────────────────────────────────────────────────────────────
//  ItemRow — single editable item inside a CategoryCard
// ─────────────────────────────────────────────────────────────────────────
interface ItemRowProps {
  item: RoadmapItem;
  onChange: (patch: Partial<RoadmapItem>) => void;
  onDelete: () => void;
}
function ItemRow({ item, onChange, onDelete }: ItemRowProps) {
  const [hover, setHover] = useState(false);
  const bucket = dateUtil.bucket(item.deadline);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="grid grid-cols-[auto_1fr] gap-2.5 border-b py-2 pr-1"
      style={{
        borderColor: 'rgba(255,255,255,0.08)',
        opacity: item.done ? 0.45 : 1,
      }}
    >
      {/* Done toggle */}
      <button
        type="button"
        onClick={() => onChange({ done: !item.done })}
        title={item.done ? 'Mark as not done' : 'Mark as done'}
        className="mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] p-0 transition-all"
        style={{
          border: `1.5px solid ${item.done ? '#96EDD6' : 'rgba(255,255,255,0.08)'}`,
          background: item.done ? '#96EDD6' : 'transparent',
          color: '#0a0a0f',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          if (!item.done) (e.currentTarget as HTMLButtonElement).style.borderColor = '#96EDD6';
        }}
        onMouseLeave={(e) => {
          if (!item.done) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
        }}
      >
        {item.done && <Check className="h-[11px] w-[11px]" strokeWidth={3} />}
      </button>

      <div className="min-w-0">
        <div
          className="text-[13px] font-medium leading-snug text-white"
          style={{
            textDecoration: item.done ? 'line-through' : 'none',
            textDecorationColor: 'rgba(255,255,255,0.3)',
          }}
        >
          <EditableText
            value={item.text}
            placeholder="What needs doing?"
            onChange={(v) => onChange({ text: v })}
            multiline
          />
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <DeadlinePill
            deadline={item.deadline}
            bucket={bucket}
            onChange={(v) => onChange({ deadline: v })}
            compact
          />
          {hover && (
            <button
              type="button"
              onClick={onDelete}
              title="Remove item"
              className="ml-auto inline-flex items-center justify-center rounded-[5px] border-none p-[3px] transition-all"
              style={{ background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.color = '#f87171';
                el.style.background = 'rgba(248,113,113,0.10)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.color = 'rgba(255,255,255,0.4)';
                el.style.background = 'transparent';
              }}
            >
              <X className="h-3 w-3" strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  AddItemRow — bottom of every CategoryCard
// ─────────────────────────────────────────────────────────────────────────
function AddItemRow({ onAdd }: { onAdd: (text: string) => void }) {
  const [draft, setDraft] = useState('');
  const submit = () => {
    const t = draft.trim();
    if (!t) return;
    onAdd(t);
    setDraft('');
  };
  return (
    <div className="flex items-center gap-2 px-1 pb-0.5 pt-2.5">
      <span
        className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px]"
        style={{
          border: '1.5px dashed rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        <Plus className="h-[11px] w-[11px]" strokeWidth={2.4} />
      </span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
        onBlur={submit}
        placeholder="Add an upcoming feature…"
        className="flex-1 border-none bg-transparent py-0.5 text-[13px] font-medium text-white outline-none"
        style={{ caretColor: '#96EDD6' }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  CategoryCard — one quadrant
// ─────────────────────────────────────────────────────────────────────────
interface CategoryCardProps {
  cat: RoadmapCategory;
  onChange: (patch: Partial<RoadmapCategory>) => void;
  onDelete: () => void;
  onAddItem: (text: string) => void;
  onChangeItem: (id: string, patch: Partial<RoadmapItem>) => void;
  onDeleteItem: (id: string) => void;
}
function CategoryCard({ cat, onChange, onDelete, onAddItem, onChangeItem, onDeleteItem }: CategoryCardProps) {
  const [hover, setHover] = useState(false);
  const total = cat.items.length;
  const done = cat.items.filter((i) => i.done).length;
  const nextDue = cat.items
    .filter((i) => !i.done && i.deadline)
    .map((i) => ({ ...i, diff: dateUtil.daysFromNow(i.deadline) ?? Number.POSITIVE_INFINITY }))
    .sort((a, b) => a.diff - b.diff)[0];
  const nextBucket = nextDue ? dateUtil.bucket(nextDue.deadline) : null;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-col rounded-2xl px-[18px] pb-3.5 pt-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        transition: 'border-color .15s ease',
      }}
    >
      {/* Header */}
      <div className="mb-1 flex items-start gap-2">
        <h3
          className="m-0 flex-1 text-base font-extrabold leading-snug text-white"
          style={{ letterSpacing: '-0.015em' }}
        >
          <EditableText
            value={cat.name}
            placeholder="Category name"
            onChange={(v) => onChange({ name: v })}
          />
        </h3>
        {hover && (
          <button
            type="button"
            onClick={onDelete}
            title="Delete category"
            className="inline-flex items-center justify-center rounded-md border-none p-1 transition-all"
            style={{ background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = '#f87171';
              el.style.background = 'rgba(248,113,113,0.10)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = 'rgba(255,255,255,0.4)';
              el.style.background = 'transparent';
            }}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        )}
      </div>

      {/* Meta */}
      <div
        className="mb-3 flex items-center gap-2 font-mono text-[11px] font-bold"
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        <span>{total === 0 ? 'Empty' : `${done}/${total} done`}</span>
        {nextBucket && (
          <>
            <span>·</span>
            <span style={{ color: nextBucket.urgent ? '#FACC15' : 'rgba(255,255,255,0.65)' }}>
              Next: {nextBucket.label}
            </span>
          </>
        )}
      </div>

      {/* Items */}
      <div className="flex flex-col">
        {cat.items.length === 0 ? (
          <div
            className="border-b px-1 py-3.5 text-xs italic"
            style={{
              color: 'rgba(255,255,255,0.4)',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            Nothing planned yet.
          </div>
        ) : (
          cat.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onChange={(patch) => onChangeItem(item.id, patch)}
              onDelete={() => onDeleteItem(item.id)}
            />
          ))
        )}
        <AddItemRow onAdd={onAddItem} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Quadrants — the responsive grid of category cards + Add-card affordance
// ─────────────────────────────────────────────────────────────────────────
interface QuadrantsProps {
  categories: RoadmapCategory[];
  onChangeCategory: (id: string, patch: Partial<RoadmapCategory>) => void;
  onDeleteCategory: (id: string) => void;
  onAddCategory: () => void;
  onAddItem: (catId: string, text: string) => void;
  onChangeItem: (catId: string, id: string, patch: Partial<RoadmapItem>) => void;
  onDeleteItem: (catId: string, id: string) => void;
}
function Quadrants({
  categories,
  onChangeCategory,
  onDeleteCategory,
  onAddCategory,
  onAddItem,
  onChangeItem,
  onDeleteItem,
}: QuadrantsProps) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}
    >
      {categories.map((cat) => (
        <CategoryCard
          key={cat.id}
          cat={cat}
          onChange={(p) => onChangeCategory(cat.id, p)}
          onDelete={() => onDeleteCategory(cat.id)}
          onAddItem={(text) => onAddItem(cat.id, text)}
          onChangeItem={(id, p) => onChangeItem(cat.id, id, p)}
          onDeleteItem={(id) => onDeleteItem(cat.id, id)}
        />
      ))}
      <button
        type="button"
        onClick={onAddCategory}
        className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl p-6 transition-all"
        style={{
          background: 'transparent',
          border: '1.5px dashed rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.65)',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.borderColor = '#96EDD6';
          el.style.color = '#96EDD6';
          el.style.background = 'rgba(150,237,214,0.04)';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.borderColor = 'rgba(255,255,255,0.08)';
          el.style.color = 'rgba(255,255,255,0.65)';
          el.style.background = 'transparent';
        }}
      >
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: 'rgba(150,237,214,0.10)' }}
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} />
        </span>
        <span className="text-[13px] font-bold">Add category</span>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Upcoming — flat sorted timeline, grouped by date proximity
// ─────────────────────────────────────────────────────────────────────────
const GROUP_ORDER = ['Overdue', 'Today', 'This week', 'Next week', 'Later this month', 'Beyond', 'No date'];

interface UpcomingItem extends RoadmapItem {
  catId: string;
  catName: string;
  diff: number | null;
}

function Upcoming({ categories }: { categories: RoadmapCategory[] }) {
  const { groups, total } = useMemo(() => {
    const flat: UpcomingItem[] = [];
    categories.forEach((cat) => {
      cat.items.forEach((item) => {
        if (item.done) return;
        const diff = item.deadline ? dateUtil.daysFromNow(item.deadline) : null;
        flat.push({ ...item, catId: cat.id, catName: cat.name, diff });
      });
    });
    flat.sort((a, b) => {
      if (a.diff === null && b.diff === null) return 0;
      if (a.diff === null) return 1;
      if (b.diff === null) return -1;
      return a.diff - b.diff;
    });
    const g: Record<string, UpcomingItem[]> = {};
    flat.forEach((it) => {
      const key = dateUtil.groupFor(it.diff);
      (g[key] ||= []).push(it);
    });
    return { groups: g, total: flat.length };
  }, [categories]);

  if (total === 0) {
    return (
      <div
        className="rounded-2xl px-6 py-10 text-center"
        style={{
          border: '1.5px dashed rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        <div className="mb-1 text-sm font-bold text-white">All caught up.</div>
        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Add some upcoming features to your categories above.
        </div>
      </div>
    );
  }

  const activeGroups = GROUP_ORDER.filter((k) => groups[k]?.length);

  return (
    <div className="flex flex-col gap-[18px]">
      {activeGroups.map((groupName) => {
        const items = groups[groupName];
        const isUrgent = ['Overdue', 'Today'].includes(groupName);
        const isThisWeek = groupName === 'This week';
        const stripeColor = isUrgent ? '#f87171' : isThisWeek ? '#FACC15' : '#96EDD6';

        return (
          <div key={groupName} className="flex gap-[18px]">
            {/* Rail label */}
            <div
              className="relative w-[130px] shrink-0 pl-3.5"
              style={{ borderLeft: `2px solid ${stripeColor}33` }}
            >
              <div
                className="absolute h-2.5 w-2.5 rounded-full"
                style={{
                  left: -5,
                  top: 4,
                  background: stripeColor,
                  boxShadow: `0 0 12px ${stripeColor}88`,
                }}
              />
              <div
                className="mb-0.5 text-[11px] font-extrabold uppercase"
                style={{ color: stripeColor, letterSpacing: '0.08em' }}
              >
                {groupName}
              </div>
              <div className="font-mono text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </div>
            </div>

            {/* Items */}
            <div className="flex flex-1 flex-col gap-1.5">
              {items.map((it) => {
                const bucket = dateUtil.bucket(it.deadline);
                return (
                  <div
                    key={it.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl px-3.5 py-2.5"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      transition: 'all .15s ease',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.borderColor = 'rgba(150,237,214,0.18)';
                      el.style.background = 'rgba(255,255,255,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.borderColor = 'rgba(255,255,255,0.08)';
                      el.style.background = 'rgba(255,255,255,0.03)';
                    }}
                  >
                    <div className="min-w-0">
                      <div
                        className="mb-0.5 text-[11px] font-bold uppercase"
                        style={{ color: '#96EDD6', letterSpacing: '0.04em' }}
                      >
                        {it.catName}
                      </div>
                      <div
                        className="overflow-hidden text-[13px] font-medium leading-snug text-white"
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                      >
                        {it.text}
                      </div>
                    </div>
                    <DeadlinePill deadline={it.deadline} bucket={bucket} onChange={() => {}} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Stat — small metric tile in the header strip
// ─────────────────────────────────────────────────────────────────────────
function Stat({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  return (
    <div
      className="rounded-2xl px-4 py-3.5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        className="mb-1.5 text-[10px] font-extrabold uppercase"
        style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}
      >
        {label}
      </div>
      <div
        className="font-mono text-[28px] font-extrabold leading-none"
        style={{ color, letterSpacing: '-0.02em' }}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Roadmap — root component
// ─────────────────────────────────────────────────────────────────────────
const DOT_BG: CSSProperties = {
  background: '#0a0a0f',
  backgroundImage: 'radial-gradient(circle, rgba(150,237,214,0.06) 1px, transparent 1px)',
  backgroundSize: '20px 20px',
};

export default function Roadmap() {
  // Lazy init — read from localStorage on first render, fall back to seed
  const [state, setState] = useState<RoadmapState>(() => {
    if (typeof window === 'undefined') return JSON.parse(JSON.stringify(ROADMAP_SEED));
    return roadmapStore.load() ?? JSON.parse(JSON.stringify(ROADMAP_SEED));
  });

  // Persist every edit
  useEffect(() => {
    roadmapStore.save({ ...state, updatedAt: new Date().toISOString() });
  }, [state]);

  // ── Mutations (deep-clone each time — small dataset, simpler than immer) ─
  const patch = (mutator: (s: RoadmapState) => void) =>
    setState((prev) => {
      const next: RoadmapState = JSON.parse(JSON.stringify(prev));
      mutator(next);
      return next;
    });

  const addCategory = () =>
    patch((s) => {
      s.categories.push({ id: createId('cat'), name: 'New category', items: [] });
    });
  const changeCategory = (id: string, p: Partial<RoadmapCategory>) =>
    patch((s) => {
      const c = s.categories.find((c) => c.id === id);
      if (c) Object.assign(c, p);
    });
  const deleteCategory = (id: string) => {
    if (!confirm('Delete this category and all its items?')) return;
    patch((s) => {
      s.categories = s.categories.filter((c) => c.id !== id);
    });
  };
  const addItem = (catId: string, text: string) =>
    patch((s) => {
      const c = s.categories.find((c) => c.id === catId);
      if (c) c.items.push({ id: createId('it'), text, deadline: null, done: false });
    });
  const changeItem = (catId: string, id: string, p: Partial<RoadmapItem>) =>
    patch((s) => {
      const c = s.categories.find((c) => c.id === catId);
      const it = c?.items.find((i) => i.id === id);
      if (it) Object.assign(it, p);
    });
  const deleteItem = (catId: string, id: string) =>
    patch((s) => {
      const c = s.categories.find((c) => c.id === catId);
      if (c) c.items = c.items.filter((i) => i.id !== id);
    });
  const resetToSeed = () => {
    if (!confirm('Reset everything to the original seed? Your edits will be lost.')) return;
    roadmapStore.reset();
    setState(JSON.parse(JSON.stringify(ROADMAP_SEED)));
  };

  // ── Stats ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let total = 0,
      done = 0,
      overdue = 0,
      thisWeek = 0;
    state.categories.forEach((cat) =>
      cat.items.forEach((it) => {
        total++;
        if (it.done) done++;
        else if (it.deadline) {
          const d = dateUtil.daysFromNow(it.deadline) ?? 0;
          if (d < 0) overdue++;
          else if (d <= 7) thisWeek++;
        }
      })
    );
    return { total, done, overdue, thisWeek, categories: state.categories.length };
  }, [state]);

  const today = new Date().toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen w-full text-white" style={{ ...DOT_BG, fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div className="mx-auto max-w-[1280px] px-8 pb-20 pt-9">
        {/* Header */}
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <div
              className="mb-1.5 flex items-center gap-2 text-[11px] font-extrabold uppercase"
              style={{ color: '#96EDD6', letterSpacing: '0.14em' }}
            >
              <span
                className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md text-[13px] font-black"
                style={{ background: '#96EDD6', color: '#0a0a0f', letterSpacing: '-0.04em' }}
              >
                k
              </span>
              Kumami Roadmap
            </div>
            <h1
              className="m-0 text-[38px] font-extrabold leading-none text-white"
              style={{ letterSpacing: '-0.025em' }}
            >
              What&apos;s shipping
            </h1>
            <div className="mt-2 text-[13px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {today} · Click anything to edit · Saves locally as you type
            </div>
          </div>
          <div className="flex gap-2">
            <MintBtn kind="dim" size="sm" onClick={resetToSeed} title="Reset to seed data">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </MintBtn>
            <MintBtn kind="mint" onClick={addCategory}>
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Add category
            </MintBtn>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <Stat label="Categories" value={stats.categories} color="#96EDD6" />
          <Stat label="Total features" value={stats.total} color="#fff" />
          <Stat
            label="This week"
            value={stats.thisWeek}
            color="#FACC15"
            sub={stats.thisWeek > 0 ? 'due in ≤ 7 days' : 'nothing due'}
          />
          <Stat
            label="Overdue"
            value={stats.overdue}
            color={stats.overdue > 0 ? '#f87171' : 'rgba(255,255,255,0.4)'}
          />
        </div>

        {/* Quadrants */}
        <Quadrants
          categories={state.categories}
          onChangeCategory={changeCategory}
          onDeleteCategory={deleteCategory}
          onAddCategory={addCategory}
          onAddItem={addItem}
          onChangeItem={changeItem}
          onDeleteItem={deleteItem}
        />

        {/* Upcoming */}
        <div className="mt-14">
          <div
            className="mb-5 flex items-end justify-between gap-3 border-b pb-3.5"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <div>
              <div
                className="mb-1.5 text-[11px] font-extrabold uppercase"
                style={{ color: '#96EDD6', letterSpacing: '0.14em' }}
              >
                ◇ Coming up
              </div>
              <h2 className="m-0 text-[26px] font-extrabold" style={{ letterSpacing: '-0.02em' }}>
                Sorted by deadline
              </h2>
            </div>
            <span
              className="rounded-full px-2.5 py-1 font-mono text-[11px] font-bold"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.65)',
              }}
            >
              {stats.total - stats.done} pending
            </span>
          </div>
          <Upcoming categories={state.categories} />
        </div>
      </div>
    </div>
  );
}
