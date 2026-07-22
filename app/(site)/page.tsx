'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Design tokens ────────────────────────────────────────────────────────────
const cream    = '#F5F2EB'
const charcoal = '#1C1C1A'
const warmMid  = '#E8E3D8'
const c80 = 'rgba(28,28,26,0.8)'
const c40 = 'rgba(28,28,26,0.4)'
const c12 = 'rgba(28,28,26,0.12)'
const sans  = "var(--font-inter), -apple-system, sans-serif"
const serif = "var(--font-newsreader), Georgia, serif"

// ─── Blob engine (ported from reference/known-landing-v13_5.html) ─────────────
const USER_SEED = 'u_played-2826-deliberate-autonomous'
const NS = 'http://www.w3.org/2000/svg'

function hashSeed(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 9973
  return h
}

function seededRandom(s0: number): () => number {
  let seed = s0
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CURATED_HUES = [8, 35, 145, 175, 205, 235, 290, 335]
function userCuratedHue(seedStr: string, offset: number): number {
  const bucket = hashSeed(seedStr + offset) % CURATED_HUES.length
  const jitter  = (hashSeed(seedStr + offset + 'jitter') % 21) - 10
  return (CURATED_HUES[bucket] + jitter + 360) % 360
}

interface BP { phase: number; freq: number; ampScale: number }

function buildPointMotionProfile(seed: number, points: number): BP[] {
  const rand = seededRandom(seed)
  const out: BP[] = []
  for (let i = 0; i < points; i++)
    out.push({ phase: rand() * Math.PI * 2, freq: 0.4 + rand() * 0.5, ampScale: 0.7 + rand() * 0.6 })
  return out
}

function generateAnimatedBlobPath(
  cx: number, cy: number, r: number, profile: BP[], irr: number, t: number
): string {
  const n = profile.length
  const step = (Math.PI * 2) / n
  const pts = profile.map((p, i) => {
    const wobble = Math.sin(t * p.freq + p.phase) * irr * p.ampScale
    const rad = r * (1 + wobble)
    return { x: cx + Math.cos(i * step) * rad, y: cy + Math.sin(i * step) * rad }
  })
  const cb = (p0: {x:number;y:number}, p1: {x:number;y:number}, p2: {x:number;y:number}, p3: {x:number;y:number}) => ({
    c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
    c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
    end: p2,
  })
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} `
  for (let i = 0; i < n; i++) {
    const seg = cb(pts[(i-1+n)%n], pts[i], pts[(i+1)%n], pts[(i+2)%n])
    d += `C ${seg.c1.x.toFixed(1)} ${seg.c1.y.toFixed(1)}, ${seg.c2.x.toFixed(1)} ${seg.c2.y.toFixed(1)}, ${seg.end.x.toFixed(1)} ${seg.end.y.toFixed(1)} `
  }
  return d + 'Z'
}

function makeBlobSvg(vw: number, vh: number, blur: number) {
  const svg  = document.createElementNS(NS, 'svg') as SVGSVGElement
  svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`)
  svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%')
  svg.style.cssText = 'overflow:visible;position:absolute;left:0;top:0;'
  const defs = document.createElementNS(NS, 'defs') as SVGDefsElement
  svg.appendChild(defs)
  const fid = 'f' + Math.random().toString(36).slice(2)
  const flt = document.createElementNS(NS, 'filter') as SVGFilterElement
  flt.setAttribute('id', fid); flt.setAttribute('x','-50%'); flt.setAttribute('y','-50%')
  flt.setAttribute('width','200%'); flt.setAttribute('height','200%')
  flt.innerHTML = `<feGaussianBlur stdDeviation="${blur}"/>`
  defs.appendChild(flt)
  return { svg, defs, fid }
}

function makeBlobPath(defs: SVGDefsElement, base: string, hue: number, active: boolean, fid: string): SVGPathElement {
  const gid = base + '-' + Math.random().toString(36).slice(2)
  const g = document.createElementNS(NS, 'radialGradient') as SVGRadialGradientElement
  g.setAttribute('id', gid); g.setAttribute('cx','45%'); g.setAttribute('cy','40%'); g.setAttribute('r','70%')
  g.innerHTML = active
    ? `<stop offset="0%" stop-color="hsl(${hue},80%,62%)" stop-opacity="1"/>
       <stop offset="45%" stop-color="hsl(${hue},78%,60%)" stop-opacity="0.88"/>
       <stop offset="75%" stop-color="hsl(${hue},70%,68%)" stop-opacity="0.4"/>
       <stop offset="100%" stop-color="hsl(${hue},60%,80%)" stop-opacity="0"/>`
    : `<stop offset="0%" stop-color="hsl(${hue},60%,76%)" stop-opacity="0.6"/>
       <stop offset="100%" stop-color="hsl(${hue},55%,85%)" stop-opacity="0"/>`
  defs.appendChild(g)
  const p = document.createElementNS(NS, 'path') as SVGPathElement
  p.setAttribute('fill', `url(#${gid})`); p.setAttribute('filter', `url(#${fid})`)
  return p
}

// ─── Master RAF (module-level singleton) ──────────────────────────────────────
const _tasks: Array<(t: number) => void> = []
let _raf: number | null = null
let _t0: number | null = null

function registerBlobTask(fn: (t: number) => void): () => void {
  _tasks.push(fn)
  if (_raf === null && typeof requestAnimationFrame !== 'undefined') {
    const tick = (ts: number) => {
      if (_t0 === null) _t0 = ts
      const t = (ts - _t0) / 1000
      _tasks.forEach(f => f(t))
      _raf = requestAnimationFrame(tick)
    }
    _raf = requestAnimationFrame(tick)
  }
  return () => {
    const i = _tasks.indexOf(fn)
    if (i >= 0) _tasks.splice(i, 1)
  }
}

// ─── Responsive CSS ───────────────────────────────────────────────────────────
const landingCSS = `
  .lp-hero-inner{display:flex;align-items:center;gap:80px;max-width:1100px;width:100%;}
  .lp-bento-r1{display:grid;grid-template-columns:1.4fr 1fr;gap:16px;}
  .lp-bento-r1-right{display:flex;flex-direction:column;gap:16px;}
  .lp-bento-r2{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:16px;}
  .lp-stepper-track{display:grid;grid-template-columns:repeat(4,1fr);position:relative;}
  .lp-stepper-track::before{content:'';position:absolute;top:28px;left:calc(12.5%);right:calc(12.5%);height:1px;background:rgba(28,28,26,0.12);z-index:0;}
  .lp-report-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;}
  .lp-reveal-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
  @media(max-width:900px){
    .lp-hero-inner{flex-direction:column;gap:48px;}
    .lp-bento-r1{grid-template-columns:1fr;}
    .lp-bento-r2{grid-template-columns:1fr;}
    .lp-stepper-track{grid-template-columns:1fr 1fr;}
    .lp-stepper-track::before{display:none;}
    .lp-report-grid{grid-template-columns:1fr;}
    .lp-reveal-grid{grid-template-columns:1fr;}
  }
  @media(max-width:600px){
    .lp-stepper-track{grid-template-columns:1fr;}
  }
`

