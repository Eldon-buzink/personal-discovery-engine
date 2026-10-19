import 'server-only'

export { emailLayout } from '@/lib/email/layout'

// Emails Bearing sends itself, through Resend's API (the Supabase sign-in
// emails go through Resend too, as Supabase's custom SMTP). Server only:
// RESEND_API_KEY never reaches the browser. EMAIL_FROM is the sender, on
// the domain verified in Resend, e.g. "Bearing <hello@getbearing.me>".

export interface OutgoingEmail {
  to: string
  subject: string
  html: string
  text: string
  // Resend drops a second send with the same key (24 hours), so a retried
  // job can't email someone twice.
  idempotencyKey?: string
}

export async function sendEmail(email: OutgoingEmail): Promise<void> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from) throw new Error('RESEND_API_KEY or EMAIL_FROM is not set')

  // RESEND_API_URL only for local testing against a stand-in server.
  const res = await fetch(process.env.RESEND_API_URL ?? 'https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(email.idempotencyKey ? { 'Idempotency-Key': email.idempotencyKey } : {}),
    },
    body: JSON.stringify({ from, to: [email.to], subject: email.subject, html: email.html, text: email.text }),
  })
  if (!res.ok) throw new Error(`Resend answered ${res.status}: ${(await res.text()).slice(0, 200)}`)
}
