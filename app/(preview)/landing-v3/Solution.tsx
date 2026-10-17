'use client'

/**
 * Landing v3, step 3: the solution. An example report, centred, in one
 * card: the report's own "Who you are" visual (TraitCarousel) with the
 * full blob view (the selected trait large, its related traits from the
 * same domain around it, joined by dashed lines) and the selected trait's
 * card (UnlockedContent). Swipe, arrows and "See what this is based on"
 * work as in the report.
 *
 * Example data: the six traits of one domain (Drive and discipline), so
 * the related blobs show. Deliberate and Self-assured are the sample
 * report's cards; the other four are written for this example to the same
 * rules as the generated cards (describe, never advise; no dashes).
 */

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { TraitCarousel, domainNote, patternSubtitle, type CarouselTrait } from '@/components/known/TraitCarousel'
import { UnlockedContent } from '@/components/known/ReportVisuals'
import EvidenceDialog from '@/components/known/EvidenceDialog'
import { SAMPLE_FACETS } from '@/app/report/sample/SampleReportClient'
import { sampleEvidencePanel } from '@/lib/known/sampleEvidence'
import { userCuratedHue } from '@/lib/blobs'
import { useEnterOnce } from '@/lib/design/motion'
import { css } from '@/lib/design/type'
import type { PatternContent } from '@/lib/known/types'

const ink = '#262420'
const soft = '#56534D'

export const solutionCSS = `
  .sv{padding:0 24px 128px;text-align:center;}
  /* The thread from the problems' last line into this section; draws once. */
  .sv-thread{display:block;width:1px;height:72px;margin:40px auto;background:linear-gradient(rgba(38,36,32,0),rgba(38,36,32,0.28));transform-origin:center top;}
  .m-armed:not(.m-play) .sv-thread{transform:scaleY(0);}
  .m-play .sv-thread{transition:transform var(--dur-enter) var(--ease);}
  .sv-wrap{max-width:1040px;margin:0 auto;}
  .sv h2{font-family:var(--font-display);font-weight:400;font-size:clamp(34px,4.2vw,52px);line-height:1.08;letter-spacing:-0.025em;margin:0;color:${ink};text-wrap:balance;}
  .sv-intro{${css.body}font-size:18px;color:${soft};max-width:600px;margin:20px auto 0;text-wrap:balance;}
  .sv-card{position:relative;max-width:640px;margin:56px auto 0;padding:32px 32px 36px;border-radius:28px;background:#FFFFFF;
    border:1px solid rgba(38,36,32,0.07);box-shadow:0 1px 2px rgba(38,36,32,0.05),0 30px 60px -30px rgba(38,36,32,0.28);text-align:center;}
  .sv-label{${css.meta}margin:0 0 4px;}
  .sv-card .tc-arrow{background:#FFFFFF;}
  .sv-facts{display:flex;justify-content:center;flex-wrap:wrap;gap:10px 28px;list-style:none;margin:40px 0 0;padding:0;}
  .sv-facts li{${css.ui}font-weight:400;color:${soft};display:inline-flex;align-items:center;gap:8px;}
  .sv-facts svg{color:#3D6B5C;}
  .sv-link{${css.ui}display:inline-flex;align-items:center;gap:8px;min-height:44px;margin-top:20px;color:${ink};text-decoration:underline;text-underline-offset:4px;text-decoration-color:rgba(38,36,32,0.35);}
  .sv-link:hover{text-decoration-color:${ink};}
  .sv-link svg{transition:transform var(--dur-ui) var(--ease);}
  .sv-link:hover svg{transform:translateX(3px);}
  .m-armed:not(.m-play) .sv-in{opacity:0;transform:translateY(16px);}
  .m-play .sv-in{transition:opacity var(--dur-enter) var(--ease) var(--d,0ms),transform var(--dur-enter) var(--ease) var(--d,0ms);}
  @media(max-width:640px){
    .sv{padding:0 16px 88px;}
    .sv-thread{height:56px;margin:28px auto;}
    .sv-intro{font-size:16px;}
    .sv-card{margin-top:40px;padding:22px 14px 28px;border-radius:22px;}
  }
`

type ExampleTrait = { facet: string; traitWord: string; content: PatternContent }

