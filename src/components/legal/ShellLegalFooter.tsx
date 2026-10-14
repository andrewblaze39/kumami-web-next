import Link from 'next/link';
import { CookieSettingsLink } from './CookieConsent';

/** Bottom of every /world page: the Terms and Cookie settings links. */
export default function ShellLegalFooter() {
  return (
    <footer className="w-shell-legal">
      <nav aria-label="Legal">
        <Link href="/world/terms">Terms</Link>
        <CookieSettingsLink />
      </nav>
    </footer>
  );
}
