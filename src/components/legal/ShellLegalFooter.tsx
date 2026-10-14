import Link from 'next/link';
import { CookieSettingsLink } from './CookieConsent';

/**
 * Bottom of every /world page: the "not financial advice" line plus the legal
 * links. One place, so News, Pro, Alpha Room, Console and the rest all carry it.
 */
export default function ShellLegalFooter() {
  return (
    <footer className="w-shell-legal">
      <p>
        Kumami is for education and information only. Nothing here — including news, research, Pro signals, Alpha
        Room calls and Kuma AI answers — is financial, investment or tax advice. Crypto is volatile and you can lose
        money; do your own research before you trade.
      </p>
      <nav aria-label="Legal">
        <Link href="/world/terms">Terms</Link>
        <Link href="/world/privacy">Privacy</Link>
        <CookieSettingsLink />
      </nav>
    </footer>
  );
}
