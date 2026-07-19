import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CountUp, Spinner } from '../../components/ui'
import { supabase } from '../../lib/supabase'

export default function AdminStats() {
  const [students, setStudents] = useState(null)
  const [attempts, setAttempts] = useState(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([
      supabase.from('profiles').select('id, full_name, created_at').eq('role', 'student'),
      supabase.from('attempts').select('student_id, is_correct, created_at'),
    ]).then(([p, a]) => {
      if (!active) return
      if (p.error || a.error) { setLoadError(true); setStudents([]); setAttempts([]); return }
      setStudents(p.data ?? [])
      setAttempts(a.data ?? [])
    })
    return () => { active = false }
  }, [])

  const rows = useMemo(() => {
    if (!students || !attempts) return null
    const agg = new Map()
    for (const a of attempts) {
      const s = agg.get(a.student_id) ?? { total: 0, correct: 0, lastAt: null }
      s.total += 1
      if (a.is_correct) s.correct += 1
      if (!s.lastAt || a.created_at > s.lastAt) s.lastAt = a.created_at
      agg.set(a.student_id, s)
    }
    return students
      .map((st) => {
        const s = agg.get(st.id) ?? { total: 0, correct: 0, lastAt: null }
        return {
          id: st.id,
          name: st.full_name?.trim() || 'Без имени',
          total: s.total,
          correct: s.correct,
          pct: s.total ? Math.round((s.correct / s.total) * 100) : null,
          lastAt: s.lastAt,
        }
      })
      .sort((x, y) => y.total - x.total || x.name.localeCompare(y.name, 'ru'))
  }, [students, attempts])

  if (rows === null) {
    return <div className="grid min-h-dvh place-items-center"><Spinner className="h-8 w-8" /></div>
  }

  const totalAnswers = rows.reduce((s, r) => s + r.total, 0)
  const activeCount = rows.filter((r) => r.total > 0).length

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-16 pt-5">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="text-sm font-medium text-ink-soft transition hover:text-plum">← На главную</Link>
        <Link to="/admin/questions" className="text-sm font-medium text-plum underline underline-offset-2">Задания</Link>
      </header>

      <h1 className="mb-5 font-display text-2xl font-semibold tracking-tight">Статистика класса</h1>

      {loadError && (
        <Card className="mb-4 border-bad p-4 text-sm text-ink-soft">
          Не получилось загрузить данные. Обновите страницу.
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-ink-soft">Учеников</p>
          <p className="mt-1 font-mono text-4xl font-semibold text-ink"><CountUp value={rows.length} /></p>
          <p className="mt-1 text-xs text-ink-soft">решали: {activeCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-ink-soft">Ответов</p>
          <p className="mt-1 font-mono text-4xl font-semibold text-plum"><CountUp value={totalAnswers} /></p>
          <p className="mt-1 text-xs text-ink-soft">всего от класса</p>
        </Card>
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-ink-soft">
            Учеников пока нет. Отправьте им ссылку на сайт — после регистрации они появятся здесь.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {r.total === 0
                    ? 'ещё не решал(а)'
                    : `решено ${r.total} · верно ${r.correct}`}
                </p>
              </div>
              {r.pct !== null && (
                <span className={[
                  'flex-none rounded-lg px-2.5 py-1.5 font-mono text-sm font-semibold',
                  r.pct >= 70 ? 'bg-ok-tint text-ok' : r.pct >= 40 ? 'bg-plum-tint text-plum' : 'bg-bad-tint text-bad',
                ].join(' ')}>
                  {r.pct}%
                </span>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