// ─── HeroBlobs ────────────────────────────────────────────────────────────────
function HeroBlobs() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const wrap = ref.current; if (!wrap) return
    const VW = 520, VH = 540
    const { svg, defs, fid } = makeBlobSvg(VW, VH, 18)
    const CX = VW * 0.5, CY = VH * 0.48
    const TRAITS = [
      { word:'Deliberate', hueOff:0,  orbitX:115, orbitY:115, orbitR:72 },
      { word:'Autonomous', hueOff:5,  orbitX:392, orbitY: 75, orbitR:80 },
      { word:'Reflective', hueOff:10, orbitX:105, orbitY:390, orbitR:68 },
      { word:'Durable',    hueOff:20, orbitX:378, orbitY:415, orbitR:64 },
      { word:'Creative',   hueOff:15, orbitX:260, orbitY: 55, orbitR:60 },
    ]
    const ACTIVE_R = 140
    let activeIdx = 0

    type TD = typeof TRAITS[0] & {
      hue:number; profile:BP[]; grad:SVGRadialGradientElement; pathEl:SVGPathElement;
      curX:number; curY:number; curR:number; curActive:number;
    }
    const tData: TD[] = TRAITS.map((tr, i) => {
      const hue = userCuratedHue(USER_SEED, tr.hueOff)
      const profile = buildPointMotionProfile(hashSeed(tr.word + '-shape'), 9)
      const gid = `hg${i}-${Math.random().toString(36).slice(2)}`
      const grad = document.createElementNS(NS, 'radialGradient') as SVGRadialGradientElement
      grad.setAttribute('id', gid); grad.setAttribute('cx','45%'); grad.setAttribute('cy','40%'); grad.setAttribute('r','70%')
      defs.appendChild(grad)
      const pathEl = document.createElementNS(NS, 'path') as SVGPathElement
      pathEl.setAttribute('fill', `url(#${gid})`); pathEl.setAttribute('filter', `url(#${fid})`)
      svg.appendChild(pathEl)
      return { ...tr, hue, profile, grad, pathEl,
        curX: i===0 ? CX : tr.orbitX, curY: i===0 ? CY : tr.orbitY,
        curR: i===0 ? ACTIVE_R : tr.orbitR, curActive: i===0 ? 1 : 0 }
    })

    const setGrad = (td: TD, w: number) => {
      const h = td.hue
      td.grad.innerHTML = `
        <stop offset="0%" stop-color="hsl(${h},${(65+w*15).toFixed(0)}%,${(70-w*8).toFixed(0)}%)" stop-opacity="${(0.6+w*0.38).toFixed(2)}"/>
        <stop offset="50%" stop-color="hsl(${h},${(60+w*18).toFixed(0)}%,${(72-w*12).toFixed(0)}%)" stop-opacity="${(0.38+w*0.50).toFixed(2)}"/>
        <stop offset="80%" stop-color="hsl(${h},55%,80%)" stop-opacity="${(w*0.40).toFixed(2)}"/>
        <stop offset="100%" stop-color="hsl(${h},50%,85%)" stop-opacity="0"/>`
    }
    tData.forEach(td => setGrad(td, td.curActive))
    wrap.insertBefore(svg, wrap.firstChild)

    const lblCss = `position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);pointer-events:none;font-family:'Newsreader',Georgia,serif;font-style:italic;font-size:34px;letter-spacing:-0.02em;white-space:nowrap;will-change:opacity;`
    const lblA = document.createElement('div')
    const lblB = document.createElement('div')
    lblA.style.cssText = lblCss + 'opacity:1;'
    lblB.style.cssText = lblCss + 'opacity:0;'
    lblA.textContent = TRAITS[0].word; lblA.style.color = `hsl(${tData[0].hue},40%,22%)`
    lblB.textContent = ''; lblB.style.color = `hsl(${tData[0].hue},40%,22%)`
    wrap.appendChild(lblA); wrap.appendChild(lblB)

    const orbitLbls = tData.map((td, i) => {
      const lbl = document.createElement('div')
      lbl.style.cssText = `position:absolute;transform:translate(-50%,-50%);pointer-events:none;font-family:Inter,sans-serif;font-size:14px;font-weight:500;color:rgba(28,28,26,0.7);letter-spacing:0.005em;transition:opacity 0.4s ease;`
      lbl.textContent = td.word
      lbl.style.opacity = i === 0 ? '0' : '1'
      wrap.appendChild(lbl)
      return lbl
    })

    const lerp = (a:number,b:number,t:number) => a+(b-a)*t
    const lerpHue = (a:number,b:number,t:number) => { let d=b-a; if(d>180)d-=360; if(d<-180)d+=360; return a+d*t }
    let traitTimer = 0, crossfading = false, crossFrame = 0
    let activeLbl = lblA, inactiveLbl = lblB
    const INTERVAL = 220, CROSS = 40
    let currentHue = tData[0].hue, targetHue = tData[0].hue

    const unreg = registerBlobTask(t => {
      tData.forEach((td, i) => {
        const isA = i === activeIdx
        td.curX = lerp(td.curX, isA ? CX : td.orbitX, 0.055)
        td.curY = lerp(td.curY, isA ? CY : td.orbitY, 0.055)
        td.curR = lerp(td.curR, isA ? ACTIVE_R : td.orbitR, 0.055)
        td.curActive = lerp(td.curActive, isA ? 1 : 0, 0.044)
        setGrad(td, td.curActive)
        td.pathEl.setAttribute('d', generateAnimatedBlobPath(td.curX, td.curY, td.curR, td.profile, 0.3, t))
        if (!isA) {
          const belowCentre = td.curY > CY * 0.7
          const ly = td.curY + (belowCentre ? -(td.curR * 0.55 + 18) : (td.curR * 0.55 + 18))
          orbitLbls[i].style.left = (td.curX / VW * 100) + '%'
          orbitLbls[i].style.top  = (ly / VH * 100) + '%'
          orbitLbls[i].style.opacity = Math.min(1, (1 - td.curActive) * 1.4).toFixed(2)
        } else {
          orbitLbls[i].style.opacity = '0'
        }
      })
      if (Math.abs(currentHue - targetHue) > 0.3)
        currentHue = lerpHue(currentHue, targetHue, 0.028)
      traitTimer++
      if (!crossfading && traitTimer >= INTERVAL) {
        const next = (activeIdx + 1) % TRAITS.length
        activeIdx = next; targetHue = tData[next].hue
        inactiveLbl.textContent = TRAITS[next].word
        inactiveLbl.style.color = `hsl(${tData[next].hue},40%,22%)`
        inactiveLbl.style.opacity = '0'
        crossfading = true; crossFrame = 0; traitTimer = 0
      }
      if (crossfading) {
        crossFrame++
        const p = Math.min(1, crossFrame / CROSS), e = p * p * (3 - 2 * p)
        activeLbl.style.opacity   = (1 - e).toFixed(3)
        inactiveLbl.style.opacity = e.toFixed(3)
        if (crossFrame >= CROSS) { [activeLbl, inactiveLbl] = [inactiveLbl, activeLbl]; crossfading = false }
      }
    })

    return () => {
      unreg()
      ;[svg, lblA, lblB, ...orbitLbls].forEach(el => { if (el.parentNode === wrap) wrap.removeChild(el) })
    }
  }, [])
  return <div ref={ref} style={{ position:'relative', width:520, height:540, flexShrink:0 }} />
}

