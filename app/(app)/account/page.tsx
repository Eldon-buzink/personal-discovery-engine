'use client'

/**
 * /account — "Download my data" and "Delete my account" (Gate 1, 2b).
 *
 * Export: one JSON file with everything stored for the account (see
 * lib/account/dataExport.ts), including the full assessment answers and
 * every check-in note verbatim.
 *
 * Deletion: a fresh 6-digit code sent to the account's own email plus
 * typing "delete". The server deletes all data rows in one transaction
 * (public.delete_user_data), then the account itself; see
 * app/actions/account.ts and lib/account/deleteAccount.ts. Afterwards this
 * device's local copy (localStorage/sessionStorage) is cleared too.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { deleteMyAccount, exportMyData, sendAccountDeletionCode } from '@/app/actions/account'

type DeleteStep = 'closed' | 'explain' | 'code' | 'done'

const REASON_TEXT: Record<string, string> = {
  confirmation: 'Type "delete" to confirm.',
  code: 'That code didn’t work. Check the newest email, or send a new code.',
  data: 'Nothing was deleted: something went wrong on our side. Please try again in a moment.',
  auth: 'Your data was deleted, but the account itself wasn’t yet. Send a new code and try again to finish.',
  rate: 'Too many attempts. Please wait a few minutes and try again.',
  'signed-out': 'You’ve been signed out. Sign in again to continue.',
  error: 'Something went wrong. Please try again in a moment.',
}

// This device's own copy of progress and results (see the proposal's
// "In the browser" list). The consent choice is kept on purpose.
function clearLocalCopy() {
  for (const store of [localStorage, sessionStorage]) {
    for (const key of Object.keys(store)) {
      if (key.startsWith('known_') || key.startsWith('mini-assessment')) store.removeItem(key)
    }
  }
}

export default function AccountPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [step, setStep] = useState<DeleteStep>('closed')
  const [code, setCode] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/')
        return
      }
      setEmail(user.email ?? null)
      setLoading(false)
    })
  }, [router])

  async function handleExport() {
    setExporting(true)
    setExportError(null)
    try {
      const result = await exportMyData()
      if (!result.ok) {
        setExportError(REASON_TEXT[result.reason] ?? REASON_TEXT.error)
        return
      }
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bearing-data-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setExportError(REASON_TEXT.error)
    } finally {
      setExporting(false)
    }
  }

  async function handleSendCode() {
    setBusy(true)
    setMessage(null)
    try {
      const result = await sendAccountDeletionCode()
      if (!result.ok) {
        setMessage(REASON_TEXT[result.reason] ?? REASON_TEXT.error)
        return
      }
      setCode('')
      setStep('code')
    } catch {
      setMessage(REASON_TEXT.error)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    setMessage(null)
    try {
      const result = await deleteMyAccount(code.trim(), confirmation)
      if (!result.ok) {
        setMessage(REASON_TEXT[result.reason] ?? REASON_TEXT.error)
        return
      }
      clearLocalCopy()
      await createClient().auth.signOut({ scope: 'local' }).catch(() => {})
      setStep('done')
    } catch {
      setMessage(REASON_TEXT.error)
    } finally {
      setBusy(false)
    }
  }

  if (loading && step !== 'done') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="font-sans text-sm text-muted">Loading…</p>
      </div>
    )
  }

  const card: React.CSSProperties = { padding: 20, borderRadius: 14, background: '#FFFFFF', border: '1px solid #E5E1D5', display: 'flex', flexDirection: 'column', gap: 10 }
  const primary: React.CSSProperties = { display: 'block', textAlign: 'center', padding: 13, borderRadius: 10, background: '#262420', color: '#F7F4ED', fontSize: 14 }
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10, border: '1px solid #DAD3C3', background: '#FFFFFF', fontSize: 15 }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p className="font-serif font-medium text-charcoal" style={{ fontSize: 24 }}>Your account and data have been deleted.</p>
          <p className="font-sans text-charcoal-soft" style={{ fontSize: 14, lineHeight: 1.6 }}>
            This device&apos;s copy is cleared too. Other devices you used keep their own copy until you clear that browser&apos;s data.
          </p>
          <Link href="/" className="font-sans text-muted" style={{ fontSize: 13, textDecoration: 'underline', marginTop: 8 }}>Go to Bearing</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 12, letterSpacing: '0.04em', marginBottom: 4 }}>Your account</p>
          <h1 className="font-serif font-medium text-charcoal" style={{ fontSize: 26, lineHeight: 1.3 }}>Your data</h1>
          <p className="font-sans text-charcoal-soft" style={{ fontSize: 13.5, marginTop: 6 }}>Signed in as {email}</p>
        </div>

        <div style={card}>
          <p className="font-serif font-medium text-charcoal" style={{ fontSize: 18 }}>Download my data</p>
          <p className="font-sans text-charcoal-soft" style={{ fontSize: 13.5, lineHeight: 1.55 }}>
            One file with everything we store for your account: your assessment answers and results, quick checks, the patterns you track, and every check-in with your notes.
          </p>
          <button type="button" onClick={handleExport} disabled={exporting} className="font-sans font-medium" style={{ ...primary, opacity: exporting ? 0.6 : 1 }}>
            {exporting ? 'Preparing…' : 'Download my data'}
          </button>
          {exportError && <p className="font-sans" style={{ fontSize: 13, color: '#8a5a3d' }}>{exportError}</p>}
        </div>

        <div style={card}>
          <p className="font-serif font-medium text-charcoal" style={{ fontSize: 18 }}>Delete my account</p>
          {step === 'closed' && (
            <>
              <p className="font-sans text-charcoal-soft" style={{ fontSize: 13.5, lineHeight: 1.55 }}>
                Permanently deletes your account and everything linked to it.
              </p>
              <button type="button" onClick={() => setStep('explain')} className="font-sans" style={{ fontSize: 13.5, color: '#8a5a3d', textDecoration: 'underline', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                Delete my account…
              </button>
            </>
          )}
          {step === 'explain' && (
            <>
              <ul className="font-sans text-charcoal-soft" style={{ fontSize: 13.5, lineHeight: 1.6, paddingLeft: 18, margin: 0, listStyle: 'disc' }}>
                <li>Your answers, results, quick checks, tracked patterns and check-in notes are deleted. This can&apos;t be undone.</li>
                <li>If you unlocked the full assessment, that access ends.</li>
                <li>Payment records are kept by us and Stripe for the period the law requires for bookkeeping.</li>
                <li>Other devices you used keep their own copy until you clear that browser&apos;s data.</li>
              </ul>
              <p className="font-sans text-charcoal-soft" style={{ fontSize: 13.5, lineHeight: 1.55 }}>
                To confirm it&apos;s you, we&apos;ll email a 6-digit code to {email}.
              </p>
              <button type="button" onClick={handleSendCode} disabled={busy} className="font-sans font-medium" style={{ ...primary, opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Sending…' : 'Email me a code'}
              </button>
              <button type="button" onClick={() => setStep('closed')} className="font-sans text-muted" style={{ fontSize: 13, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
                Cancel
              </button>
            </>
          )}
          {step === 'code' && (
            <>
              <label className="font-sans text-charcoal-soft" style={{ fontSize: 13 }}>
                The 6-digit code from the email
                <input
                  type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000" style={{ ...input, marginTop: 6, letterSpacing: '0.3em', textAlign: 'center' }}
                />
              </label>
              <label className="font-sans text-charcoal-soft" style={{ fontSize: 13 }}>
                Type <strong>delete</strong> to confirm
                <input type="text" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} style={{ ...input, marginTop: 6 }} />
              </label>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy || code.length !== 6 || confirmation.trim().toLowerCase() !== 'delete'}
                className="font-sans font-medium"
                style={{ ...primary, background: '#8a3d2a', opacity: busy || code.length !== 6 || confirmation.trim().toLowerCase() !== 'delete' ? 0.5 : 1 }}
              >
                {busy ? 'Deleting…' : 'Delete my account permanently'}
              </button>
              <button type="button" onClick={handleSendCode} disabled={busy} className="font-sans text-muted" style={{ fontSize: 13, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
                Send a new code
              </button>
            </>
          )}
          {message && <p className="font-sans" style={{ fontSize: 13, color: '#8a5a3d' }}>{message}</p>}
        </div>

        <Link href="/practice" className="font-sans text-muted" style={{ fontSize: 13, textDecoration: 'underline', textAlign: 'center' }}>
          Back to your practice
        </Link>
      </div>
    </div>
  )
}
