/**
 * lib/known/modelOptions.ts
 *
 * Which request options a model accepts. Sonnet 5.5 (and other current
 * models) return a 400 for a non-default temperature; Haiku 4.5 accepts it.
 * Anything not known to accept it gets no temperature at all.
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
