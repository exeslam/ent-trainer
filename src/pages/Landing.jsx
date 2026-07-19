import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Brand, Button, Card, CheckDraw, MathShapes,
  IconChart, IconClock, IconPlay, IconRefresh, IconUsers, IconFlame, IconStar,
} from '../components/ui'

const LETTERS = ['A', 'B', 'C']

const DEMO = [
  { body: 'Проезд стоит 120 ₸. Сколько заплатят 3 человека за поездку туда и обратно?', options: ['540 ₸', '720 ₸', '840 ₸'], correct: 1 },
  { body: 'Товар за 8 000 ₸ со скидкой 15%. Сколько нужно заплатить?', options: ['6 800 ₸', '7 200 ₸', '6 500 ₸'], correct: 0 },
  { body: 'Расход — 8 л на 100 км. Сколько бензина уйдёт на 250 км?', options: ['16 л', '18 л', '20 л'], correct: 2 },
]

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
    <Card className="p-5 text-left" style={{ boxShadow: '0 6px 0 0 var(--color-line)' }} aria-hidden="true">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-[11px] font-bold uppercase tracking-wide text-ink-soft">Пример задания</span>
        <span className="flex gap-1.5">
          {DEMO.map((_, i) => <i key={i} className={`h-2 w-2 rounded-full transition ${i === qi ? 'bg-plum' : 'bg-line'}`} />)}
        </span>
      </div>
      <div key={qi} className="animate-rise">
        <p className="font-display text-[15px] font-bold leading-snug">{q.body}</p>
        <div className="mt-3 space-y-2">
          {q.options.map((opt, i) => {
            const isCorrect = picked && i === q.correct
            const dim = picked && i !== q.correct
            return (
              <div key={i} className={[
                'flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition',
                isCorrect ? 'border-ok-bright bg-ok-tint' : dim ? 'border-line opacity-40' : 'border-line bg-surface',
              ].join(' ')}>
                <span className={[
                  'grid h-7 w-7 flex-none place-items-center rounded-lg font-display text-xs font-bold transition',
                  isCorrect ? 'bg-ok-bright text-white' : 'bg-plum-tint text-plum',
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

function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { rootMargin: '0px 0px -60px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} style={{ animationDelay: `${delay}ms` }} className={`${seen ? 'animate-rise' : 'opacity-0'} ${className}`}>{children}</div>
}

const STEPS = [
  { n: '1', title: 'Зарегистрируйся', text: 'Почта и пароль — без установки, прямо с телефона.', c: 'var(--color-plum)', bg: 'var(--color-plum-tint)' },
  { n: '2', title: 'Тренируйся', text: 'Мгновенная проверка и понятное пояснение к каждой задаче.', c: 'var(--color-ok)', bg: 'var(--color-ok-tint)' },
  { n: '3', title: 'Сдавай пробный', text: 'Таймер, результат и разбор — как на настоящем ЕНТ.', c: 'var(--color-amber-dark)', bg: '#FFF1DE' },
]

const FEATURES = [
  { icon: IconPlay, title: 'Мгновенная проверка', text: 'Сразу видно, где ошибка и почему', c: 'var(--color-ok)', bg: 'var(--color-ok-tint)' },
  { icon: IconClock, title: 'Пробный ЕНТ', text: 'До 30 вопросов на время', c: 'var(--color-amber-dark)', bg: '#FFF1DE' },
  { icon: IconRefresh, title: 'Работа над ошибками', text: 'Ошибки копятся, пока не исправишь', c: 'var(--color-plum)', bg: 'var(--color-plum-tint)' },
  { icon: IconChart, title: 'Прогресс и XP', text: 'Стрики, очки и уровни', c: 'var(--color-grape)', bg: '#F1EBFE' },
]

export default function Landing() {
  return (
    <div className="min-h-dvh">
      {/* хиро */}
      <section className="relative overflow-hidden rounded-b-[2.5rem] bg-plum pb-28 text-white" style={{ boxShadow: '0 6px 0 0 var(--color-plum-dark)' }}>
        <MathShapes />
        <header className="relative mx-auto flex max-w-lg items-center justify-between px-4 pt-6">
          <Brand tone="dark" />
          <Link to="/auth" className="font-display text-sm font-bold text-white/90 underline underline-offset-4 transition hover:text-white">Войти</Link>
        </header>

        <div className="relative mx-auto max-w-lg px-4 pt-12 text-center">
          <h1 className="animate-pop font-display text-[2.5rem] font-bold leading-[1.05]">
            Матграмотность,<br />которую <span className="text-amber">хочется</span> решать
          </h1>
          <p className="mx-auto mt-4 max-w-xs animate-rise text-[15px] font-semibold text-white/85" style={{ animationDelay: '80ms' }}>
            Тренажёр ЕНТ с мгновенной проверкой, пробными экзаменами и очками за каждый верный ответ.
          </p>
          <div className="mt-7 animate-rise" style={{ animationDelay: '150ms' }}>
            <Link to="/auth?mode=signup" className="block"><Button variant="amber" className="w-full text-base">Начать бесплатно</Button></Link>
          </div>
          <div className="mt-4 flex animate-rise justify-center gap-4 text-xs font-bold text-white/80" style={{ animationDelay: '200ms' }}>
            <span className="inline-flex items-center gap-1.5"><IconFlame className="h-4 w-4 text-amber" /> Стрики</span>
            <span className="inline-flex items-center gap-1.5"><IconStar className="h-4 w-4 text-amber" /> Очки XP</span>
            <span className="inline-flex items-center gap-1.5"><IconChart className="h-4 w-4 text-sky" /> Прогресс</span>
          </div>
        </div>
      </section>

      <div className="mx-auto -mt-16 max-w-lg px-4"><Reveal delay={220}><DemoCard /></Reveal></div>

      <section className="mx-auto max-w-lg px-4 pt-14">
        <Reveal><h2 className="font-display text-2xl font-bold">Как это работает</h2></Reveal>
        <div className="mt-5 space-y-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 70}>
              <Card className="flex items-center gap-4 p-4">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl font-display text-lg font-bold" style={{ background: s.bg, color: s.c }}>{s.n}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-bold">{s.title}</span>
                  <span className="mt-0.5 block text-sm font-semibold text-ink-soft">{s.text}</span>
                </span>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-lg px-4 pt-14">
        <Reveal><h2 className="font-display text-2xl font-bold">Что внутри</h2></Reveal>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <Card className="h-full p-4">
                <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: f.bg, color: f.c }}><f.icon className="h-6 w-6" /></span>
                <p className="mt-3 font-display text-[15px] font-bold leading-tight">{f.title}</p>
                <p className="mt-1 text-[12.5px] font-semibold leading-snug text-ink-soft">{f.text}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-lg px-4 pt-14">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-grape p-6 text-white" style={{ boxShadow: '0 5px 0 0 #6D3FC7' }}>
            <MathShapes className="opacity-70" />
            <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white/20"><IconUsers className="h-6 w-6" /></span>
            <p className="relative mt-4 font-display text-xl font-bold">Для учителя</p>
            <p className="relative mt-1.5 max-w-[92%] text-sm font-semibold leading-relaxed text-white/90">
              Свой банк заданий и статистика по каждому ученику: кто сколько решил и с каким процентом.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-lg px-4 pb-10 pt-14">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-plum p-7 text-center text-white" style={{ boxShadow: '0 5px 0 0 var(--color-plum-dark)' }}>
            <MathShapes />
            <p className="relative font-display text-2xl font-bold">Готов начать?</p>
            <p className="relative mt-1.5 text-sm font-semibold text-white/85">Регистрация занимает меньше минуты.</p>
            <div className="relative mt-6">
              <Link to="/auth?mode=signup" className="block"><Button variant="amber" className="w-full">Создать аккаунт</Button></Link>
              <Link to="/auth" className="mt-3 inline-block font-display text-sm font-bold text-white/85 underline underline-offset-4 transition hover:text-white">Уже есть аккаунт — войти</Link>
            </div>
          </div>
        </Reveal>
        <p className="mt-8 text-center text-xs font-bold text-ink-soft">Тренажёр ЕНТ · математическая грамотность</p>
      </section>
    </div>
  )
}
