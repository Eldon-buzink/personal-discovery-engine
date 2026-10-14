/**
 * lib/known/modelOptions.ts
 *
 * Which request options a model accepts. Sonnet 5.5 (and other current
 * models) return a 400 for a non-default temperature; Haiku 4.5 accepts it.
 * Anything not known to accept it gets no temperature at all.
 *
 * Also the time budget for one generation (a card or an insight, retry
 * included). Next 14 runs a page's server actions one at a time, so a slow
 * call holds up every card queued behind it; the budget caps that wait.
 */

const TEMPERATURE_MODELS = ['claude-haiku-4-5']

export function acceptsTemperature(model: string): boolean {
  return TEMPERATURE_MODELS.some((prefix) => model.startsWith(prefix))
}

// The temperature to send, or undefined (omit the parameter) for models that
// reject it.
export function temperatureFor(model: string, wanted: number): number | undefined {
  return acceptsTemperature(model) ? wanted : undefined
}

// Whole generation, both attempts together. Past it the card counts as a
// failed generation (Retry button).
export const GENERATION_BUDGET_MS = 20_000
// Not worth starting an attempt with less time than this left.
const MIN_ATTEMPT_MS = 3_000

// The request timeout for the next attempt, or null when there isn't enough
// of the budget left to start one.
export function attemptTimeout(startedAt: number, now: number): number | null {
  const left = GENERATION_BUDGET_MS - (now - startedAt)
  return left >= MIN_ATTEMPT_MS ? left : null
}
