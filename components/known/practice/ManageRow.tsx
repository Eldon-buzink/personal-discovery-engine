import { directionalAccent } from '@/lib/known/practiceTokens'

// One row of Manage your practice: the pattern, where it came from, and the
// on/off switch. Presentational (props only). Used by
// app/(app)/practice/manage/page.tsx and, as an example, by the landing page.
export default function ManageRow({ label, sourceLabel, directional, active, busy = false, onToggle }: {
  label: string
  sourceLabel: string
  directional: boolean
  active: boolean
  busy?: boolean
  onToggle: () => void
}) {
  return (
    <div
      style={{
        padding: '14px 16px', borderRadius: 12, border: '1px solid #DAD3C3', background: '#FFFFFF',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}
    >
      <div>
        <div className="font-sans font-medium text-ui text-charcoal" style={{ marginBottom: 2 }}>
          {label}
        </div>
        <div
          className="font-sans text-meta"
          style={{ color: directional ? '#262420' : '#8C8A83', fontWeight: directional ? 500 : 400 }}
        >
          {sourceLabel}
        </div>
      </div>
      <button
        onClick={onToggle}
        disabled={busy}
        aria-label={`Toggle ${label}`}
        aria-pressed={active}
        style={{
          position: 'relative', width: 40, height: 24, borderRadius: 12, border: 'none', flexShrink: 0,
          cursor: 'pointer', padding: 0, opacity: busy ? 0.6 : 1,
          background: active ? directionalAccent : '#DAD3C3',
        }}
      >
        <span
          style={{
            position: 'absolute', top: 3, left: active ? 19 : 3, width: 18, height: 18,
            borderRadius: '50%', background: '#FFFFFF', transition: 'left 0.15s',
          }}
        />
      </button>
    </div>
  )
}