// ─── FactsBlobs ───────────────────────────────────────────────────────────────
function FactsBlobs() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const svgWrap = ref.current; if (!svgWrap) return
    const section = svgWrap.closest('section') as HTMLElement | null
    if (!section) return
    let unreg: (() => void) | null = null
    const frame = requestAnimationFrame(() => {
      const sW = section.clientWidth, sH = section.clientHeight
      const nums = section.querySelectorAll<HTMLElement>('.fact-num')
      const sRect = section.getBoundingClientRect()
      const grid  = section.querySelector('.facts-grid')
      const gRect = grid?.getBoundingClientRect()
      const gridTop = gRect ? gRect.top - sRect.top : sH * 0.58
      const blobCY  = gridTop + 44
      const blobCXs: number[] = []
      nums.forEach(num => {
        const r = num.getBoundingClientRect()
        blobCXs.push(r.left - sRect.left + r.width * 0.5)
      })
      if (blobCXs.length < 3) {
        const innerW = Math.min(sW - 96, 1100)
        const il = (sW - innerW) / 2, cw = (innerW - 96) / 3
        blobCXs[0] = il + cw * 0.5
        blobCXs[1] = il + cw + 48 + cw * 0.5
        blobCXs[2] = il + cw * 2 + 96 + cw * 0.5
      }
      const { svg, defs, fid } = makeBlobSvg(sW, sH, 22)
      svg.setAttribute('viewBox', `0 0 ${sW} ${sH}`)
      svg.setAttribute('preserveAspectRatio', 'none')
      svg.style.width = '100%'; svg.style.height = '100%'
      const COLS = [
        { cx:blobCXs[0], cy:blobCY, r:78, hueOff:5  },
        { cx:blobCXs[1], cy:blobCY, r:78, hueOff:15 },
        { cx:blobCXs[2], cy:blobCY, r:74, hueOff:35 },
      ]
      const blobs = COLS.map((col, i) => {
        const hue = userCuratedHue(USER_SEED, col.hueOff)
        const profile = buildPointMotionProfile(hashSeed('facts-col-' + i), 9)
        const pathEl = makeBlobPath(defs, 'fc-' + i, hue, true, fid)
        svg.appendChild(pathEl)
        return { pathEl, profile, cx:col.cx, cy:col.cy, r:col.r }
      })
      svgWrap.appendChild(svg)
      unreg = registerBlobTask(t => blobs.forEach(b =>
        b.pathEl.setAttribute('d', generateAnimatedBlobPath(b.cx, b.cy, b.r, b.profile, 0.28, t))
      ))
    })
    return () => { cancelAnimationFrame(frame); unreg?.() }
  }, [])
  return <div ref={ref} style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:1 }} />
}

// ─── BentoCluster ─────────────────────────────────────────────────────────────
function BentoCluster() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const wrap = ref.current; if (!wrap) return
    const VW = 500, VH = 320
    const { svg, defs, fid } = makeBlobSvg(VW, VH, 14)
    const TRAITS = [
      { word:'Deliberate', hueOff:0,  cx:250, cy:160, r:112, active:true  },
      { word:'Autonomous', hueOff:5,  cx:102, cy:118, r:72,  active:false },
      { word:'Reflective', hueOff:10, cx:390, cy:105, r:66,  active:false },
      { word:'Durable',    hueOff:20, cx:108, cy:235, r:62,  active:false },
      { word:'Selective',  hueOff:35, cx:385, cy:228, r:58,  active:false },
    ]
    const lblEls: HTMLDivElement[] = []
    const blobData = TRAITS.map((tr, i) => {
      const hue = userCuratedHue(USER_SEED, tr.hueOff)
      const profile = buildPointMotionProfile(hashSeed(tr.word + '-shape'), 9)
      const pathEl = makeBlobPath(defs, 'bc-' + i, hue, tr.active, fid)
      svg.appendChild(pathEl)
      const lbl = document.createElement('div')
      lbl.style.cssText = `position:absolute;transform:translate(-50%,-50%);pointer-events:none;left:${(tr.cx/VW*100).toFixed(2)}%;top:${(tr.cy/VH*100).toFixed(2)}%;`
      lbl.style.cssText += tr.active
        ? `font-family:'Newsreader',Georgia,serif;font-style:italic;font-size:22px;color:hsl(${hue},45%,24%);`
        : `font-family:Inter,sans-serif;font-size:12.5px;font-weight:500;color:rgba(28,28,26,0.58);`
      lbl.textContent = tr.word
      wrap.appendChild(lbl); lblEls.push(lbl)
      return { pathEl, profile, cx:tr.cx, cy:tr.cy, r:tr.r }
    })
    wrap.insertBefore(svg, wrap.firstChild)
    const unreg = registerBlobTask(t => blobData.forEach(b =>
      b.pathEl.setAttribute('d', generateAnimatedBlobPath(b.cx, b.cy, b.r, b.profile, 0.3, t))
    ))
    return () => {
      unreg()
      lblEls.forEach(el => { if (el.parentNode === wrap) wrap.removeChild(el) })
      if (svg.parentNode === wrap) wrap.removeChild(svg)
    }
  }, [])
  return <div ref={ref} style={{ position:'relative', flex:1, minHeight:320, margin:'20px -10px -10px', overflow:'visible' }} />
}

