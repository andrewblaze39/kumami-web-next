'use client';

import { useEffect, useState } from 'react';
import { CONSENT_OPEN_EVENT, readConsent, saveConsent } from '@/lib/consent';
import './legal.css';

/**
 * Cookie banner, mounted once in the root layout so it covers the gate, the
 * shell and the public Terms page. Shows until the visitor picks Accept or
 * Reject; "Cookie settings" links reopen it. Analytics stays off until Accept.
 */
export default function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Read after mount: the choice lives in localStorage, which the server can't see.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!readConsent()) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  if (!open) return null;

  const choose = (analytics: boolean) => {
    saveConsent(analytics);
    setOpen(false);
  };

  return (
    <div className="k-consent" role="region" aria-label="Cookie choices">
      <p className="k-consent-text">
        We use cookies that are needed to keep you signed in. With your OK we also use
        analytics cookies (Google Analytics) to see which pages are used, so we can improve
        Kumami. No advertising cookies.
      </p>
      <div className="k-consent-actions">
        <button type="button" className="k-consent-btn" onClick={() => choose(false)}>
          Reject analytics
        </button>
        <button type="button" className="k-consent-btn k-consent-btn-primary" onClick={() => choose(true)}>
          Accept analytics
        </button>
      </div>
    </div>
  );
}

/** Footer link that reopens the banner. */
export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={`k-cookie-link${className ? ` ${className}` : ''}`}
      onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
    >
      Cookie settings
    </button>
  );
}
