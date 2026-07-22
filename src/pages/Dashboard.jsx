import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  Brand, MathShapes, StatChip, IconArrow, IconPlay, IconClock, IconChart,
  IconGear, IconLogout, IconChevron, IconFlame, IconStar, IconCrown, IconUsers,
} from '../components/ui'

/* Считаем стрик/XP/уровень из уже накопленных попыток — без изменения схемы */
function computeGame(attempts) {
  const correct = attempts.filter((a) => a.is_correct).length
  const xp = correct * 10
  const level = Math.floor(xp / 100) + 1
  const intoLevel = xp % 100

  const days = new Set(
    attempts.map((a) => new Date(a.created_at).toLocaleDateString('en-CA')) // YYYY-MM-DD (local)
  )
  const dayKey = (d) => d.toLocaleDateString('en-CA')
  const today = new Date()
  const yest = new Date(); yest.setDate(today.getDate() - 1)
  let streak = 0
  const cursor = new Date()
  if (days.has(dayKey(today))) { /* start today */ }
  else if (days.has(dayKey(yest))) { cursor.setDate(cursor.getDate() - 1) }
  else return { xp, level, intoLevel, streak: 0 }
  while (days.has(dayKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1) }
  return { xp, level, intoLevel, streak }
}

function ActionCard({ icon: Icon, title, subtitle, onClick, delay = 0, tint = 'var(--color-plum)', tintBg = 'var(--color-plum-tint)' }) {
  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${delay}ms`, boxShadow: '0 3px 0 0 var(--color-line)' }}
      className="group flex w-full animate-rise items-center gap-4 rounded-3xl border-2 border-line bg-surface p-4 text-left transition hover:-translate-y-0.5 active:translate-y-0.5"
    >
      <span className="grid h-14 w-14 flex-none place-items-center rounded-2xl" style={{ background: tintBg, color: tint }}>
        <Icon className="h-7 w-7" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[17px] font-bold text-ink">{title}</span>
        <span className="mt-0.5 block text-sm font-semibold text-ink-soft">{subtitle}</span>
      </span>
      <IconChevron className="h-5 w-5 flex-none text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-plum" />
    </button>
  )
}

export default function Dashboard() {
  const { user, profile, role, signOut } = useAuth()
  const navigate = useNavigate()
  const isTeacher = role === 'teacher'
  const name = profile?.full_name?.trim() || 'ученик'
  const firstName = name.split(' ')[0]

  const [attempts, setAttempts] = useState(null)
  const [counts, setCounts] = useState(null)

  useEffect(() => {
    let active = true
    if (isTeacher) {
      Promise.all([
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      ]).then(([q, s]) => { if (active) setCounts({ questions: q.count ?? 0, students: s.count ?? 0 }) })
    } else {
      supabase.from('attempts').select('is_correct, created_at').eq('student_id', user.id)
        .then(({ data }) => { if (active) setAttempts(data ?? []) })
    }
    return () => { active = false }
  }, [user.id, isTeacher])

  const game = useMemo(() => computeGame(attempts ?? []), [attempts])

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-12 pt-5">
      <header className="mb-5 flex items-center justify-between">
        <Brand />
        <button onClick={signOut} aria-label="Выйти"
          className="grid h-10 w-10 place-items-center rounded-xl text-ink-soft transition hover:bg-plum-tint hover:text-plum">
          <IconLogout className="h-5 w-5" />
        </button>
      </header>

      {isTeacher ? (
        <>
          <div className="relative mb-6 overflow-hidden rounded-3xl bg-plum p-6 text-white"
            style={{ boxShadow: '0 5px 0 0 var(--color-plum-dark)' }}>
            <MathShapes />
            <p className="relative text-sm font-bold uppercase tracking-wide text-white/70">Кабинет учителя</p>
            <h1 className="relative mt-1 font-display text-2xl font-bold">{name}</h1>
            <div className="relative mt-4 flex gap-2.5">
              <StatChip icon={IconGear} value={counts?.questions ?? '—'} label="заданий" color="#fff" animate={false} />
              <StatChip icon={IconUsers} value={counts?.students ?? '—'} label="учеников" color="#fff" animate={false} />
            </div>
          </div>

          <div className="space-y-3.5">
            <ActionCard icon={IconGear} title="Задания" subtitle="Добавить и отредактировать вопросы"
              onClick={() => navigate('/admin/questions')} delay={40} />
            <ActionCard icon={IconChart} title="Статистика класса" subtitle="Кто сколько решил и с каким процентом"
              onClick={() => navigate('/admin/stats')} delay={90}
              tint="var(--color-grape)" tintBg="#F1EBFE" />
          </div>
        </>
      ) : (
        <>
          {/* игровой хиро-баннер */}
          <div className="relative mb-6 overflow-hidden rounded-3xl bg-plum p-6 text-white"
            style={{ boxShadow: '0 5px 0 0 var(--color-plum-dark)' }}>
            <MathShapes />
            <p className="relative text-sm font-bold text-white/80">Привет,</p>
            <h1 className="relative font-display text-[2rem] font-bold leading-tight">{firstName}! 👋</h1>

            <div className="relative mt-4 flex gap-2.5">
              <StatChip icon={IconFlame} value={game.streak} label="дней подряд" color="#FF9600" />
              <StatChip icon={IconStar} value={game.xp} label="очков XP" color="#FFD43B" />
              <StatChip icon={IconCrown} value={game.level} label="уровень" color="#FFE58A" />
            </div>

            {/* прогресс до следующего уровня */}
            <div className="relative mt-4">
              <div className="mb-1 flex justify-between text-[11px] font-bold text-white/70">
                <span>Уровень {game.level}</span>
                <span>{game.intoLevel}/100 XP</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-ok-bright transition-all duration-700"
                  style={{ width: `${attempts === null ? 0 : game.intoLevel}%` }} />
              </div>
            </div>
          </div>

          <div className="space-y-3.5">
            {/* главный CTA — пробный ЕНТ */}
            <button onClick={() => navigate('/exam')}
              style={{ boxShadow: '0 5px 0 0 var(--color-amber-dark)' }}
              className="group relative w-full overflow-hidden rounded-3xl bg-amber p-5 text-left text-ink transition active:translate-y-0.5">
              <MathShapes className="opacity-35" />
              <p className="relative text-[11px] font-bold uppercase tracking-wide text-ink/70">На время · как на экзамене</p>
              <p className="relative mt-1 font-display text-2xl font-bold">Пробный ЕНТ</p>
              <p className="relative mt-0.5 text-sm font-semibold text-ink/80">До 30 вопросов, результат и разбор в конце</p>
              <span className="relative mt-4 inline-grid h-11 w-11 place-items-center rounded-2xl bg-ink text-amber transition group-hover:translate-x-1">
                <IconArrow className="h-5 w-5" />
              </span>
            </button>

            <ActionCard icon={IconPlay} title="Тренировка" subtitle="Решай задания с мгновенной проверкой"
              onClick={() => navigate('/practice')} delay={40}
              tint="var(--color-ok)" tintBg="var(--color-ok-tint)" />
            <ActionCard icon={IconChart} title="Мой прогресс" subtitle="Результаты, проценты и работа над ошибками"
              onClick={() => navigate('/cabinet')} delay={90}
              tint="var(--color-grape)" tintBg="#F1EBFE" />
          </div>
        </>
      )}
    </div>
  )
}
