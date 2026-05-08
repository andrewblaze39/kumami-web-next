'use client';

import { useState } from 'react';
import {
  ROADMAP_ITEMS,
  COLUMNS,
  CATEGORIES,
  CATEGORY_COLORS,
  STATUS_COLORS,
  STATUS_LABELS,
  PRIORITY_COLORS,
  type RoadmapItem,
} from '@/lib/roadmapData';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function Badge({ color, children, small = false }: { color: string; children: React.ReactNode; small?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: small ? '1px 6px' : '2px 7px',
      borderRadius: '4px',
      fontSize: small ? '10px' : '11px',
      fontWeight: 600,
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
      lineHeight: 1.4,
      whiteSpace: 'nowrap' as const,
    }}>
      {children}
    </span>
  );
}

function RoadmapCard({ item, onClick }: { item: RoadmapItem; onClick: (item: RoadmapItem) => void }) {
  const statusColor = STATUS_COLORS[item.status];
  const categoryColor = CATEGORY_COLORS[item.category] || '#6b7280';
  const isDone = item.status === 'done';

  return (
    <div
      onClick={() => onClick(item)}
      className="group cursor-pointer rounded-md mb-2 transition-all"
      style={{
        background: '#1e293b',
        borderLeft: `3px solid ${statusColor}`,
        padding: '10px 12px',
        opacity: isDone ? 0.6 : 1,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#263548'; (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '#1e293b'; (e.currentTarget as HTMLDivElement).style.opacity = isDone ? '0.6' : '1'; }}
    >
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', lineHeight: 1.4, marginBottom: '6px' }}>
        {item.title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' as const }}>
        <Badge color={categoryColor} small>{item.category}</Badge>
        {item.priority && <Badge color={PRIORITY_COLORS[item.priority]} small>{item.priority}</Badge>}
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#64748b', fontWeight: 500 }}>{item.pic}</span>
      </div>
      {item.targetDate && (
        <div style={{ fontSize: '10px', color: '#475569', marginTop: '5px' }}>🗓 {item.targetDate}</div>
      )}
    </div>
  );
}

function KanbanView({ items, onCardClick, showAllDone, setShowAllDone }: {
  items: RoadmapItem[];
  onCardClick: (item: RoadmapItem) => void;
  showAllDone: boolean;
  setShowAllDone: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '4px 0 12px', minHeight: '400px' }}>
      {COLUMNS.map(col => {
        const colItems = items.filter(i => i.status === col).sort((a, b) => a.order - b.order);
        const isDoneCol = col === 'done';
        const now = Date.now();
        const recentDone = isDoneCol ? colItems.filter(i => !i.targetDate || (now - new Date(i.targetDate).getTime()) < THIRTY_DAYS_MS) : colItems;
        const oldDone = isDoneCol ? colItems.filter(i => i.targetDate && (now - new Date(i.targetDate).getTime()) >= THIRTY_DAYS_MS) : [];
        const displayItems = isDoneCol ? (showAllDone ? colItems : recentDone) : colItems;

        return (
          <div key={col} style={{ minWidth: '240px', flex: '1 1 240px', maxWidth: '320px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px 10px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLORS[col], flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                {STATUS_LABELS[col]}
              </span>
              <span style={{
                marginLeft: 'auto', fontSize: '11px', fontWeight: 700,
                background: STATUS_COLORS[col] + '22', color: STATUS_COLORS[col],
                borderRadius: '10px', padding: '0 7px', lineHeight: '18px',
              }}>{colItems.length}</span>
            </div>
            <div style={{ minHeight: '100px' }}>
              {displayItems.map(item => <RoadmapCard key={item.id} item={item} onClick={onCardClick} />)}
              {isDoneCol && oldDone.length > 0 && (
                <button
                  onClick={() => setShowAllDone(v => !v)}
                  style={{
                    width: '100%', background: 'transparent', border: '1px dashed #334155',
                    color: '#64748b', borderRadius: '6px', padding: '6px',
                    fontSize: '11px', cursor: 'pointer', marginTop: '4px',
                  }}
                >
                  {showAllDone ? `▲ Hide older (${oldDone.length})` : `▼ Show ${oldDone.length} older completed`}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TableView({ items, onCardClick }: { items: RoadmapItem[]; onCardClick: (item: RoadmapItem) => void }) {
  const colOrder: Record<string, number> = { 'in-progress': 0, 'in-review': 1, 'planned': 2, 'done': 3 };
  const sorted = [...items].sort((a, b) => (colOrder[a.status] ?? 9) - (colOrder[b.status] ?? 9) || a.order - b.order);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1e293b' }}>
            {['Title', 'Category', 'Status', 'PIC', 'Priority', 'Target Date'].map(h => (
              <th key={h} style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' as const, fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(item => (
            <tr
              key={item.id}
              onClick={() => onCardClick(item)}
              style={{ borderBottom: '1px solid #1e293b', cursor: 'pointer', opacity: item.status === 'done' ? 0.6 : 1 }}
              onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#1e293b'; (e.currentTarget as HTMLTableRowElement).style.opacity = '1'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; (e.currentTarget as HTMLTableRowElement).style.opacity = item.status === 'done' ? '0.6' : '1'; }}
            >
              <td style={{ padding: '8px 10px', color: '#e2e8f0', fontWeight: 500, maxWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '3px', height: '14px', borderRadius: '2px', background: STATUS_COLORS[item.status], flexShrink: 0 }} />
                  {item.title}
                </div>
              </td>
              <td style={{ padding: '8px 10px' }}><Badge color={CATEGORY_COLORS[item.category] || '#6b7280'} small>{item.category}</Badge></td>
              <td style={{ padding: '8px 10px' }}><Badge color={STATUS_COLORS[item.status]} small>{STATUS_LABELS[item.status]}</Badge></td>
              <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{item.pic}</td>
              <td style={{ padding: '8px 10px' }}>{item.priority ? <Badge color={PRIORITY_COLORS[item.priority]} small>{item.priority}</Badge> : '—'}</td>
              <td style={{ padding: '8px 10px', color: '#64748b', whiteSpace: 'nowrap' as const }}>{item.targetDate || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ItemModal({ item, onClose }: { item: RoadmapItem; onClose: () => void }) {
  const statusColor = STATUS_COLORS[item.status];
  const categoryColor = CATEGORY_COLORS[item.category] || '#6b7280';

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#0f172a', borderRadius: '10px', border: `1px solid ${statusColor}44`, width: '100%', maxWidth: '520px', overflow: 'hidden' }}
      >
        <div style={{ borderLeft: `4px solid ${statusColor}`, padding: '16px 20px', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.4, marginBottom: '6px' }}>{item.title}</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
              <Badge color={categoryColor}>{item.category}</Badge>
              <Badge color={statusColor}>{STATUS_LABELS[item.status]}</Badge>
              {item.priority && <Badge color={PRIORITY_COLORS[item.priority]}>{item.priority}</Badge>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Row label="PIC" value={item.pic} />
          <Row label="Target Date" value={item.targetDate || 'Not set'} />
          {item.notes && (
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.4px', marginBottom: '4px' }}>Notes</div>
              <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, background: '#1e293b', borderRadius: '6px', padding: '10px 12px' }}>{item.notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.4px', minWidth: '80px', flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#cbd5e1' }}>{value}</div>
    </div>
  );
}

export default function RoadmapPage() {
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<RoadmapItem | null>(null);
  const [showAllDone, setShowAllDone] = useState(false);

  const filtered = selectedCategory === 'All'
    ? ROADMAP_ITEMS
    : ROADMAP_ITEMS.filter(i => i.category === selectedCategory);

  const counts = {
    done: ROADMAP_ITEMS.filter(i => i.status === 'done').length,
    inProgress: ROADMAP_ITEMS.filter(i => i.status === 'in-progress').length,
    planned: ROADMAP_ITEMS.filter(i => i.status === 'planned').length,
    total: ROADMAP_ITEMS.length,
  };

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Kumami Roadmap</h1>
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' as const }}>
          <span>✅ <b style={{ color: '#22c55e' }}>{counts.done}</b> Done</span>
          <span>🔄 <b style={{ color: '#40e0d0' }}>{counts.inProgress}</b> In Progress</span>
          <span>📋 <b style={{ color: '#6b7280' }}>{counts.planned}</b> Planned</span>
          <span style={{ marginLeft: 'auto' }}>{counts.total} total items</span>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' as const, marginBottom: '16px' }}>
        <div style={{ display: 'flex', background: '#1e293b', borderRadius: '6px', padding: '2px', border: '1px solid #334155' }}>
          {(['kanban', 'table'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '5px 14px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                background: view === v ? '#40e0d0' : 'transparent',
                color: view === v ? '#0f172a' : '#64748b',
                transition: 'all 0.15s',
              }}
            >
              {v === 'kanban' ? '⬛ Kanban' : '☰ Table'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' as const }}>
          {CATEGORIES.map(cat => {
            const color = cat === 'All' ? '#40e0d0' : (CATEGORY_COLORS[cat] || '#6b7280');
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '4px 10px', borderRadius: '20px',
                  border: `1px solid ${isActive ? color : '#334155'}`,
                  background: isActive ? color + '22' : 'transparent',
                  color: isActive ? color : '#64748b',
                  fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {view === 'kanban'
        ? <KanbanView items={filtered} onCardClick={setSelectedItem} showAllDone={showAllDone} setShowAllDone={setShowAllDone} />
        : <TableView items={filtered} onCardClick={setSelectedItem} />
      }

      {selectedItem && <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  );
}
