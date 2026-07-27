import type { CSSProperties, ReactNode } from 'react'
import { blogCharcoal, blogCream, blogHeroCardBg, blogCardDark, blogLine, blogSans } from './tokens'

// Shared glow-card shell — the post hero header, mid-article CTA, index
// bento tiles, and index CTA strip all use this component instead of each
// duplicating the "absolute-positioned blurred circle behind content" markup.
// Every instance differs in glow count/color/size/position/blur/opacity, so
// those are all props rather than baked in — variant only fixes the
// background/text-color pairing, since the mockups use exactly three
// distinct dark/light surface colors across every glow-card instance (see
// tokens.ts for why charcoal and card-dark are genuinely different, not a
// duplicate of the same dark).

export interface GlowSpec {
  color: string
  size: number
  // number = px; string lets a specific glow use a percentage offset (the
  // index CTA strip's second glow is right:10% in the mockup, not a fixed px).
  top?: number | string
  left?: number | string
  right?: number | string
  bottom?: number | string
}

export type GlowCardVariant = 'light' | 'charcoal' | 'card-dark'

const VARIANT_STYLES: Record<GlowCardVariant, CSSProperties> = {
  light: { background: blogHeroCardBg, border: `1px solid ${blogLine}`, color: blogCharcoal },
  charcoal: { background: blogCharcoal, border: 'none', color: blogCream },
  'card-dark': { background: blogCardDark, border: 'none', color: blogCream },
}

export default function GlowCard({
  variant,
  glows,
  blur,
  glowOpacity,
  borderRadius,
  padding,
  style,
  className,
  children,
}: {
  variant: GlowCardVariant
  glows: GlowSpec[]
  blur: number
  glowOpacity: number
  borderRadius: number
  padding: string
  style?: CSSProperties
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
        borderRadius,
        padding,
        fontFamily: blogSans,
        ...VARIANT_STYLES[variant],
        ...style,
      }}
    >
      {glows.map((g, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            borderRadius: '50%',
            filter: `blur(${blur}px)`,
            opacity: glowOpacity,
            zIndex: 0,
            width: g.size,
            height: g.size,
            background: g.color,
            top: g.top,
            left: g.left,
            right: g.right,
            bottom: g.bottom,
          }}
        />
      ))}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}
