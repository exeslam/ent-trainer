// UI-библиотека «Игра» — Duolingo-вайб: 3D-кнопки, чанки, геймификация.
import { useEffect, useRef, useState } from 'react'

/* Плавный счётчик чисел */
export function CountUp({ value, suffix = '' }) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [n, setN] = useState(reduce ? value : 0)
  useEffect(() => {
    if (reduce) { setN(value); return }
    let raf
    const t0 = performance.now()
    const dur = 900
    const ease = (x) => 1 - Math.pow(1 - x, 3)
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur)
      setN(Math.round(value * ease(p)))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, reduce])
  return <>{n}{suffix}</>
}

/* Кольцо прогресса */
export function Ring({ value, size = 150, stroke = 12, tone = 'light', children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, value))
  const [off, setOff] = useState(c)
  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setOff(c - (c * clamped) / 100)))
    return () => cancelAnimationFrame(raf)
  }, [c, clamped])
  const track = tone === 'dark' ? 'rgba(255,255,255,0.18)' : 'var(--color-line)'
  const bar = tone === 'dark' ? 'var(--color-ok-bright)' : 'var(--color-plum)'
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={bar} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.2, 0.7, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

/* Летающие мат-фигуры — декор */
export function MathShapes({ className = '' }) {
  const items = [
    { s: '+', c: 'var(--color-amber)', x: '6%', y: '18%', d: 0, size: 30 },
    { s: '×', c: 'var(--color-ok-bright)', x: '82%', y: '12%', d: 0.8, size: 26 },
    { s: '÷', c: 'var(--color-sky)', x: '70%', y: '62%', d: 1.6, size: 24 },
    { s: '−', c: 'var(--color-grape)', x: '16%', y: '68%', d: 1.1, size: 34 },
    { s: '=', c: 'var(--color-sky)', x: '40%', y: '8%', d: 0.4, size: 22 },
  ]
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {items.map((it, i) => (
        <span key={i} className="absolute animate-float font-display font-bold"
          style={{ left: it.x, top: it.y, color: it.c, fontSize: it.size, animationDelay: `${it.d}s`, opacity: 0.9 }}>
          {it.s}
        </span>
      ))}
    </div>
  )
}

const SHADOW = {
  primary: 'var(--color-plum-dark)',
  success: 'var(--color-ok-dark)',
  danger: 'var(--color-bad-dark)',
  amber: 'var(--color-amber-dark)',
  light: 'var(--color-line)',
  outline: 'var(--color-line)',
}

export function Button({ variant = 'primary', className = '', style, ...props }) {
  const base =
    'btn3d inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-display text-[15px] font-bold tracking-wide ' +
    'disabled:opacity-50 disabled:pointer-events-none select-none'
  const variants = {
    primary: 'bg-plum text-white',
    success: 'bg-ok-bright text-ink',   // тёмный текст: контраст на ярко-зелёном 6.1:1
    danger: 'bg-bad text-white',
    amber: 'bg-amber text-ink',         // тёмный текст: контраст на amber 6.6:1 (было 2.2 белым)
    light: 'bg-white text-plum border-2 border-line',
    outline: 'bg-white text-ink border-2 border-line',
    ghost: 'text-plum shadow-none active:translate-y-0',
  }
  const sh = SHADOW[variant] ?? 'var(--color-plum-dark)'
  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      style={{ '--sh': variant === 'ghost' ? 'transparent' : sh, ...style }}
      {...props}
    />
  )
}

export function Card({ variant = 'default', className = '', ...props }) {
  const variants = {
    default: 'rounded-3xl border-2 border-line bg-surface',
    dark: 'relative overflow-hidden rounded-3xl bg-plum-deep text-white',
    flat: 'rounded-3xl bg-surface',
  }
  return <div className={`${variants[variant]} ${className}`} {...props} />
}

export function Field({ label, id, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1.5 block text-sm font-bold text-ink-soft">{label}</span>}
      <input
        id={id}
        className="w-full rounded-2xl border-2 border-line bg-surface px-4 py-3.5 font-semibold text-ink outline-none transition focus:border-plum placeholder:text-ink-soft/50"
        {...props}
      />
    </label>
  )
}

