// UI-библиотека «Слива» v2 — тёмные панели, кольца, глубина.
import { useEffect, useState } from 'react'

/* Плавный счётчик чисел — фирменный приём (как цена в брифе) */
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

/* Кольцо прогресса: анимированный обвод + контент в центре */
export function Ring({ value, size = 150, stroke = 11, tone = 'light', children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, value))
  const [off, setOff] = useState(c)
  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setOff(c - (c * clamped) / 100)))
    return () => cancelAnimationFrame(raf)
  }, [c, clamped])
  const track = tone === 'dark' ? 'rgba(255,255,255,0.14)' : 'var(--color-line)'
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

/* Декоративные дуги — след циркуля на тёмных панелях */
export function Arcs({ className = '' }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" aria-hidden="true" className={className}>
      <circle cx="100" cy="100" r="56" stroke="currentColor" strokeWidth="1.5" opacity="0.28" />
      <circle cx="100" cy="100" r="84" stroke="currentColor" strokeWidth="1.5" opacity="0.16" />
      <path d="M100 16a84 84 0 0 1 84 84" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      <circle cx="100" cy="16" r="4.5" fill="currentColor" opacity="0.8" />
      <circle cx="156" cy="100" r="3" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

export function Button({ variant = 'primary', className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-semibold transition ' +
    'active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none'
  const variants = {
    primary: 'bg-plum text-white shadow-btn hover:bg-plum-dark',
    light: 'bg-white text-plum-dark shadow-card hover:shadow-float',
    outline: 'border-2 border-line bg-surface text-ink hover:border-plum',
    outlineDark: 'border-2 border-white/25 text-white hover:bg-white/10',
    ghost: 'text-plum hover:bg-plum-tint',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function Card({ variant = 'default', className = '', ...props }) {
  const variants = {
    default: 'rounded-3xl border border-line/70 bg-surface shadow-card',
    dark: 'relative overflow-hidden rounded-3xl bg-plum-deep text-white shadow-float',
  }
  return <div className={`${variants[variant]} ${className}`} {...props} />
}

export function Field({ label, id, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>}
      <input
        id={id}
        className="w-full rounded-2xl border-2 border-line bg-surface px-4 py-3.5 text-ink outline-none transition focus:border-plum placeholder:text-ink-soft/50"
        {...props}
      />
    </label>
  )
}

export function Spinner({ className = '' }) {
  return (
    <div
      role="status"
      aria-label="Загрузка"
      className={`h-6 w-6 animate-spin rounded-full border-2 border-line border-t-plum ${className}`}
    />
  )
}

export function Brand({ tone = 'light', className = '' }) {
  const dark = tone === 'dark'
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`grid h-7 w-7 flex-none place-items-center rounded-lg ${dark ? 'bg-white' : 'bg-plum'}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke={dark ? 'var(--color-plum-dark)' : '#fff'} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <span className={`font-display font-semibold tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>
        Тренажёр<span className={dark ? 'text-lavender' : 'text-plum'}> ЕНТ</span>
      </span>
    </span>
  )
}

/* Рисующиеся галочка и крестик для чипов ответов */
export function CheckDraw({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 13l4 4L19 7" className="draw-stroke" />
    </svg>
  )
}
export function CrossDraw({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" className="draw-stroke" />
    </svg>
  )
}

/* ---- иконки (Lucide-стиль, stroke=currentColor) ---- */
function Svg({ children, className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      className={`h-6 w-6 ${className}`} aria-hidden="true"
    >
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
