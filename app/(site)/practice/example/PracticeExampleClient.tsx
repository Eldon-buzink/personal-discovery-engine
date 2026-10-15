'use client'

import Link from 'next/link'
import { CheckInScreen, HomeScreen, RecapScreen } from '../../landing/PracticePhoneScreens'
import { landingPracticeFixture } from '../../landing/landingPracticeFixture'

// /practice/example: the three practice screens at real phone size, filled
// with the landing page's example (Self-Discipline, four weeks of check-ins,
// dated against the current week). Every string comes from the same
// lib/known functions the practice pages use; see PracticePhoneScreens.tsx.

const css = `
  .pe-wrap{max-width:1180px;margin:0 auto;padding:112px 24px 96px;}
  .pe-head{max-width:620px;margin:0 auto 40px;text-align:center;}
  .pe-example{font-size:13px;color:#8C8A83;text-align:center;margin:0 0 20px;}
  .pe-grid{display:flex;justify-content:center;align-items:flex-start;gap:32px;}
  .pe-step{width:362px;flex:0 0 auto;}
  .pe-label{font-family:var(--font-newsreader),Georgia,serif;font-size:20px;line-height:1.3;color:#262420;margin:0 0 6px;}
  .pe-caption{font-size:15px;line-height:1.55;color:#56534D;margin:0 0 16px;min-height:48px;}
  .pe-screen{width:362px;border:1px solid rgba(38,36,32,0.14);border-radius:28px;overflow:hidden;background:#F7F4ED;}
  .pe-end{text-align:center;margin-top:56px;}
  @media(max-width:1180px){
    .pe-grid{flex-direction:column;align-items:center;gap:48px;}
    .pe-caption{min-height:0;}
  }
  @media(max-width:640px){
    .pe-wrap{padding:96px 12px 72px;}
  }
`

const STEPS = [
  { title: 'Practice home', caption: 'The patterns you follow, and where each one stands.', Screen: HomeScreen },
  { title: 'Daily check-in', caption: 'One question at the end of the day. Pick the answer that fits today.', Screen: CheckInScreen },
  { title: 'Recap', caption: 'Your week, your last four weeks, and the words you wrote.', Screen: RecapScreen },
]

export default function PracticeExampleClient() {
  return (
    <div className="bg-cream">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="pe-wrap">
        <div className="pe-head">
          <h1 className="font-serif text-charcoal" style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 400, marginBottom: 14 }}>
            The practice, filled in
          </h1>
          <p className="font-sans text-charcoal-soft" style={{ fontSize: 16, lineHeight: 1.6 }}>
            This is what following one pattern looks like after four weeks of check-ins. The answers and notes are an example, not a real person.
          </p>
        </div>

        <p className="pe-example font-sans">Example</p>
        <ol className="pe-grid" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {STEPS.map(({ title, caption, Screen }, i) => (
            <li key={title} className="pe-step">
              <h2 className="pe-label">{i + 1}. {title}</h2>
              <p className="pe-caption font-sans">{caption}</p>
              <div className="pe-screen">
                <Screen standalone fixture={landingPracticeFixture} />
              </div>
            </li>
          ))}
        </ol>

        <div className="pe-end">
          <p className="font-sans text-charcoal-soft" style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 18 }}>
            The practice starts from your own report.
          </p>
          <Link
            href="/onboarding"
            className="font-sans font-medium"
            style={{ display: 'inline-block', padding: '14px 28px', minHeight: 44, borderRadius: 999, background: '#262420', color: '#F7F4ED', fontSize: 15 }}
          >
            Start the assessment
          </Link>
        </div>
      </div>
    </div>
  )
}
