import { accentHue } from '@/lib/blog/theme'

// A small set of organic asymmetric border-radius values, matching the
// varied blob shapes each .more-thumb .shape gets by hand in the mockup
// (e.g. "55% 45% 60% 40%/45% 55% 45% 55%"). Picked deterministically per
// post (by slug) rather than randomly, so a given post's thumbnail shape is
// stable across renders/reloads instead of jittering.
const BLOB_RADII = [
  '55% 45% 60% 40% / 45% 55% 45% 55%',
  '40% 60% 45% 55% / 55% 45% 60% 40%',
  '50% 50% 40% 60% / 60% 40% 60% 40%',
  '60% 40% 50% 50% / 45% 55% 45% 55%',
  '45% 55% 55% 45% / 50% 50% 50% 50%',
]

function hashSlug(slug: string): number {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 9973
  return h
}

export default function PostThumbnail({ slug, accentColor, size = 64 }: { slug: string; accentColor: string; size?: number }) {
  const hue = accentHue(accentColor)
  const radius = BLOB_RADII[hashSlug(slug) % BLOB_RADII.length]
  return (
    <div
      style={{
        width: size, height: size, borderRadius: size >= 64 ? 14 : 10,
        flexShrink: 0, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(160deg, hsl(${hue},60%,88%), hsl(${hue},60%,78%))`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: size * 0.69, height: size * 0.625,
          top: size * 0.19, left: size * 0.156,
          borderRadius: radius,
          background: `hsl(${hue},65%,55%)`,
          opacity: 0.85,
        }}
      />
    </div>
  )
}
