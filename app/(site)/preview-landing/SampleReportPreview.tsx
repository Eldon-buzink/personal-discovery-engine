'use client'

/**
 * "Your full report" on the landing preview: the real public sample report
 * (app/report/sample/SampleReportBody — same content, same components as
 * /report/sample) inside a browser-style frame that scrolls itself.
 *
 * Auto-scroll starts once the frame is in view, moves slowly to the bottom,
 * pauses, returns to the top and repeats. Any wheel, touch, click or key
 * inside the frame stops it for good, so the visitor can scroll and click
 * the report themselves. With prefers-reduced-motion it never auto-scrolls;
 * the frame is just scrollable.
 */

import { useEffect, useRef } from 'react'
import SampleReportBody from '@/app/report/sample/SampleReportBody'

const REPORT_FRAME_HEIGHT = 600 // chrome bar + scroll area, for the lazy placeholder

const css = `
  .rp-frame{max-width:680px;margin:0 auto;border-radius:18px;overflow:hidden;background:#F7F4ED;
    border:1px solid rgba(38,36,32,0.14);box-shadow:0 22px 48px -30px rgba(38,36,32,0.45);}
  .rp-bar{display:flex;align-items:center;gap:6px;height:38px;padding:0 14px;background:#EFEAE0;border-bottom:1px solid rgba(38,36,32,0.1);}
  .rp-bar i{width:9px;height:9px;border-radius:50%;background:rgba(38,36,32,0.18);}
  .rp-url{flex:1;text-align:center;font-size:12px;color:#57534A;margin-right:33px;}
  .rp-scroll{position:relative;height:${REPORT_FRAME_HEIGHT - 38}px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;}
  .rp-inner{max-width:560px;margin:0 auto;padding:0 22px 48px;}
  @media(max-width:640px){
    .rp-scroll{height:${REPORT_FRAME_HEIGHT - 38 - 60}px;}
  }
`

const SPEED_PX_PER_S = 38
const PAUSE_TOP_MS = 1800
const PAUSE_BOTTOM_MS = 2600

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
      <div className="rp-bar" aria-hidden="true">
        <i /><i /><i />
        <span className="rp-url">getbearing.me/report/sample</span>
      </div>
      <div ref={scrollRef} className="rp-scroll" tabIndex={0} aria-label="Sample report preview">
        <div className="rp-inner">
          <SampleReportBody />
        </div>
      </div>
    </div>
  )
}
