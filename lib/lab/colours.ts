// Report lab: cluster colours as hue, saturation and lightness (Palette 1,
// Social energy muted), and blob gradient stops built from a full colour.
// A plain hue number still means today's blob colour (80% / 62%), so older
// lab boards and the free users' per-trait hues render exactly as before.
//
// Palette 1, muted green, simulated (Machado 2009) minimum pairwise
// CIEDE2000: normal 29.5, protan 20.3, deutan 12.9, tritan 16.2; weakest
// against the cream 21.7 (the green).

export type HSL = [number, number, number]

export const CLUSTER_COLOURS: Record<string, HSL> = {
  Neuroticism: [250, 70, 42],
  Extraversion: [130, 55, 60],
  Openness: [340, 55, 42],
  Agreeableness: [200, 85, 42],
  Conscientiousness: [20, 55, 52],
}

export type Colour = number | HSL

export const toHsl = (c: Colour): HSL => (typeof c === 'number' ? [c, 80, 62] : c)
export const colourKey = (c: Colour) => toHsl(c).join('-')

const clamp = (v: number) => Math.max(0, Math.min(100, v))
export const hslCss = ([h, s, l]: HSL, ds = 0, dl = 0) => `hsl(${h},${clamp(s + ds)}%,${clamp(l + dl)}%)`

/** The "active" blob gradient (blobGradientStops in lib/blobs.ts) for any colour; identical to it for [h, 80, 62]. */
export function blobStops(c: Colour): { offset: string; color: string; opacity: number }[] {
  const x = toHsl(c)
  return [
    { offset: '0%', color: hslCss(x), opacity: 1 },
    { offset: '45%', color: hslCss(x, -2, -2), opacity: 0.88 },
    { offset: '75%', color: hslCss(x, -10, 6), opacity: 0.4 },
    { offset: '100%', color: hslCss(x, -20, 18), opacity: 0 },
  ]
}

/** Dark text in the colour's own hue (the centre trait word on a blob). */
export const inkFor = (c: Colour) => `hsl(${toHsl(c)[0]},45%,24%)`