export function Spinner({ className = '' }) {
  return (
    <div role="status" aria-label="Загрузка"
      className={`h-6 w-6 animate-spin rounded-full border-[3px] border-line border-t-plum ${className}`} />
  )
}

export function Brand({ tone = 'light', className = '' }) {
  const dark = tone === 'dark'
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid h-8 w-8 flex-none place-items-center rounded-xl bg-plum" style={{ boxShadow: '0 3px 0 0 var(--color-plum-dark)' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <span className={`font-display text-lg font-bold tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>
        Тренажёр<span className={dark ? 'text-sky' : 'text-plum'}> ЕНТ</span>
      </span>
    </span>
  )
}

/* Стат-чип геймификации (стрик / XP / уровень) */
export function StatChip({ icon: Icon, value, label, color = 'var(--color-amber)', animate = true }) {
  return (
    <div className={`flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 ${animate ? 'animate-pop' : ''}`}>
      <Icon className="h-5 w-5 flex-none" style={{ color }} />
      <div className="leading-none">
        <div className="font-display text-lg font-bold text-white">{value}</div>
        <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-white/70">{label}</div>
      </div>
    </div>
  )
}

/* Конфетти при высоком результате */
export function Confetti({ fire }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!fire) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const W = (canvas.width = canvas.offsetWidth)
    const H = (canvas.height = canvas.offsetHeight)
    const colors = ['#2563EB', '#58CC02', '#FF9600', '#1CB0F6', '#8B5CF6', '#E23B3B']
    const N = 120
    const parts = Array.from({ length: N }, (_, i) => ({
      x: W / 2, y: H * 0.32,
      vx: Math.cos((i / N) * 6.283) * (2 + (i % 7)),
      vy: Math.sin((i / N) * 6.283) * (2 + (i % 5)) - 6,
      r: 4 + (i % 4) * 2,
      c: colors[i % colors.length],
      rot: i, vr: (i % 2 ? 1 : -1) * 0.2,
    }))
    let frame = 0, raf
    const tick = () => {
      frame++
      ctx.clearRect(0, 0, W, H)
      parts.forEach((p) => {
        p.vy += 0.22; p.x += p.vx; p.y += p.vy; p.rot += p.vr
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot)
        ctx.fillStyle = p.c
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6)
        ctx.restore()
      })
      if (frame < 130) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [fire])
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
}

export function CheckDraw({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 13l4 4L19 7" className="draw-stroke" />
    </svg>
  )
}
export function CrossDraw({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" className="draw-stroke" />
    </svg>
  )
}

/* ---- иконки ---- */
function Svg({ children, className = '', style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 ${className}`} style={style} aria-hidden="true">
      {children}
    </svg>
  )
}
export const IconPlay = (p) => <Svg {...p}><path d="M6 4l14 8-14 8z" /></Svg>
export const IconClock = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
export const IconChart = (p) => <Svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Svg>
export const IconGear = (p) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Svg>
export const IconLogout = (p) => <Svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Svg>
export const IconChevron = (p) => <Svg {...p}><path d="M9 18l6-6-6-6" /></Svg>
export const IconArrow = (p) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
export const IconRefresh = (p) => <Svg {...p}><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" /></Svg>
export const IconUsers = (p) => <Svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></Svg>
/* геймификация: огонь-стрик, звезда-XP, корона-уровень */
export const IconFlame = (p) => <Svg {...p} strokeWidth="1.6"><path d="M12 2c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-2.5C9 9 9 7 12 2z" fill="currentColor" stroke="none" /><path d="M12 22a6 6 0 0 0 6-6c0-3-2-4.5-3-6-.5 2-2 2.5-3 3.5-.8.8-1 1.7-1 2.5a3 3 0 0 1-3-3c-1 1.2-2 2.6-2 3.5a6 6 0 0 0 6 5.5z" fill="currentColor" stroke="none" /></Svg>
export const IconStar = (p) => <Svg {...p} strokeWidth="1.6"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" /></Svg>
export const IconCrown = (p) => <Svg {...p} strokeWidth="1.6"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" /></Svg>
