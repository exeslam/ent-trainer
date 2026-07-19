import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Brand, Card, IconPlay, IconClock, IconChart, IconGear, IconLogout, IconChevron,
} from '../components/ui'

function ActionCard({ icon: Icon, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-plum"
    >
      <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-plum-tint text-plum">
        <Icon />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display font-semibold">{title}</span>
        <span className="block text-sm text-ink-soft">{subtitle}</span>
      </span>
      <IconChevron className="h-5 w-5 flex-none text-ink-soft transition group-hover:text-plum" />
    </button>
  )
}

export default function Dashboard() {
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()
  const name = profile?.full_name?.trim() || 'ученик'
  const isTeacher = role === 'teacher'

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-12 pt-5">
      <header className="mb-7 flex items-center justify-between">
        <Brand />
        <button
          onClick={signOut}
          aria-label="Выйти"
          className="grid h-10 w-10 place-items-center rounded-xl text-ink-soft transition hover:bg-plum-tint hover:text-plum"
        >
          <IconLogout className="h-5 w-5" />
        </button>
      </header>

      <div className="mb-6">
        <p className="text-sm text-ink-soft">
          {isTeacher ? 'Кабинет учителя' : 'С возвращением,'}
        </p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {isTeacher ? name : name + '!'}
        </h1>
      </div>

      <div className="space-y-3">
        {isTeacher ? (
          <>
            <ActionCard
              icon={IconGear} title="Задания"
              subtitle="Добавить и отредактировать вопросы"
              onClick={() => navigate('/admin/questions')}
            />
            <ActionCard
              icon={IconChart} title="Статистика класса"
              subtitle="Кто сколько решил и с каким процентом"
              onClick={() => navigate('/admin/stats')}
            />
          </>
        ) : (
          <>
            <ActionCard
              icon={IconPlay} title="Тренировка"
              subtitle="Решать задания по одному"
              onClick={() => navigate('/practice')}
            />
            <ActionCard
              icon={IconClock} title="Пробный ЕНТ"
              subtitle="20–30 вопросов на время"
              onClick={() => navigate('/exam')}
            />
            <ActionCard
              icon={IconChart} title="Мой прогресс"
              subtitle="Результаты, проценты и ошибки"
              onClick={() => navigate('/cabinet')}
            />
          </>
        )}
      </div>

      <Card className="mt-6 p-4">
        <p className="text-sm text-ink-soft">
          Это ранняя версия тренажёра. Разделы будем наполнять по мере готовности.
        </p>
      </Card>
    </div>
  )
}
