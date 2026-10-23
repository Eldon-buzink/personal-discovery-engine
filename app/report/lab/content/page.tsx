import { buildMetadata } from '@/lib/seo'
import { CLUSTERS, familyLabel } from '@/lib/lab/filterLab'
import { CLUSTER_DESCRIPTIONS } from '@/lib/lab/contentLab'

// Report lab, content per selection: the options board. Every state as a
// real render at 390 and 1280. Not indexed; nothing calls a model.
export const metadata = buildMetadata({ path: '/report/lab/content', title: 'Report lab: content | Bearing', description: 'Report lab, content per selection.', noindex: true })

const BOARD: { section: string; items: { label: string; q: string }[] }[] = [
  { section: 'What stands out, and a cluster selected (no generation)', items: [
    { label: 'Overview: 30 traits', q: 'view=overview' },
    { label: 'Overview: 12 traits', q: 'view=overview&n=12' },
    { label: 'Emotional range', q: 'view=emotional-range' },
    { label: 'Drive and discipline (with the tension box)', q: 'view=drive-and-discipline' },
  ] },
  { section: 'Outer blobs around a selected trait: three options', items: [
    { label: 'Breathe (slow, about 6%, staggered)', q: 'view=emotional-range&trait=easygoing&sat=breathe' },
    { label: 'Soft (lighter than the centre)', q: 'view=emotional-range&trait=easygoing&sat=soft' },
    { label: 'Ring (thin ring in the trait colour)', q: 'view=emotional-range&trait=easygoing&sat=ring' },
  ] },
  { section: 'Overview (merged): nothing selected, Summary underneath', items: [
    { label: 'Overview', q: 'view=overview' },
    { label: 'Overview, evidence panel open', q: 'view=overview&ev=1' },
    { label: 'Menu open', q: 'view=overview&menu=1' },
    { label: 'A blob selected (Take-charge): card, Back, cluster link', q: 'view=overview&trait=take-charge' },
  ] },
  { section: 'Clusters (layout b, description draft 2): nothing selected, reading underneath', items: [
    { label: 'Drive and discipline (with the tension box)', q: 'view=drive-and-discipline' },
    { label: 'Drive and discipline, evidence panel open', q: 'view=drive-and-discipline&ev=1' },
    { label: 'Getting along (no tension)', q: 'view=getting-along' },
    { label: 'Emotional range (Depression is never sent: 5 rows)', q: 'view=emotional-range&ev=1' },
    { label: 'A blob selected (Ambitious, with its relationship insight)', q: 'view=drive-and-discipline&trait=ambitious' },
  ] },
  { section: 'Clusters, alternative without generation: description + the two most pronounced headlines', items: [
    { label: 'Emotional range', q: 'view=emotional-range&alt=1' },
    { label: 'Social energy', q: 'view=social-energy&alt=1' },
    { label: 'Ideas and experiences', q: 'view=ideas-and-experiences&alt=1' },
    { label: 'Getting along', q: 'view=getting-along&alt=1' },
    { label: 'Drive and discipline', q: 'view=drive-and-discipline&alt=1' },
  ] },
  { section: 'Loading, failure, fewer traits', items: [
    { label: 'Summary loading', q: 'view=overview&st=loading' },
    { label: 'Summary failed: the most pronounced headlines', q: 'view=overview&st=failed' },
    { label: 'Cluster reading loading', q: 'view=drive-and-discipline&st=loading' },
    { label: 'Cluster reading failed: the six headlines', q: 'view=drive-and-discipline&st=failed' },
    { label: 'Paid, 7 traits: no Summary yet, headlines', q: 'view=overview&n=7' },
    { label: 'Paid, 12 traits: Summary says it uses 12', q: 'view=overview&n=12' },
    { label: 'Paid, 12 traits: a cluster with fewer than 3', q: 'view=emotional-range&n=12' },
  ] },
  { section: 'Free user: per-trait hues, no menu, no cluster language, no Summary', items: [
    { label: 'Free', q: 'f=free' },
  ] },
]

function Frame({ q, width, scale }: { q: string; width: number; scale: number }) {
  const height = 1400
  return (
    <div style={{ width: width * scale, height: height * scale, overflow: 'hidden', borderRadius: 12, border: '1px solid #E5E1D5', background: '#FFFFFF', flexShrink: 0 }}>
      <iframe src={`/report/lab/content/frame?${q}`} title={`${q} at ${width}`} width={width} height={height}
        style={{ border: 0, transform: `scale(${scale})`, transformOrigin: '0 0' }} />
    </div>
  )
}

export default function LabContentPage() {
  return (
    <div style={{ background: '#EFEBE2', minHeight: '100vh', padding: '32px 24px 80px', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 36, textAlign: 'center', margin: '0 0 6px' }}>Report lab: content</h1>
      <p style={{ textAlign: 'center', color: '#6B675F', fontSize: 14, margin: '0 0 32px' }}>Each state at 390 (left) and 1280 (right). Placeholder text is marked [LAB COPY]. Nothing here calls a model.</p>
      {BOARD.map((s) => (
        <section key={s.section} style={{ marginBottom: 56 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, margin: '0 0 16px' }}>{s.section}</h2>
          {s.items.map((it) => (
            <div key={it.q} style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 14, color: '#56534D', margin: '0 0 8px' }}>{it.label} · <a href={`/report/lab/content/frame?${it.q}`}>open</a></p>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', overflowX: 'auto' }}>
                <Frame q={it.q} width={390} scale={0.62} />
                <Frame q={it.q} width={1280} scale={0.45} />
              </div>
            </div>
          ))}
        </section>
      ))}
      <section style={{ maxWidth: 860, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, margin: '0 0 16px' }}>Static cluster descriptions: two drafts each</h2>
        {CLUSTERS.map((c) => (
          <div key={c} style={{ marginBottom: 28 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 20, margin: '0 0 8px' }}>{familyLabel(c)}</h3>
            {CLUSTER_DESCRIPTIONS[c].map((d, i) => (
              <div key={i} style={{ background: '#FFFFFF', borderRadius: 12, padding: '12px 16px', marginBottom: 8 }}>
                <p style={{ fontSize: 15, color: '#262420', margin: '0 0 6px' }}><strong>Draft {i + 1}.</strong> {d.text}</p>
                <p style={{ fontSize: 13, color: '#8C8A83', margin: 0 }}>{d.covers.map((x) => `"${x.phrase}" = ${x.facet}`).join(' · ')}</p>
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  )
}
