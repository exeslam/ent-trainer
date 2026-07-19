import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Arcs, Brand, Button, Card, CheckDraw,
  IconChart, IconClock, IconPlay, IconRefresh, IconUsers,
} from '../components/ui'

const LETTERS = ['A', 'B', 'C']

/* Демо-задания для живой карточки в хиро */
const DEMO = [
  { body: 'Проезд стоит 120 ₸. Сколько заплатят 3 человека за поездку туда и обратно?', options: ['540 ₸', '720 ₸', '840 ₸'], correct: 1 },
  { body: 'Товар за 8 000 ₸ со скидкой 15%. Сколько нужно заплатить?', options: ['6 800 ₸', '7 200 ₸', '6 500 ₸'], correct: 0 },
  { body: 'Расход — 8 л на 100 км. Сколько бензина уйдёт на 250 км?', options: ['16 л', '18 л', '20 л'], correct: 2 },
]

/* Карточка, которая решает себя сама — продукт демонстрирует продукт */
function DemoCard() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [qi, setQi] = useState(0)
  const [picked, setPicked] = useState(reduce)

  useEffect(() => {
    if (reduce) return
    const t1 = setTimeout(() => setPicked(true), 1700)
    const t2 = setTimeout(() => { setPicked(false); setQi((q) => (q + 1) % DEMO.length) }, 4100)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [qi, reduce])

  const q = DEMO[qi]
  return (
    <Card className="p-5 text-left shadow-float" aria-hidden="true">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-soft">
          Пример задания
        </span>
        <span className="flex gap-1.5">
          {DEMO.map((_, i) => (
            <i key={i} className={`h-1.5 w-1.5 rounded-full transition ${i === qi ? 'bg-plum' : 'bg-line'}`} />
          ))}
        </span>
      </div>
      <div key={qi} className="animate-rise">
        <p className="font-display text-[15px] font-semibold leading-snug">{q.body}</p>
        <div className="mt-3 space-y-2">
          {q.options.map((opt, i) => {
            const isCorrect = picked && i === q.correct
            const dim = picked && i !== q.correct
            return (
              <div key={i} className={[
                'flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition',
                isCorrect ? 'border-ok bg-ok-tint' : dim ? 'border-line opacity-40' : 'border-line bg-surface',
              ].join(' ')}>
                <span className={[
                  'grid h-7 w-7 flex-none place-items-center rounded-lg font-mono text-xs font-semibold transition',
                  isCorrect ? 'bg-ok text-white' : 'bg-plum-tint text-plum',
                ].join(' ')}>{LETTERS[i]}</span>
                <span className="min-w-0 flex-1">{opt}</span>
                {isCorrect && <CheckDraw className="h-5 w-5 flex-none text-ok" />}
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

/* Появление секций при прокрутке */
function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); io.disconnect() }
    }, { rootMargin: '0px 0px -60px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ animationDelay: `${delay}ms` }}
      className={`${seen ? 'animate-rise' : 'opacity-0'} ${className}`}>
      {children}
    </div>
  )
}

const STEPS = [
  { n: '01', title: 'Зарегистрируйся', text: 'Почта и пароль — без установки приложений, прямо с телефона.' },
  { n: '02', title: 'Тренируйся', text: 'Мгновенная проверка и понятное пояснение к каждой задаче.' },
  { n: '03', title: 'Сдавай пробный', text: 'Таймер, результат и разбор — как на настоящем ЕНТ.' },
]

const FEATURES = [
  { icon: IconPlay, title: 'Мгновенная проверка', text: 'Сразу видно, где ошибка и почему ответ именно такой' },
  { icon: IconClock, title: 'Пробный ЕНТ', text: 'До 30 вопросов на время, без подсказок' },
  { icon: IconRefresh, title: 'Работа над ошибками', text: 'Неверные ответы копятся в разборе, пока не исправишь' },
  { icon: IconChart, title: 'Прогресс', text: 'Проценты, история пробных и динамика' },
]

export default function Landing() {
  return (
    <div className="min-h-dvh">
      {/* ---------- хиро ---------- */}
      <section className="relative overflow-hidden bg-plum-deep pb-30 text-white">
        <Arcs className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 text-plum-glow" />
        <Arcs className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rotate-180 text-plum-glow opacity-50" />

        <header className="relative mx-auto flex max-w-lg items-center justify-between px-4 pt-6">
          <Brand tone="dark" />
          <Link to="/auth" className="text-sm font-medium text-lavender underline underline-offset-4 transition hover:text-white">
            Войти
          </Link>
        </header>

        <div className="relative mx-auto max-w-lg px-4 pt-12 text-center">
          <h1 className="animate-rise font-display text-[2.35rem] font-bold leading-[1.08] tracking-tight">
            Математическая грамотность —{' '}
            <span className="text-plum-glow">на{' '}максимум</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xs animate-rise text-[15px] leading-relaxed text-lavender" style={{ animationDelay: '80ms' }}>
            Тренажёр для подготовки к ЕНТ: задания с разбором, пробные экзамены с таймером и твой прогресс.
          </p>
          <div className="mt-7 flex animate-rise flex-col gap-2.5" style={{ animationDelay: '150ms' }}>
            <Link to="/auth?mode=signup" className="block">
              <Button variant="light" className="w-full">Начать бесплатно</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- живая демо-карточка ---------- */}
      <div className="mx-auto -mt-24 max-w-lg px-4">
        <Reveal delay={220}><DemoCard /></Reveal>
      </div>

      {/* ---------- как это работает ---------- */}
      <section className="mx-auto max-w-lg px-4 pt-14">
        <Reveal>
          <h2 className="font-display text-2xl font-bold tracking-tight">Как это работает</h2>
        </Reveal>
        <div className="mt-5 space-y-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 70}>
              <Card className="flex items-start gap-4 p-5">
                <span className="font-mono text-sm font-semibold text-plum">{s.n}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-semibold">{s.title}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-ink-soft">{s.text}</span>
                </span>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- возможности ---------- */}
      <section className="mx-auto max-w-lg px-4 pt-14">
        <Reveal>
          <h2 className="font-display text-2xl font-bold tracking-tight">Что внутри</h2>
        </Reveal>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <Card className="h-full p-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-plum-tint text-plum">
                  <f.icon className="h-5 w-5" />
                </span>
                <p className="mt-3 font-display text-[15px] font-semibold leading-tight">{f.title}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">{f.text}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- для учителя ---------- */}
      <section className="mx-auto max-w-lg px-4 pt-14">
        <Reveal>
          <Card variant="dark" className="p-6">
            <Arcs className="pointer-events-none absolute -right-14 -bottom-14 h-44 w-44 text-plum-glow" />
            <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-lavender">
              <IconUsers className="h-5 w-5" />
            </span>
            <p className="relative mt-4 font-display text-xl font-semibold">Для учителя</p>
            <p className="relative mt-1.5 max-w-[92%] text-sm leading-relaxed text-lavender">
              Свой банк заданий и статистика по каждому ученику: кто сколько решил и с каким процентом.
            </p>
          </Card>
        </Reveal>
      </section>

      {/* ---------- финальный CTA ---------- */}
      <section className="mx-auto max-w-lg px-4 pb-10 pt-14">
        <Reveal>
          <Card variant="dark" className="p-7 text-center">
            <Arcs className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 text-plum-glow" />
            <p className="relative font-display text-2xl font-bold tracking-tight">Готов начать?</p>
            <p className="relative mt-1.5 text-sm text-lavender">Регистрация занимает меньше минуты.</p>
            <div className="relative mt-6">
              <Link to="/auth?mode=signup" className="block">
                <Button variant="light" className="w-full">Создать аккаунт</Button>
              </Link>
              <Link to="/auth" className="mt-3 inline-block text-sm text-lavender underline underline-offset-4 transition hover:text-white">
                Уже есть аккаунт — войти
              </Link>
            </div>
          </Card>
        </Reveal>
        <p className="mt-8 text-center text-xs text-ink-soft">
          Тренажёр ЕНТ · математическая грамотность
        </p>
      </section>
    </div>
  )
}