// ─── OrbitVisual ──────────────────────────────────────────────────────────────
function OrbitVisual() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const wrap = ref.current; if (!wrap) return
    const VW = 380, VH = 160
    const { svg, defs, fid } = makeBlobSvg(VW, VH, 12)
    const CX = VW * 0.48, CY = VH * 0.52
    const ENV = [
      { word:'Autonomy',  angle:-0.6, dist:108, r:46, hueOff:5  },
      { word:'Async',     angle:2.65, dist:100, r:42, hueOff:10 },
      { word:'Deep work', angle:0.35, dist:106, r:44, hueOff:15 },
    ]
    const lblEls: HTMLDivElement[] = []
    const envData = ENV.map((e, i) => {
      const hue = userCuratedHue(USER_SEED, e.hueOff)
      const profile = buildPointMotionProfile(hashSeed(e.word + '-env'), 8)
      const cx = CX + Math.cos(e.angle) * e.dist
      const cy = CY + Math.sin(e.angle) * e.dist * 0.65
      const pathEl = makeBlobPath(defs, 'env-' + i, hue, false, fid)
      svg.appendChild(pathEl)
      return { pathEl, profile, cx, cy, r:e.r }
    })
    const youHue = userCuratedHue(USER_SEED, 0)
    const youProfile = buildPointMotionProfile(hashSeed('you-centre'), 8)
    const youPath = makeBlobPath(defs, 'you-c', youHue, true, fid)
    svg.appendChild(youPath)
    wrap.insertBefore(svg, wrap.firstChild)
    ENV.forEach((e, i) => {
      const lbl = document.createElement('div')
      lbl.style.cssText = `position:absolute;transform:translate(-50%,-50%);pointer-events:none;font-family:Inter,sans-serif;font-size:13px;font-weight:400;color:rgba(28,28,26,0.65);left:${(envData[i].cx/VW*100).toFixed(2)}%;top:${(envData[i].cy/VH*100).toFixed(2)}%;`
      lbl.textContent = e.word; wrap.appendChild(lbl); lblEls.push(lbl)
    })
    const youLbl = document.createElement('div')
    youLbl.style.cssText = `position:absolute;transform:translate(-50%,-50%);pointer-events:none;font-family:Inter,sans-serif;font-size:13px;font-weight:500;color:hsl(${youHue},45%,24%);left:${(CX/VW*100).toFixed(2)}%;top:${(CY/VH*100).toFixed(2)}%;`
    youLbl.textContent = 'You'; wrap.appendChild(youLbl); lblEls.push(youLbl)
    const unreg = registerBlobTask(t => {
      envData.forEach(b => b.pathEl.setAttribute('d', generateAnimatedBlobPath(b.cx, b.cy, b.r, b.profile, 0.28, t)))
      youPath.setAttribute('d', generateAnimatedBlobPath(CX, CY, 20, youProfile, 0.25, t))
    })
    return () => {
      unreg()
      lblEls.forEach(el => { if (el.parentNode === wrap) wrap.removeChild(el) })
      if (svg.parentNode === wrap) wrap.removeChild(svg)
    }
  }, [])
  return <div ref={ref} style={{ position:'relative', height:170, marginTop:14, overflow:'visible' }} />
}

// ─── ConnectVisual ────────────────────────────────────────────────────────────
function ConnectVisual() {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const svg = ref.current; if (!svg) return
    const VW = 380, VH = 110, r = 38
    const youX = VW * 0.30, themX = VW * 0.66, cy = VH * 0.52
    const hue = 340
    const defs = document.createElementNS(NS, 'defs') as SVGDefsElement
    const glowId = 'cg-' + Math.random().toString(36).slice(2)
    const glowGrad = document.createElementNS(NS, 'radialGradient') as SVGRadialGradientElement
    glowGrad.setAttribute('id', glowId); glowGrad.setAttribute('cx','50%'); glowGrad.setAttribute('cy','50%'); glowGrad.setAttribute('r','50%')
    glowGrad.innerHTML = `<stop offset="0%" stop-color="hsl(${hue},70%,70%)" stop-opacity="0.35"/><stop offset="100%" stop-color="hsl(${hue},60%,80%)" stop-opacity="0"/>`
    defs.appendChild(glowGrad); svg.appendChild(defs)
    const glowC = document.createElementNS(NS, 'circle') as SVGCircleElement
    glowC.setAttribute('cx', String(themX)); glowC.setAttribute('cy', String(cy)); glowC.setAttribute('r', String(r * 1.9)); glowC.setAttribute('fill', `url(#${glowId})`); svg.appendChild(glowC)
    const line = document.createElementNS(NS, 'line') as SVGLineElement
    line.setAttribute('x1', String(youX + r)); line.setAttribute('y1', String(cy)); line.setAttribute('x2', String(themX - r)); line.setAttribute('y2', String(cy))
    line.setAttribute('stroke', 'rgba(28,28,26,0.15)'); line.setAttribute('stroke-width', '1.5'); line.setAttribute('stroke-dasharray', '4,4'); svg.appendChild(line)
    const dashed = document.createElementNS(NS, 'circle') as SVGCircleElement
    dashed.setAttribute('cx', String(themX)); dashed.setAttribute('cy', String(cy)); dashed.setAttribute('r', String(r))
    dashed.setAttribute('fill', `hsl(${hue},65%,90%)`); dashed.setAttribute('fill-opacity', '0.25')
    dashed.setAttribute('stroke', `hsl(${hue},60%,65%)`); dashed.setAttribute('stroke-width', '1.5'); dashed.setAttribute('stroke-dasharray', '5,4'); svg.appendChild(dashed)
    const youC = document.createElementNS(NS, 'circle') as SVGCircleElement
    youC.setAttribute('cx', String(youX)); youC.setAttribute('cy', String(cy)); youC.setAttribute('r', String(r)); youC.setAttribute('fill', '#2A2720'); svg.appendChild(youC)
    const youT = document.createElementNS(NS, 'text') as SVGTextElement
    youT.setAttribute('x', String(youX)); youT.setAttribute('y', String(cy + 4)); youT.setAttribute('text-anchor', 'middle')
    youT.setAttribute('font-family', 'Inter,sans-serif'); youT.setAttribute('font-size', '11'); youT.setAttribute('font-weight', '600'); youT.setAttribute('fill', 'rgba(245,242,235,0.9)')
    youT.textContent = 'You'; svg.appendChild(youT)
    const themT = document.createElementNS(NS, 'text') as SVGTextElement
    themT.setAttribute('x', String(themX)); themT.setAttribute('y', String(cy)); themT.setAttribute('text-anchor', 'middle')
    themT.setAttribute('font-family', 'Inter,sans-serif'); themT.setAttribute('font-size', '10'); themT.setAttribute('fill', `hsl(${hue},50%,38%)`)
    themT.innerHTML = `<tspan x="${themX}" dy="-6">Someone</tspan><tspan x="${themX}" dy="13">close</tspan>`; svg.appendChild(themT)
    const unreg = registerBlobTask(t => {
      glowC.setAttribute('r', String(r * 1.9 * (1 + Math.sin(t * 1.2) * 0.08)))
    })
    return () => { unreg() }
  }, [])
  return <svg ref={ref} viewBox="0 0 380 110" width="100%" height="100%" style={{ overflow:'visible' }} />
}

