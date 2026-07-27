import Link from 'next/link'
import GlowCard from './GlowCard'
import { blogCharcoal, blogCream, blogPeriwinkle, blogRose, blogSans, blogSerif } from './tokens'

// MDX shortcode — authors drop <AssessmentCTA /> into a post body wherever
// it makes sense as a genuine break in the reading flow, rather than this
// being pinned to a fixed position in the template. Registered in the MDX
// `components` map passed to MDXRemote (see [slug]/page.tsx).
export default function AssessmentCTA() {
  return (
    <GlowCard
      variant="card-dark"
      glows={[
        { color: blogPeriwinkle, size: 200, top: -60, left: -40 },
        { color: blogRose, size: 180, bottom: -60, right: -30 },
      ]}
      blur={75}
      glowOpacity={0.65}
      borderRadius={24}
      padding="48px 40px"
      style={{ textAlign: 'center', margin: '44px 0' }}
    >
      <div style={{ maxWidth: 400, margin: '0 auto' }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#D9D4C7', marginBottom: 16 }}>
          Free · Private · 15 minutes
        </div>
        <h4 style={{ fontFamily: blogSerif, fontWeight: 500, fontStyle: 'italic', fontSize: 24, lineHeight: 1.3, color: blogCream, marginBottom: 12 }}>
          See where you actually land.
        </h4>
        <p style={{ fontSize: 14, color: '#E4E0D6', lineHeight: 1.6, marginBottom: 22 }}>
          Get your full trait profile across all five domains, free — grounded in the same research this article comes from.
        </p>
        <Link href="/onboarding">
          <button style={{ background: blogCream, color: blogCharcoal, border: 'none', padding: '13px 26px', borderRadius: 100, fontWeight: 600, fontSize: 14.5, cursor: 'pointer', fontFamily: blogSans }}>
            Start your report — it&apos;s free
          </button>
        </Link>
        <div style={{ fontSize: 12, color: '#C4BFB2', marginTop: 14 }}>No account to start · No credit card</div>
      </div>
    </GlowCard>
  )
}
