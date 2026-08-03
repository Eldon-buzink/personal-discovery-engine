import 'server-only'

// ImageResponse (Satori) needs raw TTF/OTF bytes, not woff2 — Google Fonts'
// CSS endpoint serves different formats depending on User-Agent, and a
// plain fetch() (no browser UA) gets served ttf, which Satori can parse.
// Restricting `text` to the exact glyphs used keeps the downloaded font
// subset tiny instead of pulling the whole family.
export async function loadGoogleFont(family: string, weight: number, text: string): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`
  const css = await fetch(cssUrl).then(res => res.text())
  const match = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/)
  if (!match) throw new Error(`loadGoogleFont: no ttf/otf src found for ${family}`)
  const fontRes = await fetch(match[1])
  return fontRes.arrayBuffer()
}
