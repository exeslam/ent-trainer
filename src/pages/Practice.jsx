import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button, Card, CountUp, Spinner } from '../components/ui'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function TopBar({ index, total }) {
  const pct = total ? Math.round(((index) / total) * 100) : 0
  return (
    <header className="sticky top-0 z-10 -mx-4 mb-5 border-b border-line bg-paper/90 px-4 pb-3 pt-4 backdrop-blur">
      <div className="mb-2.5 flex items-center justify-between">
        <Link to="/" className="text-sm font-medium text-ink-soft transition hover:text-plum">
          ← Завершить
        </Link>
        <span className="font-mono text-sm text-ink-soft">
          <b className="font-semibold text-plum">{Math.min(index + 1, total)}</b> / {total}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-line" role="progressbar"
        aria-valuemin={0} aria-valuemax={total} aria-valuenow={index}
        aria-label="Прогресс тренировки">
        <div className="h-full rounded-full bg-plum transition-all duration-500"
          style={{ width: `${pct}%` }} />
      </div>
    </header>
  )
}

export default function Practice() {
  const { user } = useAuth()
  const [all, setAll] = useState(null)      // null = загрузка
  const [queue, setQueue] = useState([])
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [failedWrites, setFailedWrites] = useState(0)
  const [done, setDone] = useState(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let active = true
    supabase
      .from('questions')
      .select('id, body, options, correct_index, explanation')
      .eq('is_active', true)
      .then(({ data, error }) => {
        if (!active) return
        if (error) { setLoadError(true); setAll([]); return }
        setAll(data ?? [])
        setQueue(shuffle(data ?? []))
      })
    return () => { active = false }
  }, [])

  function restart() {
    setQueue(shuffle(all))
    setIdx(0); setPicked(null); setCorrectCount(0); setFailedWrites(0); setDone(false)
  }

  function pick(i) {
    if (picked !== null) return
    const q = queue[idx]
    const isCorrect = i === q.correct_index
    setPicked(i)
    if (isCorrect) setCorrectCount((c) => c + 1)
    // Пишем попытку в фоне, не блокируя интерфейс
    supabase.from('attempts').insert({
      student_id: user.id,
      question_id: q.id,
      selected_index: i,
      is_correct: isCorrect,
      mode: 'practice',
    }).then(({ error }) => { if (error) setFailedWrites((f) => f + 1) })
  }

  function next() {
    if (idx + 1 >= queue.length) { setDone(true); return }
    setIdx(idx + 1)
    setPicked(null)
  }

  /* ---------- загрузка ---------- */
  if (all === null) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  /* ---------- пусто / ошибка ---------- */
  if (queue.length === 0) {
    return (
      <div className="mx-auto min-h-dvh max-w-lg px-4 pt-16">
        <Card className="p-8 text-center">
          <h1 className="font-display text-xl font-semibold">
            {loadError ? 'Не получилось загрузить задания' : 'Заданий пока нет'}
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm text-ink-soft">
            {loadError
              ? 'Проверьте интернет и попробуйте ещё раз.'
              : 'Учитель скоро добавит первые задания — загляните позже.'}
          </p>
          <Link to="/" className="mt-6 inline-block">
            <Button variant="outline">На главную</Button>
          </Link>
        </Card>
      </div>
    )
  }

  /* ---------- финал ---------- */
  if (done) {
    const pct = Math.round((correctCount / queue.length) * 100)
    const word =
      pct >= 90 ? 'Отличный результат!' :
      pct >= 70 ? 'Хороший результат!' :
      pct >= 40 ? 'Неплохо — продолжайте тренироваться.' :
      'Главное — практика. Попробуйте ещё раз!'
    return (
      <div className="mx-auto min-h-dvh max-w-lg px-4 pt-16">
        <Card className="p-8 text-center">
          <p className="text-sm uppercase tracking-widest text-ink-soft">Тренировка завершена</p>
          <p className="mt-4 font-mono text-6xl font-semibold text-plum">
            <CountUp value={pct} suffix="%" />
          </p>
          <p className="mt-2 text-ink-soft">
            Правильно {correctCount} из {queue.length}
          </p>
          <p className="mt-4 font-medium">{word}</p>
          {failedWrites > 0 && (
            <p className="mt-3 text-xs text-ink-soft">
              Часть ответов не сохранилась (проблемы с сетью) — на результат это не влияет.
            </p>
          )}
          <div className="mt-7 flex flex-col gap-2.5">
            <Button onClick={restart}>Ещё раз</Button>
            <Link to="/" className="block">
              <Button variant="outline" className="w-full">На главную</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  /* ---------- решение ---------- */
  const q = queue[idx]
  const answered = picked !== null
  const isRight = answered && picked === q.correct_index

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-28">
      <TopBar index={idx} total={queue.length} />

      <h1 className="mb-5 font-display text-xl font-semibold leading-snug">
        {q.body}
      </h1>

      <div className="space-y-2.5" role="group" aria-label="Варианты ответа">
        {q.options.map((opt, i) => {
          const isCorrectOpt = answered && i === q.correct_index
          const isWrongPick = answered && picked === i && !isCorrectOpt
          const dim = answered && !isCorrectOpt && !isWrongPick
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={answered}
              className={[
                'flex w-full items-center gap-3.5 rounded-xl border-2 bg-surface p-4 text-left transition',
                'disabled:pointer-events-none',
                isCorrectOpt ? 'border-ok bg-ok-tint' :
                isWrongPick ? 'border-bad bg-bad-tint' :
                dim ? 'border-line opacity-45' :
                'border-line hover:border-plum active:translate-y-px',
              ].join(' ')}
            >
              <span className={[
                'grid h-9 w-9 flex-none place-items-center rounded-lg font-mono text-sm font-semibold transition',
                isCorrectOpt ? 'bg-ok text-white' :
                isWrongPick ? 'bg-bad text-white' :
                'bg-plum-tint text-plum',
              ].join(' ')}>
                {LETTERS[i]}
              </span>
              <span className="min-w-0 flex-1 font-medium leading-snug">{opt}</span>
            </button>
          )
        })}
      </div>

      {/* обратная связь */}
      <div aria-live="polite">
        {answered && (
          <Card className={`mt-5 border-2 p-4 ${isRight ? 'border-ok' : 'border-bad'}`}>
            <p className={`font-display font-semibold ${isRight ? 'text-ok' : 'text-bad'}`}>
              {isRight ? 'Верно!' : `Неверно. Правильный ответ — ${LETTERS[q.correct_index]}.`}
            </p>
            {q.explanation && (
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{q.explanation}</p>
            )}
            <Button onClick={next} autoFocus className="mt-4 w-full">
              {idx + 1 >= queue.length ? 'Показать результат' : 'Далее'}
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
