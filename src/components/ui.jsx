// Небольшая UI-библиотека в стиле «Слива».
import { useEffect, useState } from 'react'

/* Плавный счётчик чисел — фирменный приём (как цена в брифе) */
export function CountUp({ value, suffix = '' }) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [n, setN] = useState(reduce ? value : 0)
  useEffect(() => {
    if (reduce) { setN(value); return }
    let raf
    const t0 = performance.now()
    const dur = 750
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

export function Button({ variant = 'primary', className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-medium transition ' +
    'disabled:opacity-50 disabled:pointer-events-none'
  const variants = {
    primary: 'bg-plum text-white hover:bg-plum-dark active:translate-y-px',
    outline: 'border border-line bg-surface text-ink hover:border-plum',
    ghost: 'text-plum hover:bg-plum-tint',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function Card({ className = '', ...props }) {
  return <div className={`bg-surface border border-line rounded-2xl ${className}`} {...props} />
}

export function Field({ label, id, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1.5 block text-sm text-ink-soft">{label}</span>}
      <input
        id={id}
        className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink outline-none transition focus:border-plum placeholder:text-ink-soft/60"
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

export function Brand({ className = '' }) {
  return (
    <span className={`font-display font-semibold tracking-tight text-ink ${className}`}>
      Тренажёр<span className="text-plum"> ЕНТ</span>
    </span>
  )
}

// ---- иконки (Lucide-стиль, stroke=currentColor) ----
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
