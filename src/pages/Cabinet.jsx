import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button, Card, CountUp, MathShapes, Ring, Spinner } from '../components/ui'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function Cabinet() {
  const { user } = useAuth()
  const [attempts, setAttempts] = useState(null)
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
    const latestByQ = new Map()
    for (const a of attempts) latestByQ.set(a.question_id, a)
    const mistakes = [...latestByQ.values()].filter((a) => !a.is_correct && a.questions).reverse()
    const xp = correct * 10
    return { total, correct, pct: total ? Math.round((correct / total) * 100) : 0, mistakes, xp }
  }, [attempts])

  if (attempts === null) {
    return <div className="grid min-h-dvh place-items-center"><Spinner className="h-8 w-8" /></div>
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-12 pt-5">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="text-sm font-bold text-ink-soft transition hover:text-plum">← На главную</Link>
      </header>

      <h1 className="mb-5 font-display text-[2rem] font-bold leading-tight">Мой прогресс</h1>

      {loadError && (
        <Card className="mb-4 border-bad p-4 text-sm font-semibold text-ink-soft">
          Не получилось загрузить данные. Проверьте интернет и обновите страницу.
        </Card>
      )}

      {stats.total === 0 ? (
        <Card className="animate-pop p-8 text-center">
          <h2 className="font-display text-xl font-bold">Пока пусто</h2>
          <p className="mx-auto mt-3 max-w-xs text-sm font-semibold text-ink-soft">
            Реши первые задания — здесь появится статистика и разбор ошибок.
          </p>
          <Link to="/practice" className="mt-6 inline-block"><Button>Начать тренировку</Button></Link>
        </Card>
      ) : (
        <>
          {/* сводка с кольцом */}
          <div className="relative mb-6 overflow-hidden rounded-3xl bg-plum p-6 text-white" style={{ boxShadow: '0 5px 0 0 var(--color-plum-dark)' }}>
            <MathShapes />
            <div className="relative flex items-center gap-5">
              <Ring value={stats.pct} tone="dark" size={128} stroke={12}>
                <div>
                  <p className="font-display text-3xl font-bold"><CountUp value={stats.pct} suffix="%" /></p>
                  <p className="mt-0.5 text-[11px] font-bold text-white/70">верно</p>
                </div>
              </Ring>
              <div className="min-w-0 flex-1">
                <p className="font-display text-4xl font-bold"><CountUp value={stats.total} /></p>
                <p className="mt-0.5 text-sm font-bold text-white/80">ответов всего</p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 font-display text-sm font-bold">
                  ⭐ {stats.xp} XP
                </div>
              </div>
            </div>
          </div>

          {exams.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 font-display text-lg font-bold">Пробные ЕНТ</h2>
              <div className="space-y-2.5">
                {exams.map((e) => {
                  const pct = e.total ? Math.round((e.correct / e.total) * 100) : 0
                  const d = new Date(e.finished_at)
                  return (
                    <Card key={e.id} className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">
                          {d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                          <span className="font-semibold text-ink-soft">{' · '}{d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-ink-soft">верно {e.correct} из {e.total}</p>
                      </div>
                      <span className={[
                        'flex-none rounded-xl px-2.5 py-1.5 font-display text-sm font-bold',
                        pct >= 70 ? 'bg-ok-tint text-ok' : pct >= 40 ? 'bg-plum-tint text-plum' : 'bg-bad-tint text-bad',
                      ].join(' ')}>{pct}%</span>
                    </Card>
                  )
                })}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 font-display text-lg font-bold">
              Работа над ошибками
              {stats.mistakes.length > 0 && (
                <span className="ml-2 inline-grid h-6 min-w-6 place-items-center rounded-full bg-bad-tint px-1.5 align-middle font-display text-xs font-bold text-bad">
                  {stats.mistakes.length}
                </span>
              )}
            </h2>

            {stats.mistakes.length === 0 ? (
              <div className="rounded-3xl border-2 border-ok-bright bg-ok-tint p-5">
                <p className="font-display font-bold text-ok">Ошибок нет — так держать! 🎉</p>
                <p className="mt-1 text-sm font-semibold text-ink-soft">Если ответишь неверно, вопрос появится здесь с разбором.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {stats.mistakes.map((a) => {
                  const q = a.questions
                  return (
                    <details key={a.question_id} className="group rounded-2xl border-2 border-line bg-surface open:border-plum">
                      <summary className="flex cursor-pointer list-none items-start gap-3 p-4 [&::-webkit-details-marker]:hidden">
                        <span className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-lg bg-bad-tint font-display text-xs font-bold text-bad">
                          {LETTERS[a.selected_index] ?? '?'}
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-bold leading-snug line-clamp-2">{q.body}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                          className="mt-1 h-4 w-4 flex-none text-ink-soft transition group-open:rotate-180" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                      </summary>
                      <div className="border-t-2 border-line px-4 pb-4 pt-3">
                        <div className="space-y-1.5">
                          {q.options.map((opt, i) => {
                            const isCorrect = i === q.correct_index
                            const isPicked = i === a.selected_index
                            return (
                              <div key={i} className={[
                                'flex items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-sm font-semibold',
                                isCorrect ? 'border-ok-bright bg-ok-tint' : isPicked ? 'border-bad bg-bad-tint' : 'border-line opacity-60',
                              ].join(' ')}>
                                <span className={[
                                  'grid h-6 w-6 flex-none place-items-center rounded font-display text-xs font-bold',
                                  isCorrect ? 'bg-ok-bright text-white' : isPicked ? 'bg-bad text-white' : 'bg-plum-tint text-plum',
                                ].join(' ')}>{LETTERS[i]}</span>
                                <span className="min-w-0 flex-1">{opt}</span>
                                {isCorrect && <span className="text-xs font-bold text-ok">верно</span>}
                                {isPicked && !isCorrect && <span className="text-xs font-bold text-bad">ваш ответ</span>}
                              </div>
                            )
                          })}
                        </div>
                        {q.explanation && <p className="mt-3 text-sm font-semibold text-ink-soft">{q.explanation}</p>}
                      </div>
                    </details>
                  )
                })}
              </div>
            )}
          </section>

          <Link to="/practice" className="mt-7 block"><Button className="w-full">Продолжить тренировку</Button></Link>
        </>
      )}
    </div>
  )
}
