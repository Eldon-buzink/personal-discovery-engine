// Written from the codebase: what is stored (Supabase tables), what each
// provider receives (app/actions, lib/ads, lib/server), the cookies set
// (lib/consent.ts, lib/server/anonymousVisitor.ts, lib/server/entitlement.ts)
// and the retention jobs (app/api/cron/saved-progress). Keep it in step when
// any of those change, and move LAST_UPDATED.
// Who runs Bearing comes from lib/legal.ts.

import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import { LEGAL, operatorSentence } from '@/lib/legal'
import { LegalPage, LegalSection } from '@/components/known/LegalPage'
import ConsentSettingsLink from '@/components/known/ConsentSettingsLink'

export const metadata = buildMetadata({
  path: '/privacy',
  title: 'Privacy Policy — Bearing',
  description: 'What Bearing stores, why, who processes it, how long it is kept, and your rights.',
})

const LAST_UPDATED = 'October 20, 2026'
const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated={LAST_UPDATED}
      intro={
        <>
          <p>
            {operatorSentence()} We are responsible for the personal data described here (the &quot;controller&quot;,
            in GDPR terms). You can reach us at {mail}.
          </p>
          <p>
            Bearing is a self-reflection product built around a personality assessment. This policy explains what we
            store, why, who helps us run the product, how long we keep things, and what you can do about it.
          </p>
        </>
      }
    >
      <LegalSection title="What we store">
        <ul>
          <li>
            <strong>Your answers.</strong> Your answers to the assessment and the short checks, so we can work out
            your results and show your report. You can answer without an account; if you sign in later, your
            answers are linked to it.
          </li>
          <li>
            <strong>Saved progress.</strong> If you choose &quot;Finish later&quot; and leave your email, we save your
            answers so far together with that email, so the link we send can take you back to the same question on
            any device. While you keep answering, the saved copy is kept up to date.
          </li>
          <li>
            <strong>Your account.</strong> Your email address. You sign in with a link we email you; there is no
            password.
          </li>
          <li>
            <strong>Your report.</strong> The written descriptions in your report, made from your results and stored
            so your report stays the same each time you open it.
          </li>
          <li>
            <strong>Your practice.</strong> The traits you choose to follow, your daily check-ins, and any notes you
            add to them.
          </li>
          <li>
            <strong>Payment.</strong> Whether you have paid, and when. Stripe handles the payment itself; we never see
            your card or bank details.
          </li>
          <li>
            <strong>Abuse protection.</strong> To limit how often some actions can be repeated, we keep short-lived
            counters keyed to a scrambled (hashed) version of your account or IP address.
          </li>
        </ul>
        <p>
          We treat your answers as sensitive. They describe how you see yourself, not a diagnosis, and we never use
          them for advertising.
        </p>
      </LegalSection>

      <LegalSection title="Why we use it">
        <ul>
          <li>
            <strong>To provide Bearing to you:</strong> working out your results, showing your report and practice,
            signing you in, and taking payment. This is needed to do what you ask of us (performance of a contract).
          </li>
          <li>
            <strong>To save your progress:</strong> keeping your answers with your email, sending you the link back,
            and one reminder about a day later if you haven&apos;t finished. You ask for this by leaving your email;
            we use that email for nothing else and send only that one reminder.
          </li>
          <li>
            <strong>To measure our ads,</strong> only if you say yes (consent). See &quot;Ads and cookies&quot; below.
          </li>
          <li>
            <strong>To keep Bearing safe and working:</strong> preventing abuse and fixing problems (our legitimate
            interest).
          </li>
          <li>
            <strong>To answer you</strong> when you contact us, and to keep records the law requires, such as for
            payments.
          </li>
        </ul>
        <p>We don&apos;t sell your data, and we don&apos;t share your answers with advertisers or data brokers.</p>
      </LegalSection>

      <LegalSection title="Ads and cookies">
        <p>
          We don&apos;t use analytics tools. We do use ad measurement to see which ads bring people to Bearing, but
          only if you choose &quot;Allow&quot; when we ask. Without your yes, none of it runs.
        </p>
        <p>With your yes:</p>
        <ul>
          <li>
            <strong>Meta (Facebook, Instagram):</strong> the Meta Pixel in your browser notes page visits and when
            you start the assessment. It never runs on the blog, the quick checks, your report or your practice.
            When you buy, our server tells Meta about the purchase, with your email in scrambled (hashed) form, your
            IP address, your browser type, and Meta&apos;s own cookies.
          </li>
          <li>
            <strong>Pinterest:</strong> when you start the assessment, our server tells Pinterest, with a scrambled
            (hashed) random visitor id, your IP address and your browser type.
          </li>
        </ul>
        <p>Cookies we use:</p>
        <ul>
          <li><strong>bearing_consent:</strong> remembers your answer about ad measurement, for about 6 months.</li>
          <li><strong>bearing_anon:</strong> a random id for this browser, so your answers stay together before you sign in.</li>
          <li><strong>bearing_pending_session:</strong> remembers which saved progress belongs to this browser, for up to a week.</li>
          <li><strong>bearing_free_reveals:</strong> remembers which free traits this browser has already opened.</li>
          <li><strong>Sign-in cookies</strong> (from Supabase): keep you signed in.</li>
          <li><strong>Meta&apos;s _fbp and _fbc:</strong> only if you allowed ad measurement.</li>
          <li><strong>Stripe</strong> sets its own cookies during checkout, to process the payment and prevent fraud.</li>
        </ul>
        <p>
          You can change your answer any time: <ConsentSettingsLink style={{ color: '#262420', textDecoration: 'underline', textUnderlineOffset: 3, font: 'inherit' }} />.
        </p>
      </LegalSection>

      <LegalSection title="Who helps us run Bearing">
        <p>These companies process data for us, under their own agreements with us:</p>
        <ul>
          <li><strong>Supabase:</strong> our database and sign-in.</li>
          <li><strong>Vercel:</strong> hosts the website.</li>
          <li>
            <strong>Resend:</strong> sends our emails (sign-in and saved-progress links, the one reminder, and the
            code to confirm deleting your account). It receives your email address and the email&apos;s content.
          </li>
          <li><strong>Stripe:</strong> takes the one-time payment and stores your payment details itself.</li>
          <li>
            <strong>Anthropic</strong> (Claude): writes the short descriptions in your report. For each trait we send
            the trait name, whether your answers leaned high, low or in the middle, and up to two of your answers on
            that trait. We never send your name, email, account or session ids, or your IP address. For some
            sensitive traits (currently low mood) we send no answers at all. See{' '}
            <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noreferrer">Anthropic&apos;s privacy policy</a>.
          </li>
          <li><strong>Meta and Pinterest:</strong> ad measurement, only with your yes (see above).</li>
        </ul>
        <p>
          Some of these companies are based in, or process data in, the United States. Where data leaves the EU,
          they rely on the safeguards EU law provides for that, such as the EU&apos;s Standard Contractual Clauses
          or the EU-U.S. Data Privacy Framework.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <ul>
          <li>
            <strong>Saved progress</strong> you haven&apos;t finished, and haven&apos;t come back to through the link,
            is deleted automatically 30 days after your last answer.
          </li>
          <li>
            <strong>Your account,</strong> answers, report and practice are kept until you delete your account.
          </li>
          <li>
            <strong>Payment records</strong> are kept by Stripe for as long as tax and accounting law requires.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>You can:</p>
        <ul>
          <li>
            <strong>Download</strong> everything we store for your account, and <strong>delete your account</strong>{' '}
            and everything in it, yourself, on your <Link href="/account">account page</Link>.
          </li>
          <li>Ask us to correct or limit what we hold, or object to how we use it.</li>
          <li>Withdraw your yes to ad measurement at any time, through Cookie settings.</li>
        </ul>
        <p>
          For anything else, email {mail}. We&apos;ll answer within a month. You can also complain to the Dutch data
          protection authority, the{' '}
          <a href="https://www.autoriteitpersoonsgegevens.nl" target="_blank" rel="noreferrer">Autoriteit Persoonsgegevens</a>,
          or the one where you live.
        </p>
      </LegalSection>

      <LegalSection title="Age">
        <p>
          Bearing is for people aged {LEGAL.minimumAge} and over. We don&apos;t knowingly collect data from anyone
          younger. If you think someone under {LEGAL.minimumAge} has used Bearing, email us and we&apos;ll delete
          their data.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          Your data is stored with access controls: only your own account can read your answers and report, and only
          our payment system can mark an account as paid. No system is perfectly secure, but we work to keep yours
          safe and will tell you if something goes wrong that affects you.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          When Bearing changes in a way that affects this policy, we update it and the date at the top. If a change
          matters for how we use your data, we&apos;ll tell you before it applies.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>Questions about this policy, or about your data? Email {mail}.</p>
      </LegalSection>
    </LegalPage>
  )
}
