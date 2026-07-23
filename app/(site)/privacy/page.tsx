// ⚠ AI-DRAFTED, NOT REVIEWED BY A LAWYER.
// Written from a direct grep of this codebase (Supabase schema, Stripe webhook,
// Anthropic API usage) so the factual claims below match what the product
// actually does as of the date in LAST_UPDATED. It has NOT been reviewed by
// counsel, and contains placeholder fields (legal entity name, business
// address, governing jurisdiction) that must be filled in before this is
// legally binding. Do not treat this as ready to ship — see the visible
// banner on the page itself.

import type { CSSProperties, ReactNode } from 'react'

const cream    = '#F5F2EB'
const charcoal = '#1C1C1A'
const c40      = 'rgba(28,28,26,0.4)'
const c80      = 'rgba(28,28,26,0.8)'
const sans     = 'var(--font-inter), system-ui, sans-serif'
const serif    = 'var(--font-newsreader), Georgia, serif'

const LAST_UPDATED = 'July 23, 2026'

const h2Style: CSSProperties = {
  fontFamily: serif, fontSize: 22, fontWeight: 500, color: charcoal,
  marginTop: 40, marginBottom: 12, letterSpacing: '-0.01em',
}
const pStyle: CSSProperties = {
  fontSize: 15, lineHeight: 1.7, color: c80, fontWeight: 300, marginBottom: 14,
}
const liStyle: CSSProperties = {
  fontSize: 15, lineHeight: 1.7, color: c80, fontWeight: 300, marginBottom: 8,
}
const placeholder: CSSProperties = {
  background: 'rgba(200,80,50,0.12)', padding: '1px 6px', borderRadius: 4,
  fontFamily: 'monospace', fontSize: 14,
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 style={h2Style}>{title}</h2>
      {children}
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div style={{ background: cream, color: charcoal, fontFamily: sans, minHeight: '100vh' }}>
      <section style={{ padding: '140px 48px 24px', maxWidth: 640, margin: '0 auto' }}>
        <div style={{
          border: '1.5px solid rgba(200,80,50,0.4)', background: 'rgba(200,80,50,0.06)',
          borderRadius: 10, padding: '16px 20px', marginBottom: 40,
        }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: charcoal, fontWeight: 500, margin: 0 }}>
            Draft — not legal advice. This page was AI-drafted from the actual codebase
            (what data is collected, where it&apos;s stored, which third parties process it)
            but has not been reviewed by a lawyer, and still has placeholder fields
            (legal entity name, business address, governing jurisdiction) marked{' '}
            <span style={placeholder}>like this</span>. Do not publish this as final
            without review.
          </p>
        </div>

        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: c40, marginBottom: 20 }}>
          Privacy Policy
        </p>
        <h1 style={{ fontFamily: serif, fontSize: 42, fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.15, color: charcoal, marginBottom: 12 }}>
          Privacy.
        </h1>
        <p style={{ fontSize: 13, color: c40, marginBottom: 32 }}>Last updated: {LAST_UPDATED}</p>

        <p style={pStyle}>
          Bearing (<span style={placeholder}>[LEGAL ENTITY NAME]</span>, &quot;we,&quot;
          &quot;us&quot;) operates getbearing.me, a self-reflection product built around a
          personality assessment (based on established research models, including the
          IPIP-NEO-120 and ECR-R attachment-style framework). This policy describes what
          information we collect, how we use it, who we share it with, and the choices
          you have.
        </p>

        <Section title="Information we collect">
          <p style={pStyle}>We collect the following categories of information:</p>
          <ul style={{ paddingLeft: 20, marginBottom: 14 }}>
            <li style={liStyle}>
              <strong>Assessment responses.</strong> Your answers to the assessment
              questions, stored so your report can be generated and revisited. These are
              initially recorded without requiring an account; if you later sign in, they
              are linked to your account.
            </li>
            <li style={liStyle}>
              <strong>Account information.</strong> Your email address, collected when you
              sign in via a passwordless &quot;magic link&quot; email. We do not collect or
              store passwords.
            </li>
            <li style={liStyle}>
              <strong>Payment information.</strong> If you unlock the full report (a
              one-time €49 payment), payment is handled entirely by Stripe. We never
              receive or store your card number or bank details — we only receive
              confirmation that payment succeeded.
            </li>
            <li style={liStyle}>
              <strong>Generated report content.</strong> The written descriptions in your
              report, generated from your assessment results and stored so your report
              persists across visits.
            </li>
          </ul>
          <p style={pStyle}>
            We do not use analytics, advertising, or tracking scripts of any kind — there
            is no Google Analytics, ad pixel, or similar tool anywhere in the product as
            of {LAST_UPDATED}.
          </p>
        </Section>

        <Section title="How we use your information">
          <ul style={{ paddingLeft: 20, marginBottom: 14 }}>
            <li style={liStyle}>To generate and display your personality report.</li>
            <li style={liStyle}>To authenticate you and keep your report tied to your account.</li>
            <li style={liStyle}>To process payment for the full report unlock.</li>
            <li style={liStyle}>To respond if you contact us for support.</li>
          </ul>
          <p style={pStyle}>
            We do not sell your data, and we do not use your assessment responses for
            advertising or share them with data brokers.
          </p>
        </Section>

        <Section title="Third parties who process your data">
          <p style={pStyle}>We rely on the following processors to run the product:</p>
          <ul style={{ paddingLeft: 20, marginBottom: 14 }}>
            <li style={liStyle}>
              <strong>Supabase</strong> — hosts our database (your assessment responses,
              account record, and payment status) and handles magic-link authentication
              (sending sign-in emails, verifying your session).
            </li>
            <li style={liStyle}>
              <strong>Stripe</strong> — processes the one-time €49 payment. Stripe
              collects and stores your payment details directly; we never see or store
              your card or bank account number.
            </li>
            <li style={liStyle}>
              <strong>Anthropic</strong> (Claude API) — generates the written narrative in
              your report. We send Anthropic your <em>derived</em> trait scores (e.g. a
              trait name and a high/mid/low direction) — not your literal question-by-
              question answers, and not your name or email.
            </li>
          </ul>
          <p style={pStyle}>
            Each of these processors has its own privacy policy governing how it handles
            data on our behalf. Where any of these providers store or process data outside
            your country of residence, standard contractual safeguards should apply —{' '}
            <span style={placeholder}>confirm the specifics of each provider&apos;s
            data-transfer terms with a lawyer</span> before relying on this statement.
          </p>
        </Section>

        <Section title="Data retention">
          <p style={pStyle}>
            We currently retain assessment responses, report content, and account records
            indefinitely, for as long as your account exists — there is no automatic
            deletion schedule. <span style={placeholder}>[Confirm whether this is the
            retention policy you want, or whether a fixed retention/deletion schedule
            should be added.]</span>
          </p>
        </Section>

        <Section title="Your rights">
          <p style={pStyle}>
            You can request access to, correction of, or deletion of your data at any time
            by emailing{' '}
            <a href="mailto:support@bearing.me" style={{ color: charcoal }}>support@bearing.me</a>.
            Deletion requests are currently handled manually — there is no self-serve
            &quot;delete my account&quot; option in the product yet.
          </p>
          <p style={pStyle}>
            Depending on where you live, you may have additional rights under applicable
            law (for example, the GDPR if you&apos;re in the EU/EEA, or state privacy laws
            in the US). <span style={placeholder}>[A lawyer should confirm whether
            personality/assessment data of this kind is treated as a special/sensitive
            category under the laws that apply to your users, which would trigger
            additional obligations.]</span>
          </p>
        </Section>

        <Section title="Children's privacy">
          <p style={pStyle}>
            Bearing is not directed at children, and we do not knowingly collect
            information from anyone under 16. The product does not currently verify age.{' '}
            <span style={placeholder}>[Confirm minimum age and whether an age-gate is
            needed.]</span>
          </p>
        </Section>

        <Section title="Security">
          <p style={pStyle}>
            Your data is stored in Supabase&apos;s managed Postgres database with access
            controls restricting who can read or write it. Only your own account can read
            your own assessment/report data; only our payment-processing system can mark
            your account as paid. No method of storage or transmission is 100% secure, and
            we can&apos;t guarantee absolute security.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p style={pStyle}>
            We may update this policy as the product changes. We&apos;ll update the
            &quot;Last updated&quot; date above when we do.
          </p>
        </Section>

        <Section title="Contact">
          <p style={{ ...pStyle, marginBottom: 60 }}>
            Questions about this policy, or a request about your data? Email{' '}
            <a href="mailto:support@bearing.me" style={{ color: charcoal }}>support@bearing.me</a>.
          </p>
        </Section>
      </section>
    </div>
  )
}
