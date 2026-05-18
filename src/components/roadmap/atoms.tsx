// Inline-editable text + deadline-pill + button atoms.
// Drop at src/components/roadmap/atoms.tsx

'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Calendar } from 'lucide-react';
import { BUCKET_STYLES, dateUtil } from './data';
import type { DeadlineBucket } from './types';

// ── EditableText ─────────────────────────────────────────────────────────
interface EditableTextProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  style?: CSSProperties;
  multiline?: boolean;
  autoFocus?: boolean;
}
export function EditableText({
  value,
  onChange,
  placeholder,
  style,
  multiline,
  autoFocus,
}: EditableTextProps) {
  const [editing, setEditing] = useState<boolean>(!!autoFocus);
  const [draft, setDraft] = useState<string>(value || '');

  useEffect(() => {
    setDraft(value || '');
  }, [value]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  };

  if (editing) {
    const baseStyle: CSSProperties = {
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid #96EDD6',
      color: '#fff',
      fontSize: 'inherit',
      fontFamily: 'inherit',
      fontWeight: 'inherit',
      padding: '4px 8px',
      borderRadius: 6,
      outline: 'none',
      width: '100%',
      resize: multiline ? 'vertical' : 'none',
      minHeight: multiline ? 56 : undefined,
      lineHeight: 'inherit',
      letterSpacing: 'inherit',
      ...style,
    };

    if (multiline) {
      return (
        <textarea
          autoFocus
          value={draft}
          rows={2}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              (e.target as HTMLTextAreaElement).blur();
            }
            if (e.key === 'Escape') {
              setDraft(value || '');
              setEditing(false);
            }
          }}
          style={baseStyle}
        />
      );
    }

    return (
      <input
        autoFocus
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === 'Escape') {
            setDraft(value || '');
            setEditing(false);
          }
        }}
        style={baseStyle}
      />
    );
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLSpanElement).style.background = 'rgba(150,237,214,0.06)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLSpanElement).style.background = 'transparent';
      }}
      style={{
        cursor: 'text',
        display: 'inline-block',
        minHeight: 18,
        borderRadius: 4,
        padding: '2px 4px',
        margin: '-2px -4px',
        transition: 'background .15s ease',
        ...style,
      }}
    >
      {value || (
        <span style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
          {placeholder || '—'}
        </span>
      )}
    </span>
  );
}

// ── DeadlinePill ─────────────────────────────────────────────────────────
interface DeadlinePillProps {
  deadline: string | null;
  bucket: DeadlineBucket;
  onChange: (next: string | null) => void;
  compact?: boolean;
}
export function DeadlinePill({ deadline, bucket, onChange, compact }: DeadlinePillProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const b = BUCKET_STYLES[bucket.color] ?? BUCKET_STYLES.neutral;

  const openPicker = (e: React.MouseEvent) => {
    e.stopPropagation();
    const input = inputRef.current;
    if (!input) return;
    // showPicker is supported in modern browsers; fall back to focus+click otherwise
    try {
      (input as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
    } catch {
      /* noop */
    }
    input.focus();
    input.click();
  };

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={openPicker}
        title={deadline ? dateUtil.full(deadline) : 'Set deadline'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: compact ? '2px 8px' : '3px 9px',
          borderRadius: 999,
          border: `1px solid ${b.border}`,
          background: b.bg,
          color: b.fg,
          fontSize: compact ? 10 : 11,
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          fontFamily: 'ui-monospace, Menlo, monospace',
          letterSpacing: '0.01em',
        }}
      >
        <Calendar style={{ width: compact ? 9 : 10, height: compact ? 9 : 10 }} />
        {bucket.label}
        {deadline && !compact && (
          <span style={{ color: b.fg, opacity: 0.55, marginLeft: 2 }}>
            · {dateUtil.short(deadline)}
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="date"
        value={deadline ? dateUtil.iso(deadline) : ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    </span>
  );
}

// ── MintBtn ──────────────────────────────────────────────────────────────
interface MintBtnProps {
  children: ReactNode;
  onClick?: () => void;
  size?: 'sm' | 'md';
  kind?: 'mint' | 'ghost' | 'dim';
  style?: CSSProperties;
  title?: string;
}
export function MintBtn({ children, onClick, size = 'md', kind = 'mint', style, title }: MintBtnProps) {
  const sizeStyles: Record<typeof size, { padding: string; fontSize: number }> = {
    sm: { padding: '6px 12px', fontSize: 12 },
    md: { padding: '9px 16px', fontSize: 13 },
  };
  const kindStyles: Record<typeof kind, CSSProperties> = {
    mint:  { background: '#96EDD6', color: '#0a0a0f', border: 'none' },
    ghost: { background: 'rgba(255,255,255,0.03)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' },
    dim:   { background: 'transparent', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.08)' },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 10,
        cursor: 'pointer',
        fontWeight: 700,
        letterSpacing: '-0.005em',
        transition: 'all .15s ease',
        ...sizeStyles[size],
        ...kindStyles[kind],
        ...style,
      }}
      onMouseEnter={(e) => {
        if (kind === 'mint') {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
        } else {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(150,237,214,0.08)';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
        if (kind !== 'mint') {
          (e.currentTarget as HTMLButtonElement).style.background = (kindStyles[kind].background as string) ?? 'transparent';
        }
      }}
    >
      {children}
    </button>
  );
}
