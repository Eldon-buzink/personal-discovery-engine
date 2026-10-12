// Fixed bottom bar: a line of italic context on the left, one call to action
// on the right. Moved out of the report (its "Keep discovering" / "Unlock"
// bar) so Practice home's Today's check-in uses the exact same bar. The bar's
// fixed height doesn't leave room for the text to wrap beside the button on
// narrow screens, so it stacks vertically below 560px.

const cream = '#F7F4ED'
const charcoal = '#262420'
const charcoalSoft = '#56534D'
const line = '#E5E1D5'
const sans = 'var(--font-inter), system-ui, sans-serif'
const serif = 'var(--font-newsreader), serif'

// Pages that show the bar leave this much room at the bottom so their last
// content isn't hidden behind it.
export const STICKY_BAR_SPACE = 120

const stickyBarCSS = `
  .sticky-bar{
    position:fixed;bottom:0;left:0;right:0;min-height:64px;background:${cream};
    border-top:1px solid ${line};z-index:100;display:flex;align-items:center;
    justify-content:space-between;padding:14px 28px;gap:16px;
  }
  @media(max-width:560px){
    .sticky-bar{flex-direction:column;align-items:flex-start;padding:16px 20px;gap:10px;}
    .sticky-bar .sb-cta{width:100%;}
    .sticky-bar .sb-cta button{width:100%;}
  }
`

export default function StickyBar({ leftText, rightLabel, onSelect }: { leftText: string; rightLabel: string; onSelect: () => void }) {
  return (
    <div className="sticky-bar">
      <style dangerouslySetInnerHTML={{ __html: stickyBarCSS }} />
      <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 16, color: charcoalSoft, margin: 0, flex: 1, minWidth: 0 }}>
        {leftText}
      </p>
      <div
        className="sb-cta"
        onClick={onSelect}
        style={{
          flexShrink: 0,
          padding: 2,
          borderRadius: 100,
          background: 'linear-gradient(135deg, hsl(175,65%,55%), hsl(205,65%,60%), hsl(235,60%,65%), hsl(290,55%,60%), hsl(8,65%,60%), hsl(35,70%,58%))',
          backgroundSize: '300% 300%',
          animation: 'gradientRotate 4s ease infinite',
          boxShadow: '0 0 20px 2px hsla(175,65%,55%,0.25), 0 0 40px 4px hsla(205,65%,60%,0.15)',
          cursor: 'pointer',
        }}
      >
        <button style={{
          fontFamily: sans, fontSize: 13, fontWeight: 500, color: charcoal,
          padding: '10px 20px', border: 'none', borderRadius: 100,
          background: cream, cursor: 'pointer',
        }}>
          {rightLabel}
        </button>
      </div>
    </div>
  )
}
