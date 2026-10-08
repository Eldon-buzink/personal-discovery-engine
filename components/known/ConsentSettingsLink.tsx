'use client'

import { reopenConsentChoice } from '@/lib/consent'

// Footer link that reopens the ad-measurement choice (ConsentBanner).
export default function ConsentSettingsLink({ style }: { style: React.CSSProperties }) {
  return (
    <button
      type="button"
      onClick={reopenConsentChoice}
      style={{ ...style, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
    >
      Cookie settings
    </button>
  )
}
