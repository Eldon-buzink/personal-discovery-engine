'use client'

// Report lab: the "Showing: …" button with its menu (popover on desktop,
// bottom sheet on phone). In the menu, arrow keys move focus and Enter or a
// tap chooses; choosing closes it and focus goes back to the button. Esc
// closes it too.

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { DUR_UI, EASE } from '@/lib/design/motion'
import { FAMILY_HUES } from '@/lib/lab/filterLab'

const ink = '#262420'
const soft = '#56534D'
const line = '#E5E1D5'

/** Arrow keys with a roving tab index. `focusOnly`: arrows move focus without choosing. */
export function RadioRow({ label, options, value, onChange, className, render, focusOnly }: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
  className: string
  render: (v: string) => ReactNode
  focusOnly?: boolean
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const onKey = (e: KeyboardEvent) => {
    const current = (document.activeElement as HTMLElement | null)?.dataset.v
    const i = options.indexOf(focusOnly && current ? current : value)
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = options[(i + step + options.length) % options.length]
    if (!focusOnly) onChange(next)
    refs.current[next]?.focus()
  }
  return (
    <div role="radiogroup" aria-label={label} className={className} onKeyDown={onKey}>
      {options.map((o) => (
        <button key={o} ref={(el) => { refs.current[o] = el }} type="button" role="radio" aria-checked={o === value}
          tabIndex={o === value ? 0 : -1} onClick={() => onChange(o)} data-v={o}>
          {render(o)}
        </button>
      ))}
    </div>
  )
}

export const Dot = ({ cluster }: { cluster: string }) => (
  <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 999, background: `hsl(${FAMILY_HUES[cluster]},70%,60%)`, flexShrink: 0 }} />
)

export function ShowingMenu({ view, options, labelOf, onChange, mobile, startOpen }: {
  view: string
  options: string[]
  labelOf: (v: string) => string
  onChange: (v: string) => void
  mobile: boolean
  startOpen: boolean
}) {
  const [open, setOpen] = useState(startOpen)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (open) (menuRef.current?.querySelector('[aria-checked="true"]') as HTMLElement | null)?.focus()
  }, [open])
  const close = () => { setOpen(false); btnRef.current?.focus() }
  const chip = (v: string) => <>{FAMILY_HUES[v] !== undefined && <Dot cluster={v} />}<span>{labelOf(v)}</span></>
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
      <style dangerouslySetInnerHTML={{ __html: SM_CSS }} />
      <button ref={btnRef} type="button" className="ff-showing" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span style={{ color: '#8C8A83' }}>[LAB COPY] Showing:</span> {chip(view)}
        <span aria-hidden="true" style={{ marginLeft: 2 }}>⌄</span>
      </button>
      {open && (
        <>
          {mobile && <div className="ff-backdrop" onClick={close} />}
          <div ref={menuRef} className={mobile ? 'ff-sheet' : 'ff-pop'} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); close() } }}>
            <RadioRow label="Show" options={options} value={view} onChange={(v) => { onChange(v); close() }} className="ff-menu" render={chip} focusOnly />
          </div>
        </>
      )}
    </div>
  )
}

const SM_CSS = `
  .ff-showing{display:inline-flex;align-items:center;gap:8px;min-height:44px;white-space:nowrap;max-width:100%;padding:0 18px;border-radius:999px;border:1px solid ${line};background:#FFFFFF;color:${ink};cursor:pointer;
    font-family:var(--font-body);font-size:var(--text-ui);font-weight:500;}
  .ff-showing:focus-visible,.ff-menu button:focus-visible{outline:2px solid #D85A30;outline-offset:2px;}
  .ff-pop{position:absolute;top:52px;left:50%;transform:translateX(-50%);z-index:20;background:#FFFFFF;border:1px solid ${line};border-radius:16px;padding:8px;
    box-shadow:0 8px 24px rgba(38,36,32,0.10);}
  .ff-sheet{position:fixed;left:0;right:0;bottom:0;z-index:20;background:#FFFFFF;border-radius:20px 20px 0 0;padding:16px 16px 28px;box-shadow:0 -8px 24px rgba(38,36,32,0.10);}
  .ff-backdrop{position:fixed;inset:0;z-index:19;background:rgba(38,36,32,0.25);}
  .ff-menu{display:flex;flex-direction:column;gap:4px;align-items:stretch;}
  .ff-menu button{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border:0;border-radius:12px;background:#FFFFFF;color:${soft};cursor:pointer;
    white-space:nowrap;justify-content:flex-start;font-family:var(--font-body);font-size:var(--text-ui);font-weight:500;transition:background ${DUR_UI}ms ${EASE},color ${DUR_UI}ms ${EASE};}
  .ff-menu button[aria-checked="true"]{background:#F2EEE5;color:${ink};}
`
