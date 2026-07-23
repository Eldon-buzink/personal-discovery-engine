// ⚠ AI-DRAFTED, NOT REVIEWED BY A LAWYER.
// Written from a direct grep of this codebase (Stripe checkout config, webhook
// handler, refund policy as confirmed by the user: case-by-case, at Bearing's
// discretion, via support@bearing.me) so the factual claims match what the
// product actually does as of the date in LAST_UPDATED. It has NOT been
// reviewed by counsel, and contains placeholder fields (legal entity name,
// governing jurisdiction) that must be filled in before this is legally
// binding. Do not treat this as ready to ship — see the visible banner on the
// page itself.

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

export default function TermsPage() {
  return (
    <div style={{ background: cream, color: charcoal, fontFamily: sans, minHeight: '100vh' }}>
      <section style={{ padding: '140px 48px 24px', maxWidth: 640, margin: '0 auto' }}>
        <div style={{
          border: '1.5px solid rgba(200,80,50,0.4)', background: 'rgba(200,80,50,0.06)',
          borderRadius: 10, padding: '16px 20px', marginBottom: 40,
        }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: charcoal, fontWeight: 500, margin: 0 }}>
            Draft — not legal advice. This page was AI-drafted from the actual codebase
            and your stated refund policy, but has not been reviewed by a lawyer, and
            still has placeholder fields (legal entity name, governing jurisdiction)
            marked <span style={placeholder}>like this</span>. Do not publish this as
            final without review.
          </p>
        </div>

        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: c40, marginBottom: 20 }}>
          Terms of Service
        </p>
        <h1 style={{ fontFamily: serif, fontSize: 42, fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.15, color: charcoal, marginBottom: 12 }}>
          Terms.
        </h1>
        <p style={{ fontSize: 13, color: c40, marginBottom: 32 }}>Last updated: {LAST_UPDATED}</p>

        <p style={pStyle}>
          These Terms of Service govern your use of Bearing (getbearing.me), operated by{' '}
          <span style={placeholder}>[LEGAL ENTITY NAME]</span> (&quot;we,&quot;
          &quot;us&quot;). By using Bearing, you agree to these terms.
        </p>

        <Section title="What Bearing is">
          <p style={pStyle}>
            Bearing is a self-reflection tool that generates a personality report from
            your answers to an assessment built on established research models (including
            the IPIP-NEO-120 and the ECR-R attachment-style framework).
          </p>
          <p style={pStyle}>
            Bearing is intended for self-reflection and personal insight. It is{' '}
            <strong>not</strong> a medical, psychological, or clinical diagnostic tool, and
            is not a substitute for professional advice, therapy, or treatment. If
            you&apos;re dealing with a mental health concern, please consult a qualified
            professional.
          </p>
        </Section>

        <Section title="Accounts">
          <p style={pStyle}>
            You sign in with your email address using a passwordless &quot;magic
            link&quot; — there is no separate password to manage. You&apos;re responsible
            for keeping access to that email address secure, since it&apos;s how your
            account is authenticated.
          </p>
        </Section>

        <Section title="Payment">
          <p style={pStyle}>
            The full report unlock is a <strong>one-time payment of €49</strong> — not a
            subscription, and you will not be charged again automatically. Payment is
            processed by Stripe; we never see or store your card or bank details directly.
          </p>
        </Section>

        <Section title="Refunds">
          <p style={pStyle}>
            Refunds are handled case-by-case, at our discretion. If you&apos;re unhappy
            with your purchase, email{' '}
            <a href="mailto:support@bearing.me" style={{ color: charcoal }}>support@bearing.me</a>{' '}
            and we&apos;ll take a look.
          </p>
        </Section>

        <Section title="Acceptable use">
          <ul style={{ paddingLeft: 20, marginBottom: 14 }}>
            <li style={liStyle}>Don&apos;t use Bearing for any unlawful purpose.</li>
            <li style={liStyle}>Don&apos;t attempt to access other users&apos; accounts or data.</li>
            <li style={liStyle}>Don&apos;t attempt to disrupt, reverse-engineer, or abuse the service.</li>
          </ul>
        </Section>

        <Section title="Intellectual property">
          <p style={pStyle}>
            The Bearing product, its design, and its underlying assessment methodology
            belong to us. The report generated <em>for you</em>, based on your own
            answers, is yours to keep and use personally.{' '}
            <span style={placeholder}>[Confirm exact ownership/license language with a
            lawyer if you want to restrict resale/redistribution of report content.]</span>
          </p>
        </Section>

        <Section title="Disclaimer of warranties">
          <p style={pStyle}>
            Bearing is provided &quot;as is,&quot; without warranties of any kind. We
            don&apos;t guarantee the assessment or report will be accurate, complete, or
            suited to your particular situation.{' '}
            <span style={placeholder}>[Standard warranty-disclaimer and
            limitation-of-liability boilerplate should be reviewed and finalized by a
            lawyer — the exact enforceable language varies by jurisdiction.]</span>
          </p>
        </Section>

        <Section title="Governing law">
          <p style={pStyle}>
            These terms are governed by the laws of{' '}
            <span style={placeholder}>[JURISDICTION]</span>.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p style={pStyle}>
            We may update these terms as the product changes. We&apos;ll update the
            &quot;Last updated&quot; date above when we do.
          </p>
        </Section>

        <Section title="Contact">
          <p style={{ ...pStyle, marginBottom: 60 }}>
            Questions about these terms? Email{' '}
            <a href="mailto:support@bearing.me" style={{ color: charcoal }}>support@bearing.me</a>.
          </p>
        </Section>
      </section>
    </div>
  )
}
