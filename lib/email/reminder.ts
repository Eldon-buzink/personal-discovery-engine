import { format } from 'date-fns'
import { emailLayout } from './layout'

// The one reminder for saved, unfinished progress (app/api/cron/saved-progress).
// "First trait" until a trait has been revealed; after that, "next trait",
// so the email never says something that isn't true for this person.
export function reminderEmail(o: {
  answered: number
  toNextTrait: number | null
  hasTrait: boolean
  keptUntil: Date
  link: string
}): { subject: string; html: string; text: string } {
  const which = o.hasTrait ? 'next' : 'first'
  const subject = `You're ${o.answered} ${o.answered === 1 ? 'question' : 'questions'} in, your ${which} trait is close`
  const away = o.toNextTrait !== null
    ? `your ${which} trait is about ${o.toNextTrait} ${o.toNextTrait === 1 ? 'answer' : 'answers'} away`
    : `your ${which} trait is close`
  const body = `You've already done the hardest part. Your answers are saved and ${away}. Pick it up whenever you're ready.`
  const footer = `This is the only reminder we'll send. Your progress is kept until ${format(o.keptUntil, 'MMMM d')}.`
  const html = emailLayout({
    preheader: `Your answers are saved and ${away}.`,
    heading: 'Pick up where you stopped',
    body,
    button: { label: 'Continue where I stopped', href: o.link },
    note: 'The link works for 24 hours, on any device.',
    footer,
  })
  const text = `${body}\n\nContinue where I stopped: ${o.link}\n(The link works for 24 hours, on any device.)\n\n${footer}`
  return { subject, html, text }
}
