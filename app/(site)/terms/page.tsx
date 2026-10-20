// Terms of use, written to match the product as built (free tier, one-time
// payment in app/actions/createCheckoutSession.ts, sign-in by link, account
// deletion on /account) and Dutch consumer law (the 14-day right to cancel
// applies: checkout doesn't ask buyers to waive it). Keep it in step when
// any of those change, and move LAST_UPDATED.
// Who runs Bearing comes from lib/legal.ts.

import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import { LEGAL, operatorSentence } from '@/lib/legal'
import { LegalPage, LegalSection } from '@/components/known/LegalPage'

export const metadata = buildMetadata({
  path: '/terms',
  title: 'Terms of Use — Bearing',
  description: 'The terms for using Bearing: what it is, the free and paid parts, cancelling and refunds, and your rights.',
})

const LAST_UPDATED = 'October 20, 2026'
const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated={LAST_UPDATED}
      intro={
        <>
          <p>{operatorSentence()} You can reach us at {mail}.</p>
          <p>
            These terms apply when you use Bearing. By using it, you agree to them. Our{' '}
            <Link href="/privacy">privacy policy</Link> explains what we do with your data.
          </p>
        </>
      }
    >
      <LegalSection title="What Bearing is">
        <p>
          Bearing is a self-reflection tool. You answer a personality assessment (built on the public-domain
          IPIP-NEO-120) and get a report about your patterns, and you can follow chosen traits day to day in the
          practice.
        </p>
        <p>
          Bearing is for personal insight. It is <strong>not</strong> a medical or psychological test, it gives no
          diagnosis, and it is no substitute for professional help. If you&apos;re struggling, please talk to a
          doctor or a mental health professional.
        </p>
      </LegalSection>

      <LegalSection title="Who can use it">
        <p>
          You need to be {LEGAL.minimumAge} or older to use Bearing. If you&apos;re under 18, you need a
          parent&apos;s or guardian&apos;s permission to pay.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>
          You sign in with a link we email you; there is no password. Anyone who can open your email can sign in
          as you, so keep your email account secure. You can delete your account, and everything in it, at any time
          on your <Link href="/account">account page</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Free and paid">
        <p>
          The assessment and your first 5 patterns are free. A <strong>one-time payment of €49</strong> unlocks all
          30 facets and the deeper assessments. It is not a subscription, and you won&apos;t be charged again. The
          price you pay is the one shown at checkout. Stripe handles the payment.
        </p>
      </LegalSection>

      <LegalSection title="Cancelling and refunds">
        <p>
          You can cancel your purchase within 14 days of paying, without giving a reason, and get your money back.
          Email {mail} with the address you used, and we&apos;ll refund you within 14 days, the same way you paid.
        </p>
        <p>After those 14 days, we look at refund requests one by one. If something isn&apos;t right, tell us.</p>
      </LegalSection>

      <LegalSection title="The text in your report">
        <p>
          Your scores and trait words come straight from your answers. The short descriptions are written by an AI
          model from your results. We check how they&apos;re made, but they can still be off. Read them as a
          starting point for your own thinking, not as facts about you.
        </p>
      </LegalSection>

      <LegalSection title="Using Bearing fairly">
        <ul>
          <li>Don&apos;t use Bearing for anything unlawful.</li>
          <li>Don&apos;t try to get into other people&apos;s accounts or data.</li>
          <li>Don&apos;t try to disrupt, overload, copy or reverse-engineer the service.</li>
        </ul>
        <p>If someone breaks these rules, we may suspend or close their account.</p>
      </LegalSection>

      <LegalSection title="What belongs to whom">
        <p>
          Bearing, its design, its texts and its software belong to us. Your report is yours to keep, read and share
          for personal use. Your answers and notes stay yours.
        </p>
      </LegalSection>

      <LegalSection title="Keeping Bearing running">
        <p>
          We work to keep Bearing available and your data safe, but we can&apos;t promise it will always be online or
          free of mistakes. We may change, improve or stop parts of it. If we ever stop the paid part, we&apos;ll
          tell you in advance and you can download your data first.
        </p>
      </LegalSection>

      <LegalSection title="Liability">
        <p>
          Bearing is a self-reflection tool, and decisions you make with it are your own. We aren&apos;t liable for
          indirect loss, and our total liability to you is limited to the amount you paid us in the 12 months before
          the problem.
        </p>
        <p>
          This doesn&apos;t limit liability that the law doesn&apos;t allow us to limit, such as for intent or gross
          negligence, and it doesn&apos;t affect your rights as a consumer.
        </p>
      </LegalSection>

      <LegalSection title="Law and disputes">
        <p>
          Dutch law applies to these terms. If you live in another EU country, you keep the protection of that
          country&apos;s consumer law, and you can take a dispute to the courts where you live.
        </p>
        <p>If something goes wrong, please email {mail} first. Most things are quicker to sort out that way.</p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update these terms when Bearing changes. We&apos;ll change the date at the top, and tell you before a
          change that affects you applies.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>Questions about these terms? Email {mail}.</p>
      </LegalSection>
    </LegalPage>
  )
}
