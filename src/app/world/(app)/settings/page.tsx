import Link from 'next/link';
import { Settings } from 'lucide-react';

// Matches --accent (matches the branded "Coming soon" pattern used on /world/subscribe).
const ACCENT = '#00c2c7';
const ACCENT_SOFT = 'rgba(0, 194, 199, 0.16)';

/**
 * /world/settings — placeholder, mirrors /world/subscribe's "Coming soon"
 * pattern so a page reachable from the live sidebar doesn't read as broken.
 */
export default function SettingsPage() {
  return (
    <div className="w-content-inner">
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border-2)',
            borderRadius: 20,
            padding: '52px 36px',
            textAlign: 'center',
            maxWidth: 560,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: ACCENT_SOFT,
              color: ACCENT,
            }}
          >
            <Settings size={28} />
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 12px',
              borderRadius: 999,
              background: ACCENT_SOFT,
              color: ACCENT,
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Coming soon
          </span>

          <h1 style={{ margin: 0, fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, color: 'var(--ink)' }}>
            Settings
          </h1>

          <p style={{ margin: 0, maxWidth: '46ch', color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
            Account, notification and preference controls are on the way — for now, profile and
            plan details live in the account menu in the bottom-left corner.
          </p>

          <Link href="/world/home" className="w-btn w-btn-surface w-btn-lg" style={{ marginTop: 6 }}>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