// ─── ReportCluster ────────────────────────────────────────────────────────────
function ReportCluster() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const wrap = ref.current; if (!wrap) return
    const VW = 460, VH = 180
    const { svg, defs, fid } = makeBlobSvg(VW, VH, 11)
    const TRAITS = [
      { word:'Deliberate', hueOff:0,  cx:230, cy:98,  r:68, active:true  },
      { word:'Autonomous', hueOff:5,  cx:118, cy:80,  r:42, active:false },
      { word:'Reflective', hueOff:10, cx:340, cy:72,  r:38, active:false },
      { word:'Durable',    hueOff:20, cx:122, cy:148, r:36, active:false },
      { word:'Selective',  hueOff:35, cx:336, cy:148, r:34, active:false },
    ]
    const lblEls: HTMLDivElement[] = []
    const blobData = TRAITS.map((tr, i) => {
      const hue = userCuratedHue(USER_SEED, tr.hueOff)
      const profile = buildPointMotionProfile(hashSeed(tr.word + '-rpc'), 9)
      const pathEl = makeBlobPath(defs, 'rpc-' + i, hue, tr.active, fid)
      svg.appendChild(pathEl)
      const lbl = document.createElement('div')
      lbl.style.cssText = `position:absolute;transform:translate(-50%,-50%);pointer-events:none;left:${(tr.cx/VW*100).toFixed(2)}%;top:${(tr.cy/VH*100).toFixed(2)}%;`
      lbl.style.cssText += tr.active
        ? `font-family:'Newsreader',Georgia,serif;font-style:italic;font-size:14px;color:hsl(${hue},45%,24%);`
        : `font-family:Inter,sans-serif;font-size:9px;color:rgba(28,28,26,0.46);`
      lbl.textContent = tr.word; wrap.appendChild(lbl); lblEls.push(lbl)
      return { pathEl, profile, cx:tr.cx, cy:tr.cy, r:tr.r }
    })
    wrap.insertBefore(svg, wrap.firstChild)
    const unreg = registerBlobTask(t => blobData.forEach(b =>
      b.pathEl.setAttribute('d', generateAnimatedBlobPath(b.cx, b.cy, b.r, b.profile, 0.3, t))
    ))
    return () => {
      unreg()
      lblEls.forEach(el => { if (el.parentNode === wrap) wrap.removeChild(el) })
      if (svg.parentNode === wrap) wrap.removeChild(svg)
    }
  }, [])
  return <div ref={ref} style={{ position:'relative', height:180, margin:'12px -4px 4px' }} />
}

// ─── CtaHalos ─────────────────────────────────────────────────────────────────
function CtaHalos() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const wrap = ref.current; if (!wrap) return
    const VW = 900, VH = 420
    const { svg, defs, fid } = makeBlobSvg(VW, VH, 30)
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice')
    svg.style.width = '100%'; svg.style.height = '100%'
    const HALOS = [
      { cx:VW*0.08, cy:VH*0.50, r:200, hueOff:35 },
      { cx:VW*0.92, cy:VH*0.50, r:170, hueOff:5  },
      { cx:VW*0.50, cy:VH*1.0,  r:150, hueOff:15 },
    ]
    const haloData = HALOS.map((h, i) => {
      const hue = userCuratedHue(USER_SEED, h.hueOff)
      const profile = buildPointMotionProfile(hashSeed('cta-halo-' + i), 9)
      const pathEl = makeBlobPath(defs, 'ch-' + i, hue, false, fid)
      svg.appendChild(pathEl)
      return { pathEl, profile, cx:h.cx, cy:h.cy, r:h.r }
    })
    wrap.appendChild(svg)
    const unreg = registerBlobTask(t => haloData.forEach((b, i) => {
      const wobX = Math.sin(t * 0.3 + i * 2) * VW * 0.025
      const wobY = Math.cos(t * 0.25 + i * 2) * VH * 0.03
      b.pathEl.setAttribute('d', generateAnimatedBlobPath(b.cx + wobX, b.cy + wobY, b.r, b.profile, 0.28, t))
    }))
    return () => { unreg(); if (svg.parentNode === wrap) wrap.removeChild(svg) }
  }, [])
  return <div ref={ref} style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0, borderRadius:24, overflow:'hidden' }} />
}

