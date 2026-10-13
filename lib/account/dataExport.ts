// "Download my data": shapes the rows fetched for one user into the JSON
// file the user gets. Pure (no database access) so it can be unit-tested;
// app/actions/account.ts fetches the rows with the service role.
//
// Included in full: the saved full-assessment sessions (every answer, branch
// answers and the generated text, exactly as stored) and every check-in with
// its note, verbatim.

import { facetDisplayLabel } from '@/lib/known/miniAssessmentScoring'

export interface ExportInput {
  exportedAt: string
  account: { email: string | null; created_at: string | null; last_sign_in_at: string | null }
  payment: { is_paid: boolean; paid_at: string | null } | null
  sessions: { id: string; created_at: string | null; responses: unknown }[]
  reportContent: Record<string, unknown>[]
  miniResults: { id: string; facet_id: string; band: string; responses: unknown; created_at: string; claimed_by: string | null }[]
  activations: { id: string; facet_id: string; source: string; directional: boolean; created_at: string }[]
  periods: { facet_activation_id: string; started_at: string; ended_at: string | null }[]
  checkIns: { facet_activation_id: string; check_in_date: string; response_option: string; note: string | null; created_at: string }[]
  reveals: { facet_id: string; revealed_at?: string | null; created_at?: string | null }[]
}

export const EXPORT_ABOUT = {
  account: 'The email address you sign in with, and when the account was created and last used.',
  payment: 'Whether you unlocked the full assessment, and when. The payment itself is processed and kept by Stripe for bookkeeping; it is not part of this file.',
  full_assessment: 'Your saved full assessment exactly as stored: every answer (1-5) by question number, the order the questions were shown, which patterns were revealed, answers to the deeper assessments, and the written explanations generated for you.',
  report_text: 'Written explanations stored separately and linked to your saved assessment (older records; new ones are no longer stored).',
  mini_assessments: 'Quick checks you took: your six answers (1-5) and the band they put you in. "claimed" means it was linked to your account.',
  practice: 'The patterns you track, the periods you tracked them, and every daily check-in: your answer and, if you wrote one, your note exactly as typed.',
  facet_reveals: 'Which patterns from the full assessment were shown to you.',
  not_included: 'Not in this file: your browser’s own copy of your progress (stays on your device), and records held by Stripe, our email provider and, only if you allowed ad measurement, Meta and Pinterest.',
}

export function buildDataExport(input: ExportInput) {
  const periodsByActivation = new Map<string, ExportInput['periods']>()
  for (const p of input.periods) {
    const list = periodsByActivation.get(p.facet_activation_id) ?? []
    list.push(p)
    periodsByActivation.set(p.facet_activation_id, list)
  }
  const checkInsByActivation = new Map<string, ExportInput['checkIns']>()
  for (const c of input.checkIns) {
    const list = checkInsByActivation.get(c.facet_activation_id) ?? []
    list.push(c)
    checkInsByActivation.set(c.facet_activation_id, list)
  }

  return {
    about: EXPORT_ABOUT,
    exported_at: input.exportedAt,
    account: input.account,
    payment: input.payment ?? { is_paid: false, paid_at: null },
    full_assessment: input.sessions.map((s) => ({ id: s.id, saved_at: s.created_at, saved_session: s.responses })),
    report_text: input.reportContent,
    mini_assessments: input.miniResults.map((m) => ({
      facet: facetDisplayLabel(m.facet_id),
      band: m.band,
      answers: m.responses,
      taken_at: m.created_at,
      claimed: m.claimed_by !== null,
    })),
    practice: input.activations.map((a) => ({
      facet: facetDisplayLabel(a.facet_id),
      source: a.source,
      directional: a.directional,
      added_at: a.created_at,
      periods: (periodsByActivation.get(a.id) ?? []).map((p) => ({ started_at: p.started_at, ended_at: p.ended_at })),
      check_ins: (checkInsByActivation.get(a.id) ?? [])
        .slice()
        .sort((x, y) => x.check_in_date.localeCompare(y.check_in_date))
        .map((c) => ({ date: c.check_in_date, answer: c.response_option, note: c.note })),
    })),
    facet_reveals: input.reveals.map((r) => ({ facet: facetDisplayLabel(r.facet_id), at: r.revealed_at ?? r.created_at ?? null })),
  }
}
