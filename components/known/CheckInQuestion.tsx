import { facetDisplayLabel } from '@/lib/known/miniAssessmentScoring'
import { directionalAccent } from '@/lib/known/practiceTokens'
import { getCheckInPrompt } from '@/lib/known/checkInOptions'
import { practicePurposeCopy } from '@/lib/known/practicePurpose'

// One trait's check-in question: name, question, options, optional note.
// Shared by the single-trait check-in page and the daily check-in that steps
// through every trait, so both ask exactly the same thing.
export default function CheckInQuestion({
  facetId,
  directional,
  isFirstCheckIn,
  selected,
  onSelect,
  note,
  onNoteChange,
}: {
  facetId: string
  directional: boolean
  isFirstCheckIn: boolean
  selected: string | null
  onSelect: (optionId: string) => void
  note: string
  onNoteChange: (note: string) => void
}) {
  const prompt = getCheckInPrompt(facetId)
  return (
    <>
      <div>
        <h1 className="font-serif font-medium text-charcoal" style={{ fontSize: 28, lineHeight: 1.25, marginBottom: 12 }}>
          {facetDisplayLabel(facetId)}
        </h1>
        <p className="font-sans text-charcoal-soft" style={{ fontSize: 15, lineHeight: 1.55 }}>
          {prompt.question}
        </p>
        {/* Mechanism, not momentum — no streaks, no counts, no "keep it up".
            First visit gets the full purpose line (Part 1); every return
            visit a shorter mechanism-only reminder so it doesn't repeat the
            pitch daily. */}
        <p className="font-sans text-muted" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 10 }}>
          {isFirstCheckIn ? practicePurposeCopy(directional) : 'This becomes part of your report — not a score, just a record of what you noticed.'}
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {prompt.options.map((o) => {
          const isSelected = selected === o.id
          return (
            <button
              key={o.id}
              onClick={() => onSelect(o.id)}
              className="font-sans text-charcoal"
              style={{
                textAlign: 'left', width: '100%', boxSizing: 'border-box', padding: '16px 18px',
                borderRadius: 12, cursor: 'pointer',
                border: `1.5px solid ${isSelected ? directionalAccent : '#DAD3C3'}`,
                background: isSelected ? '#FBEEE8' : '#FFFFFF',
              }}
            >
              <span style={{ fontSize: 15, lineHeight: 1.4 }}>{o.label}</span>
            </button>
          )
        })}
      </div>

      <div>
        <label htmlFor="note" className="font-sans text-charcoal-soft" style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>
          Anything else worth noting? (optional)
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="A line or two is plenty"
          className="font-sans text-charcoal"
          style={{
            width: '100%', boxSizing: 'border-box', minHeight: 64, padding: '12px 14px',
            borderRadius: 10, border: '1px solid #DAD3C3', background: '#FFFFFF', fontSize: 14, resize: 'none',
          }}
        />
      </div>
    </>
  )
}
