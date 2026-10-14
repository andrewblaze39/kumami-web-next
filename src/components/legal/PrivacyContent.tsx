import Link from 'next/link';
import { CookieSettingsLink } from './CookieConsent';
import './legal.css';

/**
 * The Privacy Policy, written from what the code actually collects
 * (docs/DATABASE.md) and who it is shared with. Kept in code, not Firestore, so
 * every change is reviewed and versioned. When it changes: update
 * PRIVACY_LAST_UPDATED, and bump CONSENT_VERSION in src/lib/consent.ts if the
 * analytics section changes.
 *
 * TODO(Andrew): fill in LEGAL_ENTITY before releasing to main — see
 * docs/legal/2026-10-14-compliance-audit.md.
 */
export const PRIVACY_LAST_UPDATED = '14 October 2026';

export const LEGAL_ENTITY = {
  name: '[Company legal name]',
  country: '[Country of registration]',
  email: '[privacy contact email]',
};

const PROCESSORS: { name: string; purpose: string; data: string }[] = [
  { name: 'Google Firebase (Google LLC)', purpose: 'Accounts, sign-in, database, file storage, hosting', data: 'Everything listed in section 2' },
  { name: 'Google Analytics for Firebase', purpose: 'Usage statistics — only if you accept analytics cookies', data: 'Pages viewed, device and browser type, approximate location, an analytics ID' },
  { name: 'Stripe', purpose: 'Card payments and subscriptions', data: 'Email, payment card details (held by Stripe, never by us), billing country' },
  { name: 'NOWPayments', purpose: 'Crypto payments', data: 'Order number, amount, the coin and wallet you pay from' },
  { name: 'n8n (our self-hosted automation server)', purpose: 'Runs the Kuma AI assistant', data: 'Your Kuma chat messages and your account ID' },
  { name: 'Google Gemini', purpose: 'The AI model behind Kuma and the AI Portfolio Scan', data: 'Your Kuma chat messages and the portfolio you ask it to scan' },
  { name: 'Alchemy', purpose: 'Wallet balances and activity for the Address Tracker and Portfolio Scan', data: 'Public wallet addresses you enter' },
  { name: 'CoinGecko, CoinGlass', purpose: 'Market prices and data', data: 'No personal data — we only request market data' },
];

