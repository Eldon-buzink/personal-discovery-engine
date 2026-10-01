'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AnimatedBlob from '@/components/known/AnimatedBlob'
import { createClient } from '@/lib/supabase/client'
import { fetchIsPaid } from '@/lib/known/paywall'
import {
  MINI_ASSESSMENT_SLUG_TO_FACET,
  MINI_ASSESSMENT_ITEMS,
  MINI_ASSESSMENT_DISPLAY_LABEL,
  type MiniAssessmentSlug,
} from '@/lib/known/miniAssessmentScoring'
import { LANDING_COPY, LANDING_SHARED, LANDING_STEPS, type LandingAngle } from '@/lib/known/miniAssessmentLanding'
import { START_LANDING_CSS, mkCream, mkCharcoal, sans } from '../startLandingShared'

export default function StartLandingClient({ slug, angle }: { slug: MiniAssessmentSlug; angle: LandingAngle }) {
  const router = useRouter()
  const facet = MINI_ASSESSMENT_SLUG_TO_FACET[slug]
  const label = MINI_ASSESSMENT_DISPLAY_LABEL[facet]
  const copy = LANDING_COPY[slug][angle]
  const firstItem = MINI_ASSESSMENT_ITEMS[facet][0].text
  const quizHref = `/mini-assessment/${slug}`

  // Mirrors the quiz page's own is_paid gate (app/mini-assessment/[facet]/
  // page.tsx) but non-blocking: that page holds render until the check
  // resolves, which is right for the quiz itself but wrong here — this page
  // exists to receive ad traffic, most of which is logged-out, and nothing
  // should make that visitor wait on an auth round-trip. Content renders
  // immediately; a paid user (stale ad link, shared URL, bookmarked result)
  // is redirected to /practice as soon as the check resolves a moment later.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user && (await fetchIsPaid(user.id))) router.replace('/practice')
    })
  }, [router])

  return (
    <>
      <style>{START_LANDING_CSS}</style>
      <div style={{ background: mkCream, color: mkCharcoal, fontFamily: sans }}>
        <section className="hero">
          <div className="hero-inner">
            <div>
              <p className="mk-eyebrow">{label} · quick check</p>
              <h1>{copy.headline}</h1>
              <p>{copy.subhead}</p>
              <div className="hero-cta-row">
                <Link href={quizHref}>
                  <button className="mk-btn">{LANDING_SHARED.cta}</button>
                </Link>
              </div>
              <span className="mk-microcopy" style={{ display: 'block', marginTop: 14 }}>
                {LANDING_SHARED.microcopy}
              </span>
            </div>
            <div className="hero-blob-wrap">
              <AnimatedBlob seed={`start-${slug}`} size={240} word={label} />
            </div>
          </div>
        </section>

        <section className="wrap" style={{ paddingBottom: 56 }}>
          <div className="start-preview-card">
            <p className="mk-eyebrow" style={{ marginBottom: 12 }}>{LANDING_SHARED.previewLabel}</p>
            <p className="start-preview-text">{firstItem}</p>
            <div className="start-preview-scale">
              <span>{LANDING_SHARED.previewScaleLabels[0]}</span>
              <span className="start-preview-dots" aria-hidden="true">
                {[0, 1, 2, 3, 4].map(i => <span key={i} />)}
              </span>
              <span>{LANDING_SHARED.previewScaleLabels[1]}</span>
            </div>
          </div>
        </section>

        <section className="wrap" style={{ paddingBottom: 56 }}>
          <div className="section-head">
            <h2>How it works</h2>
          </div>
          <div className="how-steps">
            {LANDING_STEPS.map((step, i) => (
              <div className="step" key={step.title}>
                <div className="step-mark">{i + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="wrap" style={{ textAlign: 'center', paddingBottom: 72 }}>
          <Link href={quizHref}>
            <button className="mk-btn">{LANDING_SHARED.cta}</button>
          </Link>
          <p className="mk-microcopy" style={{ margin: '16px auto 0', maxWidth: 420 }}>
            {LANDING_SHARED.honesty}
          </p>
        </section>
      </div>
    </>
  )
}
