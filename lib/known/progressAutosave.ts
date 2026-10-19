import { autosaveProgress } from '@/app/actions/anonymousSession'

// Set once the in-progress assessment has been saved with an email ("Finish
// later", or the save prompt after the first trait): the anonymous_sessions
// row id. While it is set, the assessment keeps that saved copy up to date.
export const SAVED_PROGRESS_KEY = 'known_saved_progress_id'

const DELAY_MS = 2500
let timer: ReturnType<typeof setTimeout> | undefined

// Called after every local save of the session. Waits for a pause in
// answering, then sends the latest copy; does nothing until the progress
// has been saved with an email.
export function scheduleProgressAutosave(): void {
  if (typeof window === 'undefined') return
  let id: string | null = null
  try { id = localStorage.getItem(SAVED_PROGRESS_KEY) } catch { return }
  if (!id) return
  clearTimeout(timer)
  timer = setTimeout(() => {
    try {
      const raw = localStorage.getItem('known_session')
      if (raw) autosaveProgress(id!, JSON.parse(raw)).catch(() => {})
    } catch {}
  }, DELAY_MS)
}
