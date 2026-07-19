import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Arcs, Brand, Card, IconArrow, IconPlay, IconClock, IconChart, IconGear, IconLogout, IconChevron,
} from '../components/ui'

function ActionCard({ icon: Icon, title, subtitle, onClick, delay = 0 }) {
  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className="group flex w-full animate-rise items-center gap-4 rounded-3xl border border-line/70 bg-surface p-4 text-left shadow-card transition hover:shadow-float active:scale-[0.99]"
    >
      <span className="grid h-13 w-13 flex-none place-items-center rounded-2xl bg-plum-tint text-plum">
        <Icon />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[17px] font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-ink-soft">{subtitle}</span>
      </span>
      <IconChevron className="h-5 w-5 flex-none text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-plum" />
    </button>
  )
}

function HeroCard({ eyebrow, title, subtitle, onClick, delay = 0 }) {
  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className="group relative w-full animate-rise overflow-hidden rounded-3xl bg-plum-deep p-6 text-left text-white shadow-float transition active:scale-[0.99]"
    >
      <Arcs className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 text-plum-glow transition-transform duration-700 group-hover:rotate-12" />
      <p className="relative font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-lavender">
        {eyebrow}
      </p>
      <p className="relative mt-2 font-display text-2xl font-semibold tracking-tight">{title}</p>
      <p className="relative mt-1 max-w-[85%] text-sm leading-snug text-lavender">{subtitle}</p>
      <span className="relative mt-5 inline-grid h-11 w-11 place-items-center rounded-full bg-white text-plum-dark transition group-hover:translate-x-1">
        <IconArrow className="h-5 w-5" />
      </span>
    </button>
  )
}

export default function Dashboard() {
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()
  const name = profile?.full_name?.trim() || 'ученик'
  const firstName = name.split(' ')[0]
  const isTeacher = role === 'teacher'

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-12 pt-5">
      <header className="mb-8 flex animate-rise items-center justify-between">
        <Brand />
        <button
          onClick={signOut}
          aria-label="Выйти"
          className="grid h-10 w-10 place-items-center rounded-xl text-ink-soft transition hover:bg-plum-tint hover:text-plum"
        >
          <IconLogout className="h-5 w-5" />
        </button>
      </header>

      <div className="mb-7 animate-rise" style={{ animationDelay: '40ms' }}>
        <p className="text-sm text-ink-soft">
          {isTeacher ? 'Кабинет учителя' : 'С возвращением,'}
        </p>
        <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight">
          {isTeacher ? name : `${firstName}!`}
        </h1>
      </div>

      <div className="space-y-3.5">
        {isTeacher ? (
          <>
            <HeroCard
              eyebrow="Банк вопросов"
              title="Задания"
              subtitle="Добавляйте и редактируйте вопросы — ученики видят их сразу"
              onClick={() => navigate('/admin/questions')}
              delay={90}
            />
            <ActionCard
              icon={IconChart} title="Статистика класса"
              subtitle="Кто сколько решил и с каким процентом"
              onClick={() => navigate('/admin/stats')}
              delay={150}
            />
          </>
        ) : (
          <>
            <HeroCard
              eyebrow="На время · как на экзамене"
              title="Пробный ЕНТ"
              subtitle="До 30 вопросов с таймером, результат и разбор в конце"
              onClick={() => navigate('/exam')}
              delay={90}
            />
            <ActionCard
              icon={IconPlay} title="Тренировка"
              subtitle="Решайте задания с мгновенной проверкой"
              onClick={() => navigate('/practice')}
              delay={150}
            />
            <ActionCard
              icon={IconChart} title="Мой прогресс"
              subtitle="Результаты, проценты и работа над ошибками"
              onClick={() => navigate('/cabinet')}
              delay={210}
            />
          </>
        )}
      </div>
    </div>
  )
}