const sample = (facet: string) => {
  const f = SAMPLE_FACETS.find((x) => x.facet === facet)!
  return { facet, traitWord: f.traitWord, content: f.content! }
}

const TRAITS: ExampleTrait[] = [
  sample('Cautiousness'),
  sample('Self-Efficacy'),
  {
    facet: 'Orderliness', traitWord: 'Organized',
    content: {
      trait_quote: 'You like things to have a place, as long as keeping them there doesn’t take over your day.',
      body: 'It often shows in how you set up your work: tidy where it helps, relaxed where it matters less. That keeps you organised enough to find what you need. It can also mean small piles grow in a busy week.',
      tags: ['Tidy when needed', 'Flexible about order', 'Busy-week piles'],
    },
  },
  {
    facet: 'Dutifulness', traitWord: 'Reliable',
    content: {
      trait_quote: 'When you say you’ll do something, you usually do, and you weigh which promises matter most.',
      body: 'It often shows when plans pile up and something has to give. You tend to keep the commitments that count. It can also mean a smaller promise slips when your week is full.',
      tags: ['Keeps key promises', 'Weighs commitments', 'Small things slip'],
    },
  },
  {
    facet: 'Achievement-Striving', traitWord: 'Ambitious',
    content: {
      trait_quote: 'You set the bar high for yourself, and you feel it when you fall short.',
      body: 'It often shows when a goal is in sight and you push to reach it. That drive tends to get big things done. It can also make it hard to rest before the work feels finished.',
      tags: ['Sets high bars', 'Pushes to finish', 'Hard to rest'],
    },
  },
  {
    facet: 'Self-Discipline', traitWord: 'Steady',
    content: {
      trait_quote: 'You keep going on most things, as long as the reason to keep going stays clear.',
      body: 'It often shows halfway through a task, once the first energy has worn off. You tend to keep a decent pace on what matters to you. It can also mean the tasks that feel pointless quietly slip.',
      tags: ['Decent pace', 'Needs a reason', 'Some things slip'],
    },
  },
]

const check = <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.4l2.6 2.6L11 4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
const arrow = <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9.5M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>

export default function Solution() {
  const ref = useEnterOnce<HTMLDivElement>()
  const [i, setI] = useState(0)
  const traits: CarouselTrait[] = useMemo(() => TRAITS.map((t, n) => ({
    key: t.facet, traitWord: t.traitWord, hue: userCuratedHue(`ring1-pattern-${t.traitWord.toLowerCase()}`, n), domain: 'Conscientiousness',
  })), [])
  const t = TRAITS[i]
  return (
    <section id="solution" className="sv">
      <style dangerouslySetInnerHTML={{ __html: solutionCSS }} />
      <div ref={ref} className="sv-wrap">
        <span className="sv-thread" aria-hidden="true" />
        <h2 className="sv-in" style={{ ['--d' as string]: '200ms' }}>Meet your patterns.</h2>
        <p className="sv-intro sv-in" style={{ ['--d' as string]: '300ms' }}>
          It starts with seeing yours clearly. Answer 120 short statements in about 15 minutes, and your report gives each of your 30 patterns its own word, shows how strongly you lean, and explains how it tends to show up in your days.
        </p>
        <div className="sv-card sv-in" style={{ ['--d' as string]: '400ms' }}>
          <p className="sv-label">Example report</p>
          <TraitCarousel traits={traits} activeIdx={i} onSelect={setI}>
            <div style={{ marginTop: 12 }}>
              <UnlockedContent
                traitWord={t.traitWord} content={t.content} hue={traits[i].hue}
                subtitle={patternSubtitle(i)} subtitleNote={domainNote('Conscientiousness') ?? undefined}
                source={null} variant="ring1"
                evidence={<EvidenceDialog key={t.facet} data={sampleEvidencePanel(t.facet)} />}
              />
            </div>
          </TraitCarousel>
        </div>
        <ul className="sv-facts sv-in" style={{ ['--d' as string]: '300ms' }}>
          <li>{check}30 patterns, each with its own word</li>
          <li>{check}Plain words, no jargon</li>
          <li>{check}See what each one is based on</li>
        </ul>
        <Link href="/report/sample" className="sv-link sv-in" style={{ ['--d' as string]: '360ms' }}>See the full sample report {arrow}</Link>
      </div>
    </section>
  )
}
