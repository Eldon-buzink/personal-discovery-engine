'use client'

import { useEffect } from 'react'

// Dev-only theme lab. Rendered only when NEXT_PUBLIC_THEME_LAB=1 (see
// app/layout.tsx), so it never ships to production. Reads ?sans= and ?bg=
// from the URL and sets them as data attributes on <html>; app/globals.css
// switches the font and background tokens on those attributes.
//
//   ?sans=inter (default) | instrument
//   ?bg=a (default) | b | c | d
const SANS = ['inter', 'instrument']
const BG = ['a', 'b', 'c', 'd']

export default function ThemeLab() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sans = params.get('sans')
    const bg = params.get('bg')
    const root = document.documentElement
    if (sans && SANS.includes(sans)) root.dataset.sans = sans
    if (bg && BG.includes(bg)) root.dataset.bg = bg
  }, [])
  return null
}
