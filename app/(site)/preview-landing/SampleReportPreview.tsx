'use client'

/**
 * The sample report in a browser-style frame, used as the first tile of
 * "What you get" on the landing preview. Content is the public sample
 * report's own (app/report/sample/sampleContent.ts, the same data
 * /report/sample renders), laid out in the report's typography so the frame
 * opens on three facets with their written explanations rather than the
 * report's blob header. Each entry shows the quote and the first sentence
 * of "Where this shows up"; the full text is on /report/sample, which the
 * address bar links to.
 *
 * Auto-scroll starts once the frame is in view, moves slowly to the bottom,
 * pauses, returns to the top and repeats. Any wheel, touch, click or key
 * inside the frame stops it for good. With prefers-reduced-motion it never
 * auto-scrolls; the frame is just scrollable.
 */

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { userCuratedHue } from '@/components/known/ReportVisuals'
import { SAMPLE_FACETS, SAMPLE_ENVIRONMENT_CONTENT } from '@/app/report/sample/sampleContent'

const gray = '#8C8A83'
const charcoal = '#262420'
const charcoalSoft = '#56534D'
const line = '#E5E1D5'
const serif = 'var(--font-newsreader), serif'
const sans = 'var(--font-inter), system-ui, sans-serif'

const css = `
  .rp-frame{display:flex;flex-direction:column;height:100%;min-height:560px;border-radius:24px;overflow:hidden;background:#F7F4ED;
    border:1px solid rgba(38,36,32,0.14);box-shadow:0 22px 48px -30px rgba(38,36,32,0.45);}
  .rp-bar{flex:0 0 auto;display:flex;align-items:center;gap:6px;height:38px;padding:0 14px;background:#EFEAE0;border-bottom:1px solid rgba(38,36,32,0.1);}
  .rp-bar i{width:9px;height:9px;border-radius:50%;background:rgba(38,36,32,0.18);}
  .rp-url{flex:1;text-align:center;font-size:12px;color:#57534A;margin-right:33px;text-decoration:none;}
  .rp-url:hover{text-decoration:underline;}
  .rp-scroll{position:relative;flex:1 1 0;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;}
  .rp-inner{max-width:520px;margin:0 auto;padding:18px 24px 40px;}
  .rp-entry{padding:18px 0;border-top:1px solid ${line};text-align:center;}
  .rp-entry:first-of-type{border-top:none;padding-top:8px;}
  @media(max-width:860px){ .rp-frame{height:720px;min-height:0;} }
  @media(max-width:640px){
    .rp-inner{padding:12px 16px 32px;} .rp-entry{padding:12px 0;}
    .rp-entry h3{font-size:20px !important;margin-bottom:6px !important;}
    .rp-entry .rp-q{font-size:15px !important;margin-bottom:8px !important;}
  }
`

const SPEED_PX_PER_S = 34
const PAUSE_TOP_MS = 2400
const PAUSE_BOTTOM_MS = 2600

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: sans, fontSize: 11.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 600, margin: '18px 0 4px', textAlign: 'center' }}>
      {children}
    </p>
  )
}

// One pattern in the report's own typography (UnlockedContent's title,
// italic quote and "Where this shows up" block), without its tags and
// Go deeper / Worth trying cards, so three fit in the opening view.
function firstSentence(text: string): string {
  return text.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? text
}

function Entry({ word, quote, where, hue }: { word: string; quote: string; where: string; hue: number }) {
  return (
    <div className="rp-entry">
      <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, color: charcoal, margin: '0 0 8px' }}>{word}</h3>
      <p className="rp-q" style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 16, lineHeight: 1.5, color: charcoalSoft, margin: '0 auto 12px', maxWidth: 420 }}>{quote}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: `hsl(${hue},55%,50%)` }} />
        <span style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 600, color: charcoal }}>Where this shows up</span>
      </div>
      <p style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.65, color: charcoalSoft, margin: '0 auto', maxWidth: 420 }}>{firstSentence(where)}</p>
    </div>
  )
}

export default function SampleReportPreview() {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false
    let inView = false
    let last = 0
    let pos = 0

    const stop = () => {
      stopped = true
      cancelAnimationFrame(raf)
      if (timer) clearTimeout(timer)
    }
    const step = (t: number) => {
      if (stopped || !inView) return
      const dt = last ? Math.min(t - last, 64) : 16
      last = t
      const max = el.scrollHeight - el.clientHeight
      pos = Math.min(max, pos + (SPEED_PX_PER_S * dt) / 1000)
      el.scrollTop = pos
      if (pos >= max) {
        timer = setTimeout(() => {
          if (stopped) return
          el.scrollTo({ top: 0, behavior: 'smooth' })
          pos = 0
          timer = setTimeout(start, PAUSE_TOP_MS)
        }, PAUSE_BOTTOM_MS)
        return
      }
      raf = requestAnimationFrame(step)
    }
    const start = () => {
      if (stopped || !inView) return
      last = 0
      raf = requestAnimationFrame(step)
    }

    const io = new IntersectionObserver((entries) => {
      const wasInView = inView
      inView = entries.some((e) => e.isIntersecting)
      if (inView && !wasInView) timer = setTimeout(start, PAUSE_TOP_MS)
      if (!inView) { cancelAnimationFrame(raf); if (timer) clearTimeout(timer) }
    }, { threshold: 0.5 })
    io.observe(el)

    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
    events.forEach((e) => el.addEventListener(e, stop, { passive: true }))
    return () => {
      stop()
      io.disconnect()
      events.forEach((e) => el.removeEventListener(e, stop))
    }
  }, [])

  return (
    <div className="rp-frame">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="rp-bar">
        <i aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" />
        <Link href="/report/sample" className="rp-url">getbearing.me/report/sample ↗</Link>
      </div>
      <div ref={scrollRef} className="rp-scroll" tabIndex={0} aria-label="Sample report preview">
        <div className="rp-inner">
          <div style={{ padding: '9px 14px', borderRadius: 10, background: '#F3F1EB', border: `1px solid ${line}`, textAlign: 'center' }}>
            <p style={{ fontFamily: sans, fontSize: 12, color: charcoalSoft, margin: 0 }}>
              This is a sample report with illustrative results — not your data.
            </p>
          </div>
          <Eyebrow>Who you are</Eyebrow>
          {SAMPLE_FACETS.map((f) => f.content && (
            <Entry
              key={f.traitWord}
              word={f.traitWord}
              quote={f.content.trait_quote}
              where={f.content.where_it_shows_up}
              hue={userCuratedHue(`ring1-pattern-${f.traitWord.toLowerCase()}`, f.hueOffset)}
            />
          ))}
          <Eyebrow>Where you thrive</Eyebrow>
          <Entry
            word="Deep work"
            quote={SAMPLE_ENVIRONMENT_CONTENT.trait_quote}
            where={SAMPLE_ENVIRONMENT_CONTENT.where_it_shows_up}
            hue={userCuratedHue('env-pattern-deep-work', 0)}
          />
        </div>
      </div>
    </div>
  )
}