export default function PrivacyContent() {
  return (
    <article className="k-legal">
      <h1>Privacy Policy</h1>
      <p className="k-legal-updated">Last updated: {PRIVACY_LAST_UPDATED}</p>

      <p>
        This policy explains what personal data Kumami World (&quot;Kumami&quot;, &quot;we&quot;, &quot;us&quot;) collects when
        you use kumami.world and the Kumami apps, why we collect it, who we share it with, and the choices and
        rights you have. Kumami is operated by {LEGAL_ENTITY.name}, {LEGAL_ENTITY.country}, which is the
        controller of your personal data. Questions or requests:{' '}
        <strong>{LEGAL_ENTITY.email}</strong>.
      </p>

      <h2 id="collect">1. The short version</h2>
      <ul>
        <li>We collect what we need to run your account, your learning progress, your Pro subscription and the tools you use.</li>
        <li>We do <strong>not</strong> sell your personal data and we do not use advertising cookies.</li>
        <li>Analytics cookies are off unless you accept them.</li>
        <li>You can ask us to see, correct, export or delete your data at any time.</li>
      </ul>

      <h2 id="data">2. What we collect</h2>
      <ul>
        <li><strong>Account details</strong> — name, email address, password (stored only in hashed form by Firebase Authentication), profile photo if you add one, and, if you sign in with Google, your Google name, email and photo.</li>
        <li><strong>Your activity in Kumami</strong> — your chosen mode (Beginner / Advanced / Pro), course and lesson progress, quiz results and notes, watchlists, followed items and alerts, and the Pro tools&apos; saved settings.</li>
        <li><strong>Kuma AI chats</strong> — the messages you send to Kuma and its replies, so your chat history is there next time.</li>
        <li><strong>Wallets and portfolios</strong> — public wallet addresses you add to the Address Tracker, and the holdings you enter or scan in the portfolio tools. We never ask for, and you should never share, private keys or seed phrases.</li>
        <li><strong>Payments and subscription</strong> — your plan, payment status, renewal date and payment history. Card details are collected and held by Stripe; we never see or store your full card number. For crypto payments, NOWPayments processes the transaction.</li>
        <li><strong>Referrals</strong> — your referral code, who referred you, and referral rewards and balance.</li>
        <li><strong>Technical data</strong> — IP address, device and browser type and log data that our hosting provider records to keep the service secure and working; and, only if you accept analytics cookies, usage statistics (see section 6).</li>
      </ul>

      <h2 id="use">3. Why we use it (and our legal basis)</h2>
      <ul>
        <li><strong>To provide Kumami</strong> — your account, courses, tools, Kuma and Pro features (performance of our contract with you).</li>
        <li><strong>To take payments and manage subscriptions and referrals</strong> (contract; and legal obligations such as tax and accounting records).</li>
        <li><strong>To keep Kumami secure</strong> — preventing fraud and abuse, and fixing problems (our legitimate interests).</li>
        <li><strong>To understand and improve Kumami</strong> with analytics (your consent, which you can withdraw at any time).</li>
        <li><strong>To email you</strong> about your account, for example verification, password resets and payment receipts (contract). We will only send marketing emails if you opt in, and every one will include a way to unsubscribe.</li>
      </ul>

      <h2 id="ai">4. Kuma and other AI features</h2>
      <p>
        When you chat with Kuma or run an AI Portfolio Scan, your message (and the portfolio you ask about) is sent
        through our automation server to Google&apos;s Gemini AI model to produce a reply. Please don&apos;t put
        sensitive personal information in chats. AI answers can be wrong; they are general information, not
        financial advice.
      </p>

      <h2 id="share">5. Who we share it with</h2>
      <p>
        We share personal data only with the service providers who run parts of Kumami for us, under contracts that
        require them to protect it, and only as needed for the purposes above:
      </p>
      <div className="k-legal-table-wrap">
        <table>
          <thead>
            <tr><th>Provider</th><th>What for</th><th>Data</th></tr>
          </thead>
          <tbody>
            {PROCESSORS.map((p) => (
              <tr key={p.name}><td>{p.name}</td><td>{p.purpose}</td><td>{p.data}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        We may also disclose data if the law requires it, to protect the rights and safety of our users or of
        Kumami, or as part of a merger or sale of the business (in which case this policy will continue to apply).
        We do not sell or rent your personal data, and we do not share it for cross-context behavioural advertising.
      </p>

      <h2 id="cookies">6. Cookies and local storage</h2>
      <p>We use two kinds:</p>
      <ul>
        <li>
          <strong>Strictly necessary</strong> — keep you signed in (Firebase Authentication), remember your mode and
          layout, remember your cookie choice, and send you back to the right page after signing up. These are
          needed for Kumami to work, so they don&apos;t need consent.
        </li>
        <li>
          <strong>Analytics (optional)</strong> — Google Analytics for Firebase cookies (<code>_ga</code>,{' '}
          <code>_ga_*</code>) that tell us which pages are used. They are only set after you click &quot;Accept
          analytics&quot;, and are removed if you change your mind.
        </li>
      </ul>
      <p>
        You can change your choice at any time: <CookieSettingsLink />.
      </p>

      <h2 id="transfers">7. International transfers</h2>
      <p>
        Our providers may store or process data in the United States and other countries. Where data protection law
        requires it, these transfers are covered by safeguards such as the European Commission&apos;s Standard
        Contractual Clauses or the provider&apos;s certification under the EU–US Data Privacy Framework.
      </p>

      <h2 id="retention">8. How long we keep it</h2>
      <ul>
        <li>Account, progress and tool data: for as long as you have an account. When you ask us to delete your account, we delete it within 30 days.</li>
        <li>Payment and invoice records: as long as tax and accounting law requires (usually up to 7 years), even after your account is deleted.</li>
        <li>Server and security logs: kept for a limited time and then deleted.</li>
        <li>Analytics data: kept by Google Analytics for at most 14 months.</li>
      </ul>

      <h2 id="rights">9. Your rights</h2>
      <p>
        Depending on where you live (for example under the GDPR in the EU/UK or the CCPA/CPRA in California), you have
        the right to:
      </p>
      <ul>
        <li>access the personal data we hold about you and get a copy of it (portability);</li>
        <li>correct data that is wrong — you can change your name in your Profile;</li>
        <li>have your data deleted;</li>
        <li>object to or restrict how we use it;</li>
        <li>withdraw consent (for example to analytics cookies) at any time;</li>
        <li>not be treated differently for using these rights;</li>
        <li>complain to your local data protection authority.</li>
      </ul>
      <p>
        To use any of these rights, email <strong>{LEGAL_ENTITY.email}</strong> from the address on your account. We
        will reply within 30 days and may need to confirm it&apos;s you first.
      </p>

      <h2 id="security">10. Security</h2>
      <p>
        We use industry-standard measures: encrypted connections (HTTPS), access rules that let each user read and
        write only their own data, hashed passwords and limited staff access. No system is perfectly secure; if a
        breach affects your data we will tell you and the authorities where the law requires.
      </p>

      <h2 id="children">11. Children</h2>
      <p>
        Kumami is not meant for children. You must be at least 18 years old (or the age of majority where you live)
        to create an account. We do not knowingly collect data from children; if you believe a child has given us
        personal data, contact us and we will delete it.
      </p>

      <h2 id="changes">12. Changes to this policy</h2>
      <p>
        We may update this policy. We will change the &quot;Last updated&quot; date above and, for important changes,
        tell you in the app or by email before they take effect.
      </p>

      <h2 id="contact">13. Contact</h2>
      <p>
        {LEGAL_ENTITY.name}, {LEGAL_ENTITY.country} — <strong>{LEGAL_ENTITY.email}</strong>. See also our{' '}
        <Link href="/terms">Terms of Service</Link>.
      </p>
    </article>
  );
}
