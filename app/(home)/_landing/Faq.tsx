'use client'

/**
 * Landing: the FAQ. The live page's questions and accordion
 * (FAQ_ITEMS, FaqAccordion), centred like the rest of v3. The "FAQ"
 * eyebrow is dropped: the heading already says it.
 */

import FaqAccordion from '@/app/(site)/FaqAccordion'
import { FAQ_ITEMS } from '@/app/(site)/landing/FaqSection'
import { useEnterOnce } from '@/lib/design/motion'
import { css } from '@/lib/design/type'

const ink = '#262420'
const soft = '#56534D'
const line = 'rgba(38,36,32,0.12)'

export const faqV3CSS = `
  .vf{padding:0 24px 136px;}
  .vf-wrap{max-width:720px;margin:0 auto;}
  .vf h2{font-family:var(--font-display);font-weight:400;font-size:clamp(34px,4.2vw,52px);line-height:1.08;letter-spacing:-0.025em;margin:0 0 48px;color:${ink};text-align:center;}
  .vf .faq-item{border-bottom:1px solid ${line};padding:12px 0;}
  .vf .faq-item:first-child{border-top:1px solid ${line};}
  .vf .faq-item h3{margin:0;}
  .vf .faq-row{display:flex;justify-content:space-between;align-items:center;gap:16px;min-height:52px;width:100%;background:none;border:none;padding:0;margin:0;cursor:pointer;
    ${css.display4}color:${ink};text-align:left;}
  .vf .faq-row:focus-visible{outline:2px solid ${ink};outline-offset:2px;}
  .vf .faq-icon{font-size:20px;line-height:1;color:${soft};flex-shrink:0;transition:transform var(--dur-ui) var(--ease);}
  .vf .faq-body{overflow:hidden;transition:max-height var(--dur-enter) var(--ease);}
  .vf .faq-body-inner{padding:4px 40px 12px 0;}
  .vf .faq-body p{${css.body}color:${soft};margin:0;}
  .m-armed:not(.m-play) .vf-in{opacity:0;transform:translateY(14px);}
  .m-play .vf-in{transition:opacity var(--dur-enter) var(--ease) var(--d,0ms),transform var(--dur-enter) var(--ease) var(--d,0ms);}
  @media(max-width:640px){ .vf{padding:0 16px 96px;} .vf h2{margin-bottom:32px;} .vf .faq-body-inner{padding-right:0;} }
  @media(prefers-reduced-motion:reduce){ .vf .faq-body,.vf .faq-icon{transition:none;} }
`

export default function Faq() {
  const ref = useEnterOnce<HTMLDivElement>()
  return (
    <section className="vf">
      <style dangerouslySetInnerHTML={{ __html: faqV3CSS }} />
      <div ref={ref} className="vf-wrap">
        <h2 className="vf-in">Common questions</h2>
        <div className="vf-in" style={{ ['--d' as string]: '120ms' }}>
          <FaqAccordion items={FAQ_ITEMS} />
        </div>
      </div>
    </section>
  )
}
