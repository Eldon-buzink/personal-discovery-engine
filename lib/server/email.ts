import 'server-only'

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

  const res = await fetch('https://api.resend.com/emails', {
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"
const SERIF = "Georgia,'Times New Roman',serif"

// The same look as the Supabase templates (supabase/templates): cream page,
// white card, serif heading, one charcoal button.
export function emailLayout(o: {
  preheader: string
  heading: string
  body: string
  button?: { label: string; href: string }
  code?: string
  note?: string
  footer: string
}): string {
  const row = (html: string) => `<tr>${html}</tr>`
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(o.heading)}</title></head>
<body style="margin:0;padding:0;background-color:#F7F4ED;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F4ED;"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:440px;">
${row(`<td align="center" style="padding:0 0 24px;font-family:${SERIF};font-size:24px;line-height:1.2;color:#262420;">Bearing</td>`)}
<tr><td style="background-color:#FFFFFF;border:1px solid #E5E1D5;border-radius:20px;padding:40px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${row(`<td align="center" style="font-family:${SERIF};font-size:26px;line-height:1.25;color:#262420;padding:0 0 12px;">${escapeHtml(o.heading)}</td>`)}
${row(`<td align="center" style="font-family:${SANS};font-size:16px;line-height:1.6;color:#56534D;padding:0 0 28px;">${escapeHtml(o.body)}</td>`)}
${o.code ? row(`<td align="center" style="padding:0 0 16px;font-family:${SANS};font-size:30px;font-weight:600;letter-spacing:6px;color:#262420;">${escapeHtml(o.code)}</td>`) : ''}
${o.button ? row(`<td align="center" style="padding:0 0 16px;"><a href="${escapeHtml(o.button.href)}" style="display:inline-block;background-color:#262420;color:#F7F4ED;font-family:${SANS};font-size:15px;font-weight:600;line-height:1;text-decoration:none;padding:16px 32px;border-radius:999px;">${escapeHtml(o.button.label)}</a></td>`) : ''}
${o.note ? row(`<td align="center" style="font-family:${SANS};font-size:13px;line-height:1.5;color:#6B675F;">${escapeHtml(o.note)}</td>`) : ''}
</table></td></tr>
${row(`<td align="center" style="padding:24px 16px 0;font-family:${SANS};font-size:13px;line-height:1.5;color:#6B675F;">${escapeHtml(o.footer)}</td>`)}
</table></td></tr></table></body></html>`
}