// ─── Landing Page ──────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [welcomeBack, setWelcomeBack] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        try {
          const raw = localStorage.getItem('known_session')
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed.patternContents) && parsed.patternContents.length > 0) {
              router.push('/report'); return
            }
          }
        } catch {}
        router.push('/assessment'); return
      }
      try {
        const raw = localStorage.getItem('known_session')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed.patternContents) && parsed.patternContents.length > 0)
            setWelcomeBack(true)
        }
      } catch {}
      setReady(true)
    })
  }, [router])

  async function handleMagicLink() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(true); setTimeout(() => setEmailError(false), 1200); return
    }
    setEmailLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
      setEmailSent(true)
    } catch {
      setEmailError(true); setTimeout(() => setEmailError(false), 1200)
    } finally { setEmailLoading(false) }
  }

  function handleStartFresh() {
    localStorage.removeItem('known_session')
    localStorage.removeItem('known_pending_session_id')
    router.push('/onboarding')
  }

  if (!ready) return <div style={{ minHeight:'100vh', background:cream }} />

  const btnPrimary: React.CSSProperties = {
    background:charcoal, color:cream, border:'none', borderRadius:100,
    padding:'14px 30px', fontSize:15, fontFamily:sans, fontWeight:500,
    cursor:'pointer', letterSpacing:'0.01em', transition:'opacity 0.2s',
  }

  return (
    <>
      <style>{landingCSS}</style>
      <div style={{ background:cream, color:charcoal, fontFamily:sans }}>

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <section style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 48px 80px', position:'relative', overflow:'hidden' }}>
          <div className="lp-hero-inner">
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontFamily:sans, fontSize:12, fontWeight:500, letterSpacing:'0.12em', textTransform:'uppercase', color:c40, marginBottom:24 }}>
                Personal discovery engine
              </p>
              <h1 style={{ fontFamily:serif, fontSize:'clamp(42px,5.5vw,68px)', fontWeight:300, lineHeight:1.08, letterSpacing:'-0.03em', color:charcoal, marginBottom:28 }}>
                You know something&apos;s off.<br /><em>You don&apos;t know what.</em>
              </h1>
              <p style={{ fontSize:17, lineHeight:1.65, color:c80, maxWidth:420, marginBottom:40, fontWeight:300 }}>
                A 15-minute assessment that surfaces what&apos;s actually driving you — your traits, your loops, your energy. Not a type. A picture. Your first 5 patterns are free, no account needed.
              </p>
              {welcomeBack ? (
                <div>
                  <p style={{ fontFamily:sans, fontSize:13, color:c40, marginBottom:14 }}>
                    Welcome back — pick up where you left off.
                  </p>
                  {emailSent ? (
                    <p style={{ fontSize:14, color:c80, lineHeight:1.6 }}>Check your email for the sign-in link.</p>
                  ) : (
                    <div style={{ display:'flex', gap:10, maxWidth:440 }}>
                      <input
                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleMagicLink() }}
                        placeholder="Your email address"
                        style={{ flex:1, padding:'12px 16px', borderRadius:10, border:`1.5px solid ${emailError ? 'hsl(8,60%,55%)' : 'rgba(28,28,26,0.2)'}`, fontSize:14, fontFamily:sans, background:'white', outline:'none', color:charcoal }}
                      />
                      <button onClick={handleMagicLink} disabled={emailLoading} style={{ ...btnPrimary, padding:'12px 20px', fontSize:14, whiteSpace:'nowrap', opacity:emailLoading ? 0.6 : 1 }}>
                        {emailLoading ? 'Sending…' : 'Send me a link'}
                      </button>
                    </div>
                  )}
                  <button onClick={handleStartFresh} style={{ marginTop:14, background:'none', border:'none', cursor:'pointer', fontFamily:sans, fontSize:13, color:c40, padding:0, textDecoration:'underline', textUnderlineOffset:3 }}>
                    or start fresh
                  </button>
                </div>
              ) : (
                <div style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>
                  <Link href="/onboarding">
                    <button style={btnPrimary}>Discover yourself →</button>
                  </Link>
                  <span style={{ fontSize:13, color:c40, fontWeight:400 }}>No account for your first 5 patterns &nbsp;·&nbsp; Takes 12–15 min</span>
                </div>
              )}
            </div>
            <HeroBlobs />
          </div>
        </section>

        {/* ── FACTS ────────────────────────────────────────────────── */}
        <section style={{ background:charcoal, color:cream, padding:'80px 48px', position:'relative', overflow:'hidden' }}>
          <FactsBlobs />
          <div className="facts-inner" style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:2 }}>
            <p style={{ fontFamily:serif, fontSize:'clamp(22px,2.5vw,32px)', fontWeight:300, color:cream, maxWidth:560, lineHeight:1.35, letterSpacing:'-0.015em', marginBottom:56 }}>
              Most people never look. Comfort is easier than answer.<br />
              <em style={{ fontStyle:'italic', fontWeight:300, color:'rgba(245,242,235,0.65)' }}>The pattern is always traceable.</em>
            </p>
            <div className="facts-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:48, position:'relative', zIndex:2 }}>
              {[
                { num:'77%',    desc:'of workers report burnout — most without understanding why the pattern keeps recurring.',                              cite:'Deloitte Global Millennial Survey, 2023' },
                { num:'2.7×',   desc:'more likely to make a poor career decision without a clear model of your own decision-making patterns.',               cite:'Journal of Vocational Behavior, 2021' },
                { num:'12 yrs', desc:"average gap between the onset of a stuck pattern and getting real clarity on what's driving it.",                     cite:'WHO Mental Health Atlas, 2022' },
              ].map(f => (
                <div key={f.num} className="fact-item" style={{ position:'relative' }}>
                  <div className="fact-num" style={{ fontFamily:serif, fontSize:'clamp(52px,6vw,80px)', fontWeight:300, lineHeight:1, letterSpacing:'-0.04em', color:cream, marginBottom:12 }}>{f.num}</div>
                  <div style={{ fontSize:15, lineHeight:1.55, color:'rgba(245,242,235,0.65)', maxWidth:260 }}>{f.desc}</div>
                  <div style={{ fontSize:11, color:'rgba(245,242,235,0.3)', marginTop:8, letterSpacing:'0.04em' }}>{f.cite}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── USP BENTO ────────────────────────────────────────────── */}
        <section style={{ padding:'120px 48px', maxWidth:1200, margin:'0 auto' }}>
          <p style={{ fontSize:11, fontWeight:500, letterSpacing:'0.12em', textTransform:'uppercase', color:c40, marginBottom:20 }}>What you get</p>
          <h2 style={{ fontFamily:serif, fontSize:'clamp(32px,4vw,52px)', fontWeight:300, letterSpacing:'-0.03em', lineHeight:1.1, color:charcoal, marginBottom:64, maxWidth:560 }}>
            Not just who you are.<br /><em>What to do about it.</em>
          </h2>

          {/* Row 1 */}
          <div className="lp-bento-r1">
            {/* Cluster card */}
            <div style={{ background:warmMid, borderRadius:20, padding:40, position:'relative', minHeight:420, display:'flex', flexDirection:'column', overflow:'visible' }}>
              <div>
                <p style={{ fontSize:10, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:c40, marginBottom:12 }}>Who you are</p>
                <p style={{ fontFamily:serif, fontSize:26, fontWeight:400, letterSpacing:'-0.02em', lineHeight:1.2, marginBottom:10 }}>Your trait cluster,<br />made visible</p>
                <p style={{ fontSize:14, lineHeight:1.6, color:c80, fontWeight:300 }}>Not a label. An organic map of how your traits relate and reinforce each other.</p>
              </div>
              <BentoCluster />
            </div>

            {/* Right column */}
            <div className="lp-bento-r1-right">
              {/* Orbit card */}
              <div style={{ background:cream, border:`1.5px solid ${c12}`, borderRadius:20, padding:40, flex:1, minHeight:220, position:'relative', display:'flex', flexDirection:'column' }}>
                <p style={{ fontSize:10, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:c40, marginBottom:12 }}>Where you thrive</p>
                <p style={{ fontFamily:serif, fontSize:26, fontWeight:400, letterSpacing:'-0.02em', lineHeight:1.2, marginBottom:0 }}>Your ideal environment</p>
                <OrbitVisual />
                <p style={{ fontSize:14, lineHeight:1.6, color:c80, fontWeight:300, marginTop:'auto', paddingTop:16 }}>The settings, structures, and contexts where you naturally do your best work.</p>
              </div>
              {/* Connect card */}
              <div style={{ background:warmMid, borderRadius:20, padding:40, flex:1, minHeight:220, position:'relative', display:'flex', flexDirection:'column' }}>
                <p style={{ fontSize:10, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:c40, marginBottom:12 }}>How you connect</p>
                <p style={{ fontFamily:serif, fontSize:26, fontWeight:400, letterSpacing:'-0.02em', lineHeight:1.2, marginBottom:0 }}>Relationship patterns</p>
                <div style={{ position:'relative', height:90, marginTop:16, flexShrink:0 }}>
                  <ConnectVisual />
                </div>
                <p style={{ fontSize:14, lineHeight:1.6, color:c80, fontWeight:300, marginTop:'auto', paddingTop:16 }}>How you show up in relationships — what energises you, what drains you, how others experience you.</p>
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="lp-bento-r2">
            <div style={{ background:cream, border:`1.5px solid ${c12}`, borderRadius:20, padding:40 }}>
              <p style={{ fontSize:10, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:c40, marginBottom:12 }}>What gives you energy</p>
              <p style={{ fontFamily:serif, fontSize:22, fontWeight:400, letterSpacing:'-0.02em', lineHeight:1.2, marginBottom:12 }}>The fuel behind<br />your best days</p>
              <p style={{ fontSize:14, lineHeight:1.6, color:c80, fontWeight:300 }}>Specific activities, environments, and interactions that restore rather than deplete you.</p>
            </div>
            <div style={{ background:charcoal, borderRadius:20, padding:40 }}>
              <span style={{ display:'inline-block', background:'rgba(245,242,235,0.15)', border:'1px solid rgba(245,242,235,0.2)', color:'rgba(245,242,235,0.8)', fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', padding:'4px 10px', borderRadius:100, marginBottom:16 }}>Free to start</span>
              <p style={{ fontFamily:serif, fontSize:26, fontWeight:400, letterSpacing:'-0.02em', lineHeight:1.2, color:cream, marginBottom:10 }}>No consultant.<br />No credit card to begin.</p>
              <p style={{ fontSize:14, lineHeight:1.6, color:'rgba(245,242,235,0.65)', fontWeight:300 }}>The kind of insight that used to cost thousands in coaching sessions. Your first 5 patterns are free, private, and instant — unlock the full picture later for a one-time payment.</p>
            </div>
            <div style={{ background:warmMid, borderRadius:20, padding:40 }}>
              <p style={{ fontSize:10, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:c40, marginBottom:12 }}>Actionable insights</p>
              <p style={{ fontFamily:serif, fontSize:22, fontWeight:400, letterSpacing:'-0.02em', lineHeight:1.2, marginBottom:12 }}>Built to use,<br />not just read</p>
              <p style={{ fontSize:14, lineHeight:1.6, color:c80, fontWeight:300 }}>Every dimension comes with concrete, specific implications — for work, for relationships, for decisions.</p>
            </div>
          </div>
        </section>

        {/* ── REPORT PREVIEW ───────────────────────────────────────── */}
        <section style={{ background:warmMid, padding:'120px 48px', overflow:'hidden' }}>
          <div style={{ maxWidth:1100, margin:'0 auto' }}>
            <div className="lp-report-grid">
              {/* Browser frame */}
              <div style={{ background:cream, borderRadius:16, overflow:'hidden', boxShadow:'0 24px 60px rgba(28,28,26,0.12), 0 4px 12px rgba(28,28,26,0.06)' }}>
                <div style={{ background:'#EDEDEA', padding:'12px 16px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid rgba(28,28,26,0.08)' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:'#E8715A' }} />
                  <div style={{ width:10, height:10, borderRadius:'50%', background:'#D4924A' }} />
                  <div style={{ width:10, height:10, borderRadius:'50%', background:'#7A9E6E' }} />
                  <div style={{ flex:1, background:'rgba(28,28,26,0.06)', borderRadius:6, padding:'5px 12px', marginLeft:8 }}>
                    <span style={{ fontSize:12, color:c40 }}>getbearing.me/report</span>
                  </div>
                </div>
                <div style={{ padding:'24px 28px 28px' }}>
                  <div style={{ marginBottom:6 }}>
                    <span style={{ fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:c40 }}>WHO YOU ARE &nbsp;·&nbsp; TRAIT 1 OF 5</span>
                  </div>
                  <h3 style={{ fontFamily:serif, fontSize:28, fontWeight:400, letterSpacing:'-0.02em', color:charcoal, marginBottom:4 }}>Deliberate</h3>
                  <p style={{ fontSize:12, color:c40, fontWeight:300, marginBottom:0 }}>One of 5 traits discovered in your assessment</p>
                  <ReportCluster />
                  <div style={{ fontSize:12, lineHeight:1.55, color:c80, borderLeft:`2px solid ${c12}`, paddingLeft:12, fontStyle:'italic', marginBottom:14 }}>
                    &ldquo;You don&apos;t rush toward conclusions. Your responses showed a pattern of holding space before committing.&rdquo;
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {['Slow to commit', 'High threshold', 'Durable once decided'].map(tag => (
                      <span key={tag} style={{ fontSize:11, padding:'4px 10px', borderRadius:100, border:`1px solid ${c12}`, color:c80, fontWeight:400 }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Copy */}
              <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end', gap:24 }}>
                <p style={{ fontFamily:serif, fontSize:'clamp(24px,3vw,36px)', fontWeight:300, fontStyle:'italic', lineHeight:1.25, color:charcoal, letterSpacing:'-0.02em' }}>
                  &ldquo;Not a type. Not a score. Everything about you, in one place.&rdquo;
                </p>
                <p style={{ fontSize:15, lineHeight:1.65, color:c80, fontWeight:300 }}>
                  Your Bearing report shows all six dimensions together — so you can see not just who you are, but how the parts connect.
                </p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {['Deliberately autonomous', 'Deep-focus worker', 'Systems thinker', 'Selectively social'].map(pill => (
                    <span key={pill} style={{ display:'inline-block', padding:'6px 14px', borderRadius:100, fontSize:13, fontWeight:400, border:`1.5px solid ${c12}`, color:c80 }}>{pill}</span>
                  ))}
                </div>
                <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', marginTop:8 }}>
                  <Link href="/onboarding">
                    <button style={btnPrimary}>Discover yourself →</button>
                  </Link>
                  <Link href="/onboarding" style={{ fontSize:14, fontWeight:400, color:c80, textDecoration:'none', borderBottom:`1px solid ${c40}`, paddingBottom:2 }}>
                    See an example report
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PROCESS STEPPER ──────────────────────────────────────── */}
        <section id="how-it-works" style={{ padding:'120px 48px', maxWidth:1200, margin:'0 auto' }}>
          <div style={{ marginBottom:72 }}>
            <p style={{ fontSize:11, fontWeight:500, letterSpacing:'0.12em', textTransform:'uppercase', color:c40, marginBottom:20 }}>Inside the assessment</p>
            <h2 style={{ fontFamily:serif, fontSize:'clamp(32px,4vw,52px)', fontWeight:300, letterSpacing:'-0.03em', lineHeight:1.1, color:charcoal, maxWidth:560 }}>
              Four stages.<br /><em>One honest picture.</em>
            </h2>
          </div>
          <div className="lp-stepper-track">
            {[
              { n:'1', label:'Stage one',   title:'You answer naturally',           desc:'60–80 questions that feel like real scenarios, not abstract sliders. Patterns emerge from how you respond, not what you say.',                                  badge:'~8 minutes' },
              { n:'2', label:'Stage two',   title:'Frameworks do the work',         desc:'Fifty years of personality research — distilled, applied, interpreted. The same foundations behind expensive coaching, made accessible.',                          badge:'Instant analysis' },
              { n:'3', label:'Stage three', title:'Your cluster takes shape',        desc:'Your traits mapped into an organic visual cluster — not a radar chart. The shape and arrangement are unique to you.',                                               badge:'Visualised in real time' },
              { n:'4', label:'Stage four',  title:'Six dimensions, fully explained', desc:'Who you are, where you thrive, how you connect, what gives you energy, how you work, and where you get stuck.',                                                       badge:'Yours to keep' },
            ].map(step => (
              <div key={step.n} style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'0 20px', position:'relative', zIndex:2 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, marginBottom:28 }}>
                  <div style={{ fontFamily:serif, fontSize:44, fontWeight:300, letterSpacing:'-0.04em', lineHeight:1, color:charcoal }}>{step.n}</div>
                  <div style={{ width:14, height:14, borderRadius:'50%', background:cream, border:`2px solid ${c40}` }} />
                </div>
                <p style={{ fontSize:10, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:c40, marginBottom:10 }}>{step.label}</p>
                <h3 style={{ fontFamily:serif, fontSize:20, fontWeight:400, letterSpacing:'-0.02em', lineHeight:1.25, color:charcoal, marginBottom:10 }}>{step.title}</h3>
                <p style={{ fontSize:13, lineHeight:1.65, color:c80, fontWeight:300 }}>{step.desc}</p>
                <span style={{ display:'inline-block', marginTop:12, fontSize:11, fontWeight:500, letterSpacing:'0.06em', color:c40, background:c12, padding:'3px 10px', borderRadius:100 }}>{step.badge}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── PROGRESSIVE REVEAL ───────────────────────────────────── */}
        <section style={{ padding:'100px 48px', background:warmMid }}>
          <div style={{ maxWidth:960, margin:'0 auto' }}>
            <p style={{ fontSize:11, fontWeight:500, letterSpacing:'0.12em', textTransform:'uppercase', color:c40, marginBottom:20 }}>How it&apos;s different</p>
            <h2 style={{ fontFamily:serif, fontSize:'clamp(28px,3.5vw,46px)', fontWeight:300, letterSpacing:'-0.03em', lineHeight:1.1, color:charcoal, marginBottom:20, maxWidth:600 }}>
              We don&apos;t make you wait.<br /><em>We show you as we find it.</em>
            </h2>
            <p style={{ fontSize:16, lineHeight:1.7, color:c80, fontWeight:300, maxWidth:540, marginBottom:60 }}>
              Most assessments drag you through 80 questions before telling you anything. Bearing surfaces results as they emerge — so you can see if we&apos;re onto something before you commit to the full picture.
            </p>
            <div className="lp-reveal-grid">
              {[
                { n:'1', title:'Answer a few questions',    desc:'We show you your first trait cluster after the first 15 questions. No waiting.' },
                { n:'2', title:'See if it resonates',       desc:"If what we've found doesn't feel right, stop. If it does, keep going for the full report." },
                { n:'3', title:'Go deeper where it matters',desc:"If your results show a strong pattern around connections or energy, we'll recommend a specialised assessment to go further." },
              ].map(card => (
                <div key={card.n} style={{ background:cream, borderRadius:16, padding:32 }}>
                  <div style={{ fontFamily:serif, fontSize:40, fontWeight:300, letterSpacing:'-0.04em', color:charcoal, marginBottom:12 }}>{card.n}</div>
                  <p style={{ fontSize:15, fontWeight:500, color:charcoal, marginBottom:8 }}>{card.title}</p>
                  <p style={{ fontSize:13, lineHeight:1.6, color:c40, fontWeight:300 }}>{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── END CTA ──────────────────────────────────────────────── */}
        <section style={{ padding:'60px 48px 80px', background:charcoal, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:cream, borderRadius:24, padding:'80px 80px 72px', textAlign:'center', position:'relative', overflow:'hidden', maxWidth:900, width:'100%', isolation:'isolate' }}>
            <CtaHalos />
            <div style={{ position:'relative', zIndex:2, maxWidth:560, margin:'0 auto' }}>
              <p style={{ fontSize:11, fontWeight:500, letterSpacing:'0.12em', textTransform:'uppercase', color:c40, marginBottom:20 }}>
                Free preview · Private · 15 minutes
              </p>
              <h2 style={{ fontFamily:serif, fontSize:'clamp(36px,4.5vw,58px)', fontWeight:300, letterSpacing:'-0.03em', lineHeight:1.1, color:charcoal, marginBottom:20 }}>
                You already sense<br /><em>there&apos;s more to know.</em>
              </h2>
              <p style={{ fontSize:16, lineHeight:1.65, color:c80, marginBottom:40, fontWeight:300 }}>
                Most people spend years trying to understand themselves. Bearing gives you that map in 15 minutes — grounded in research, not guesswork.
              </p>
              <div style={{ display:'flex', gap:14, alignItems:'center', justifyContent:'center', flexWrap:'wrap' }}>
                <Link href="/onboarding">
                  <button style={{ ...btnPrimary, fontSize:15, padding:'15px 34px' }}>Start your report — it&apos;s free</button>
                </Link>
                <Link href="/onboarding" style={{ fontSize:14, fontWeight:400, color:c80, textDecoration:'none', borderBottom:`1px solid ${c40}`, paddingBottom:2 }}>
                  See an example report
                </Link>
              </div>
              <p style={{ fontSize:13, color:c40, marginTop:16 }}>No account for your first 5 &nbsp;·&nbsp; No credit card to start</p>
            </div>
          </div>
        </section>

      </div>
    </>
  )
}
