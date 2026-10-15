import type { CheckInOption, CheckInOptionId } from '@/lib/known/checkInOptions'
import { selectedAccent, selectedSoft } from '@/lib/known/practiceTokens'
import { type } from '@/lib/design/type'

// The daily check-in's answer rows, presentational. With onSelect they are
// the real buttons (app/(app)/practice/[activationId]/checkin); without it
// they are a read-only list (the landing page example), with the selected
// row marked for screen readers as well as by colour and border.
export default function CheckInAnswerRows({
  options, selected, onSelect,
}: {
  options: CheckInOption[]
  selected: string | null
  onSelect?: (id: CheckInOptionId) => void
}) {
  const rowStyle = (isSelected: boolean) => ({
    textAlign: 'left' as const, width: '100%', boxSizing: 'border-box' as const, padding: '16px 18px',
    borderRadius: 12,
    border: `1.5px solid ${isSelected ? selectedAccent : '#DAD3C3'}`,
    background: isSelected ? selectedSoft : '#FFFFFF',
  })

  if (!onSelect) {
    return (
      <ul className="flex flex-col gap-2.5" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {options.map((o) => (
          <li key={o.id} className="font-sans text-charcoal checkin-row" data-selected={selected === o.id || undefined} style={rowStyle(selected === o.id)}>
            <span style={{ ...type.body }}>{o.label}</span>
            {selected === o.id && <span className="sr-only"> (selected)</span>}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onSelect(o.id)}
          className="font-sans text-charcoal"
          style={{ ...rowStyle(selected === o.id), cursor: 'pointer' }}
        >
          <span style={{ ...type.body }}>{o.label}</span>
        </button>
      ))}
    </div>
  )
}
