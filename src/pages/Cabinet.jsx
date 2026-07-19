import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Arcs, Button, Card, CountUp, Ring, Spinner } from '../components/ui'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function Cabinet() {
  const { user } = useAuth()
  const [attempts, setAttempts] = useState(null) // null = загрузка
  const [exams, setExams] = useState([])
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([
      supabase
        .from('attempts')
        .select('question_id, selected_index, is_correct, created_at, questions(body, options, correct_index, explanation)')
        .eq('student_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('exams')
        .select('id, total, correct, started_at, finished_at')
        .eq('student_id', user.id)
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: false }),
    ]).then(([a, e]) => {
      if (!active) return
      if (a.error) { setLoadError(true); setAttempts([]); return }
      setAttempts(a.data ?? [])
      setExams(e.data ?? [])
    })
    return () => { active = false }
  }, [user.id])

  const stats = useMemo(() => {
    if (!attempts) return null
    const total = attempts.length
    const correct = attempts.filter((a) => a.is_correct).length
    // По каждому вопросу берём ПОСЛЕДНЮЮ попытку: если ошибку потом исправили —
    // она уходит из «работы над ошибками».
    const latestByQ = new Map()
    for (const a of attempts) latestByQ.set(a.question_id, a)
    const mistakes = [...latestByQ.values()]
      .filter((a) => !a.is_correct && a.questions)
      .reverse()
    return { total, correct, pct: total ? Math.round((correct / total) * 100) : 0, mistakes }
  }, [attempts])

  if (attempts === null) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-12 pt-5">
      <header className="mb-6 flex animate-rise items-center justify-between">
        <Link to="/" className="text-sm font-medium text-ink-soft transition hover:text-plum">
          ← На главную
        </Link>
      </header>

      <h1 className="mb-5 animate-rise font-display text-[2rem] font-bold leading-tight tracking-tight" style={{ animationDelay: '40ms' }}>
        Мой прогресс
      </h1>

      {loadError && (
        <Card className="mb-4 border-bad p-4 text-sm text-ink-soft">
          Не получилось загрузить данные. Проверьте интернет и обновите страницу.
        </Card>
      )}

      {stats.total === 0 ? (
        <Card className="animate-rise p-8 text-center">
          <h2 className="font-display text-xl font-semibold">Пока пусто</h2>
          <p className="mx-auto mt-3 max-w-xs text-sm text-ink-soft">
            Решите первые задания — здесь появится ваша статистика и разбор ошибок.
          </p>
          <Link to="/practice" className="mt-6 inline-block">
            <Button>Начать тренировку</Button>
          </Link>
        </Card>
      ) : (
        <>
          {/* ---- сводка: тёмная панель с кольцом ---- */}
          <Card variant="dark" className="mb-6 animate-rise p-6" style={{ animationDelay: '90ms' }}>
            <Arcs className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 text-plum-glow" />
            <div className="relative flex items-center gap-5">
              <Ring value={stats.pct} tone="dark" size={128} stroke={10}>
                <div>
                  <p className="font-mono text-3xl font-semibold"><CountUp value={stats.pct} suffix="%" /></p>
                  <p className="mt-0.5 text-[11px] text-lavender">правильных</p>
                </div>
              </Ring>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-4xl font-semibold"><CountUp value={stats.total} /></p>
                <p className="mt-0.5 text-sm text-lavender">ответов всего</p>
                <p className="mt-3 text-sm text-lavender">
                  верных — <b className="font-semibold text-white">{stats.correct}</b>
                </p>
              </div>
            </div>
          </Card>

          {/* ---- пробные ЕНТ ---- */}
          {exams.length > 0 && (
            <section className="mb-6 animate-rise" style={{ animationDelay: '140ms' }}>
              <h2 className="mb-3 font-display text-lg font-semibold">Пробные ЕНТ</h2>
              <div className="space-y-2.5">
                {exams.map((e) => {
                  const pct = e.total ? Math.round((e.correct / e.total) * 100) : 0
                  const d = new Date(e.finished_at)
                  return (
                    <Card key={e.id} className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                          <span className="font-normal text-ink-soft">
                            {' · '}
                            {d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-ink-soft">верно {e.correct} из {e.total}</p>
                      </div>
                      <span className={[
                        'flex-none rounded-xl px-2.5 py-1.5 font-mono text-sm font-semibold',
                        pct >= 70 ? 'bg-ok-tint text-ok' : pct >= 40 ? 'bg-plum-tint text-plum' : 'bg-bad-tint text-bad',
                      ].join(' ')}>{pct}%</span>
                    </Card>
                  )
                })}
              </div>
            </section>
          )}

          {/* ---- работа над ошибками ---- */}
          <section className="animate-rise" style={{ animationDelay: '190ms' }}>
            <h2 className="mb-3 font-display text-lg font-semibold">
              Работа над ошибками
              {stats.mistakes.length > 0 && (
                <span className="ml-2 inline-grid h-6 min-w-6 place-items-center rounded-full bg-bad-tint px-1.5 align-middle font-mono text-xs font-semibold text-bad">
                  {stats.mistakes.length}
                </span>
              )}
            </h2>

            {stats.mistakes.length === 0 ? (
              <Card className="border-ok bg-ok-tint/50 p-5">
                <p className="font-display font-semibold text-ok">Ошибок нет — так держать!</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Если ответите неверно, вопрос появится здесь с разбором.
                </p>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {stats.mistakes.map((a) => {
                  const q = a.questions
                  return (
                    <details key={a.question_id} className="group rounded-2xl border border-line/70 bg-surface shadow-card open:border-plum">
                      <summary className="flex cursor-pointer list-none items-start gap-3 p-4 [&::-webkit-details-marker]:hidden">
                        <span className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-lg bg-bad-tint font-mono text-xs font-semibold text-bad">
                          {LETTERS[a.selected_index] ?? '?'}
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-medium leading-snug line-clamp-2">
                          {q.body}
                        </span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round"
                          className="mt-1 h-4 w-4 flex-none text-ink-soft transition group-open:rotate-180" aria-hidden="true">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </summary>
                      <div className="border-t border-line px-4 pb-4 pt-3">
                        <div className="space-y-1.5">
                          {q.options.map((opt, i) => {
                            const isCorrect = i === q.correct_index
                            const isPicked = i === a.selected_index
                            return (
                              <div key={i} className={[
                                'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm',
                                isCorrect ? 'border-ok bg-ok-tint font-medium' :
                                isPicked ? 'border-bad bg-bad-tint' :
                                'border-line opacity-60',
                              ].join(' ')}>
                                <span className={[
                                  'grid h-6 w-6 flex-none place-items-center rounded font-mono text-xs font-semibold',
                                  isCorrect ? 'bg-ok text-white' : isPicked ? 'bg-bad text-white' : 'bg-plum-tint text-plum',
                                ].join(' ')}>
                                  {LETTERS[i]}
                                </span>
                                <span className="min-w-0 flex-1">{opt}</span>
                                {isCorrect && <span className="text-xs font-semibold text-ok">верно</span>}
                                {isPicked && !isCorrect && <span className="text-xs text-bad">ваш ответ</span>}
                              </div>
                            )
                          })}
                        </div>
                        {q.explanation && (
                          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{q.explanation}</p>
                        )}
                      </div>
                    </details>
                  )
                })}
              </div>
            )}
          </section>

          <Link to="/practice" className="mt-7 block animate-rise" style={{ animationDelay: '240ms' }}>
            <Button className="w-full">Продолжить тренировку</Button>
          </Link>
        </>
      )}
    </div>
  )
}
