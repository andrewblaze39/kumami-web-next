import Link from 'next/link';
import { PLANS, formatUsd } from '@/lib/billing/plans';
import { LEGAL_ENTITY } from './entity';
import './legal.css';

/**
 * The Terms of Service. Kept in code (it used to be markdown in Firestore
 * app_config/terms_and_conditions, with no editor), so every change is reviewed
 * and versioned, like the Privacy Policy. Written from what the code actually
 * does: billing (src/lib/billing), referrals, Kuma, account deletion. Andrew's
 * decisions of 14 Oct 2026: 18+, no refunds once a period has started,
 * referral rules, sanctions, copyright contact. Update TERMS_LAST_UPDATED on
 * every change. Not legal advice — a lawyer should review before main.
 */
export const TERMS_LAST_UPDATED = '14 October 2026';

const { monthly, yearly } = PLANS;

export default function TermsContent() {
  const email = <strong>{LEGAL_ENTITY.email}</strong>;
  return (
    <article className="k-legal">
      <h1>Terms of Service</h1>
      <p className="k-legal-updated">Last updated: {TERMS_LAST_UPDATED}</p>

      <p>
        These Terms are an agreement between you and {LEGAL_ENTITY.name}, {LEGAL_ENTITY.country}{' '}(&quot;Kumami&quot;,
        &quot;we&quot;, &quot;us&quot;), which runs Kumami World on kumami.world and in the Kumami apps (the
        &quot;Service&quot;). By creating an account or using the Service you agree to these Terms and to our{' '}
        <Link href="/privacy">Privacy Policy</Link>. If you don&apos;t agree, please don&apos;t use the Service.
      </p>

      <h2 id="eligibility">1. Who can use Kumami</h2>
      <ul>
        <li>You must be at least <strong>18 years old</strong> (or the age of majority where you live, if that is higher).</li>
        <li>You must be allowed to use the Service under the laws that apply to you, and not be barred by the sanctions rules in section 7.</li>
        <li>The information you give us, such as your name and email, must be accurate.</li>
      </ul>

      <h2 id="account">2. Your account</h2>
      <ul>
        <li>Keep your password safe. You are responsible for what happens under your account.</li>
        <li>One person, one account. Don&apos;t share, sell or transfer your account.</li>
        <li>Tell us straight away at {email} if you think someone else has used your account.</li>
        <li>You can delete your account at any time in Profile → Delete my account.</li>
      </ul>

      <h2 id="advice">3. Not financial advice</h2>
      <p>
        Kumami is an education and information service. Nothing on Kumami — courses, news, research, market data,
        signals, Alpha Room calls, Pro tools or Kuma&apos;s answers — is financial, investment, legal or tax advice, or
        a recommendation to buy, sell or hold any asset. Crypto assets are highly risky and you can lose all the money
        you put in. Make your own decisions, and talk to a licensed adviser if you need advice. Market data comes from
        third parties and may be delayed or wrong.
      </p>

      <h2 id="ai">4. Kuma and other AI features</h2>
      <ul>
        <li>Kuma and the AI Portfolio Scan are made with an AI model. Their answers can be wrong, out of date or incomplete. Check anything important before you rely on it.</li>
        <li>AI answers are general information only; section 3 applies to them in full.</li>
        <li>Don&apos;t put private keys, seed phrases, passwords or other sensitive personal information in chats. Kumami will never ask for them.</li>
        <li>Don&apos;t use the AI features to break the law or these Terms, or to try to make them produce harmful content.</li>
      </ul>

      <h2 id="pro">5. Kumami Pro, payments and auto-renewal</h2>
      <ul>
        <li>
          Kumami Pro costs {formatUsd(monthly.priceCents)} for {monthly.days} days (Monthly) or{' '}
          {formatUsd(yearly.priceCents)} for {yearly.days} days (Yearly), in US dollars, plus any taxes shown at
          checkout. We may change prices; a change applies from your next renewal and we will tell you before it does.
        </li>
        <li>
          <strong>Card payments renew automatically.</strong> Card subscriptions are handled by Stripe and are charged
          again at the start of each period until you cancel. You can cancel at any time online in Profile →
          Subscription. When you cancel, you keep Pro until the end of the period you have paid for, and you are not
          charged again.
        </li>
        <li>
          <strong>Crypto payments don&apos;t renew.</strong> Crypto payments are handled by NOWPayments. Each payment
          is a one-time payment for {monthly.days} or {yearly.days}{' '}days of Pro, added to any Pro time you already have.
          Pro starts once the full amount is confirmed. A payment that is short, or sent in a way the payment page
          didn&apos;t ask for, may not activate Pro; contact us and we will help, but network fees and exchange-rate
          changes are your responsibility.
        </li>
        <li>If a card renewal fails, Stripe will retry for a few days. If it still fails, Pro ends.</li>
      </ul>

      <h2 id="refunds">6. Refunds</h2>
      <ul>
        <li>
          When you pay, you ask us to start your Pro access straight away. <strong>Once a paid period has started we
          don&apos;t give refunds</strong>, whole or partial, for that period — including when you cancel part-way
          through or stop using the Service. Cancelling stops the next renewal.
        </li>
        <li>
          If you live in the EU, the UK or another place that gives consumers a right to withdraw from online
          purchases, you agree that Pro starts immediately and you understand that you lose that right once it has
          started, as far as the law allows.
        </li>
        <li>
          This doesn&apos;t limit any rights you have by law that can&apos;t be waived — for example if you were
          charged twice or charged by mistake, or the Service didn&apos;t work as described. Contact us at {email}{' '}
          and we will put it right.
        </li>
        <li>
          If a payment is refunded or reversed (including a card chargeback), the Pro time it paid for, and any referral
          reward from it, are removed.
        </li>
      </ul>

      <h2 id="sanctions">7. Sanctions</h2>
      <p>
        You may not use the Service, or buy Kumami Pro, if you are located in, or ordinarily resident in, a country or
        region under comprehensive sanctions (by the United Nations, the United States, the European Union or the
        United Kingdom), or if you are on a sanctions list, or act for someone who is. Our payment providers screen
        payments, and we may refuse or cancel a payment or account where these rules apply.
      </p>

      <h2 id="referrals">8. Referral program</h2>
      <ul>
        <li>Every account gets a personal referral code. When someone signs up and makes their first Pro payment with your code, you <strong>both</strong> get a reward credit: {formatUsd(monthly.referralRewardCents)} for a Monthly payment or {formatUsd(yearly.referralRewardCents)} for a Yearly one.</li>
        <li>A reward is given only once per new user, on their first paid payment. There is no limit on how many people you refer.</li>
        <li>You can&apos;t use your own code, refer yourself through another account, or create accounts, payments or referrals just to earn rewards. If a referred payment is refunded or charged back, both rewards are removed.</li>
        <li>Reward credit has no cash value and can&apos;t be transferred or exchanged for now. We plan to add withdrawals later, under rules we will publish first. Credit doesn&apos;t expire while the program runs.</li>
        <li>If you promote your code — for example on social media — you must make clear that you get a reward when people use it, and you must not make misleading claims about Kumami or spam people.</li>
        <li>We may remove rewards earned by breaking these rules, and may change or end the program at any time. If we end it, we will give notice and explain what happens to existing credit.</li>
      </ul>

      <h2 id="conduct">9. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>break any law, or use the Service for fraud, market manipulation or money laundering;</li>
        <li>copy, resell, scrape or redistribute Kumami content or Pro data (for example Alpha Room calls, signals or research), or share Pro access with people who haven&apos;t paid;</li>
        <li>hack, overload, probe or reverse-engineer the Service, or get around its access limits;</li>
        <li>impersonate anyone, or upload anything unlawful, harmful, infringing or offensive.</li>
      </ul>

      <h2 id="ip">10. Content and intellectual property</h2>
      <ul>
        <li>Kumami&apos;s content, design, software and brand belong to us or our licensors. We give you a personal, non-transferable right to use them through the Service for your own learning, and nothing more.</li>
        <li>Anything you add to Kumami (such as your profile, notes or watchlists) stays yours. You give us permission to store and process it only to run the Service for you.</li>
      </ul>

      <h2 id="copyright">11. Copyright complaints</h2>
      <p>
        If you believe something on Kumami infringes your copyright, email {email} with: your contact details, the work
        you own, the link to the material on Kumami, a statement that you believe in good faith that the use is not
        authorised, and a statement that your notice is accurate and that you are the owner or authorised to act for
        the owner, with your signature (typing your full name is enough). We will review it promptly and remove
        material that infringes. We may close the accounts of people who repeatedly infringe.
      </p>

      <h2 id="termination">12. Suspension and ending your account</h2>
      <ul>
        <li>You can stop using Kumami and delete your account at any time. Deleting your account cancels a card subscription straight away, without a refund for the rest of the period.</li>
        <li>We may suspend or close your account if you seriously or repeatedly break these Terms, if the law requires it, or to protect other users or the Service. Where reasonable we will tell you why first. If we close your account without you having broken these Terms, we will refund the unused part of any paid period.</li>
      </ul>

      <h2 id="disclaimer">13. The Service is provided &quot;as is&quot;</h2>
      <p>
        We work hard to keep Kumami accurate and available, but we provide it &quot;as is&quot; and &quot;as
        available&quot;, without promises that it will always work, be error-free, or that any content or data is
        complete or correct, as far as the law allows. Features may change, and we may add or remove them.
      </p>

      <h2 id="liability">14. Limits on our liability</h2>
      <ul>
        <li>As far as the law allows, we are not liable for trading or investment losses, lost profits, lost data, or indirect or consequential losses arising from your use of the Service.</li>
        <li>As far as the law allows, our total liability to you for any claim is limited to the amount you paid us in the 12 months before the claim.</li>
        <li>Nothing in these Terms limits liability that can&apos;t be limited by law, such as for fraud, or for death or personal injury caused by negligence, or your statutory consumer rights.</li>
      </ul>

      <h2 id="law">15. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of {LEGAL_ENTITY.country}, and its courts deal with disputes. If you are a
        consumer, you also keep the protection of the mandatory laws of the country you live in and can bring a claim
        in its courts. Please contact us first at {email} — most problems can be sorted out quickly.
      </p>

      <h2 id="changes">16. Changes to these Terms</h2>
      <p>
        We may update these Terms. We will change the &quot;Last updated&quot; date above and, for important changes,
        tell you in the app or by email before they take effect. If you keep using Kumami after that, the new Terms
        apply; if you don&apos;t agree, you can cancel and delete your account.
      </p>

      <h2 id="contact">17. Contact</h2>
      <p>
        {LEGAL_ENTITY.name}, {LEGAL_ENTITY.country} — {email}. See also our{' '}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </article>
  );
}
