import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button, Card, CheckDraw, Confetti, CountUp, CrossDraw, Ring, Spinner } from '../components/ui'

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
  const pct = total ? Math.round((index / total) * 100) : 0
  return (
    <header className="sticky top-0 z-10 -mx-4 mb-6 bg-paper/85 px-4 pb-3.5 pt-4 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <Link to="/" className="text-sm font-bold text-ink-soft transition hover:text-plum">
          ← Завершить
        </Link>
        <span className="rounded-full bg-white px-3 py-1 font-display text-sm font-bold text-ink-soft" style={{ boxShadow: '0 2px 0 0 var(--color-line)' }}>
          <b className="text-plum">{Math.min(index + 1, total)}</b> / {total}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-line" role="progressbar"
        aria-valuemin={0} aria-valuemax={total} aria-valuenow={index} aria-label="Прогресс тренировки">
        <div className="h-full rounded-full bg-ok-bright transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </header>
  )
}

export default function Practice() {
  const [all, setAll] = useState(null)
  const [queue, setQueue] = useState([])
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState(null)
  const [reveal, setReveal] = useState(null)   // {is_correct, correct_index, explanation} — от сервера
  const [checking, setChecking] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [done, setDone] = useState(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let active = true
    // Правильный ответ НЕ приходит в браузер — только текст и варианты.
    supabase
      .from('questions')
      .select('id, body, options')
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
    setIdx(0); setPicked(null); setReveal(null); setCorrectCount(0); setDone(false)
  }

  async function pick(i) {
    if (picked !== null || checking) return
    setPicked(i)
    setChecking(true)
    // Проверку делает сервер: клиент не знает правильный ответ заранее.
    const { data, error } = await supabase.rpc('answer_practice', {
      p_question_id: queue[idx].id, p_selected_index: i,
    })
    setChecking(false)
    if (error || !data) { setPicked(null); return } // сеть моргнула — можно ответить снова
    setReveal(data)
    if (data.is_correct) setCorrectCount((c) => c + 1)
  }

  function next() {
    if (idx + 1 >= queue.length) { setDone(true); return }
    setIdx(idx + 1)
    setPicked(null)
    setReveal(null)
  }

  if (all === null) {
    return <div className="grid min-h-dvh place-items-center"><Spinner className="h-8 w-8" /></div>
  }

  if (queue.length === 0) {
    return (
      <div className="mx-auto min-h-dvh max-w-lg px-4 pt-16">
        <Card className="animate-pop p-8 text-center">
          <h1 className="font-display text-xl font-bold">
            {loadError ? 'Не получилось загрузить задания' : 'Заданий пока нет'}
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm font-semibold text-ink-soft">
            {loadError ? 'Проверьте интернет и попробуйте ещё раз.' : 'Учитель скоро добавит первые задания — загляните позже.'}
          </p>
          <Link to="/" className="mt-6 inline-block"><Button variant="outline">На главную</Button></Link>
        </Card>
      </div>
    )
  }

  /* ---------- финал ---------- */
  if (done) {
    const cc = correctCount
    const qlen = queue.length
    const pct = Math.round((cc / qlen) * 100)
    const win = pct >= 80
    const word =
      pct >= 90 ? 'Блестяще! 🎉' : pct >= 70 ? 'Отличная работа!' :
      pct >= 40 ? 'Неплохо — продолжай тренироваться.' : 'Главное — практика. Ещё разок!'
    return (
      <div className="mx-auto min-h-dvh max-w-lg px-4 pb-12 pt-10">
        <div className="relative">
          <Confetti fire={win} />
          <Card className="animate-pop p-8 text-center">
            <p className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">Тренировка завершена</p>
            <div className="mt-6 flex justify-center">
              <Ring value={pct} size={172} stroke={14}>
                <div>
                  <p className="font-display text-5xl font-bold text-plum"><CountUp value={pct} suffix="%" /></p>
                  <p className="mt-1 text-xs font-bold text-ink-soft">{cc} из {qlen}</p>
                </div>
              </Ring>
            </div>
            <p className="mt-6 font-display text-xl font-bold">{word}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber/15 px-3 py-1.5 font-display text-sm font-bold text-amber-dark">
              +{cc * 10} XP
            </div>
            <div className="mt-7 flex flex-col gap-3">
              <Button variant="success" onClick={restart}>Ещё раз</Button>
              <Link to="/" className="block"><Button variant="outline" className="w-full">На главную</Button></Link>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  /* ---------- решение ---------- */
  const q = queue[idx]
  const answered = picked !== null
  const isRight = reveal?.is_correct

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-28">
      <TopBar index={idx} total={queue.length} />

      <h1 key={q.id} className="mb-6 animate-rise font-display text-[1.6rem] font-bold leading-snug">{q.body}</h1>

      <div className="space-y-3" role="group" aria-label="Варианты ответа">
        {q.options.map((opt, i) => {
          const isCorrectOpt = reveal && i === reveal.correct_index
          const isWrongPick = reveal && picked === i && i !== reveal.correct_index
          const isPending = checking && picked === i           // ждём ответ сервера
          const dim = reveal && !isCorrectOpt && !isWrongPick
          return (
            <button
              key={`${q.id}-${i}`} onClick={() => pick(i)} disabled={answered}
              style={{ animationDelay: `${50 + i * 45}ms`, boxShadow: answered ? 'none' : '0 3px 0 0 var(--color-line)' }}
              className={[
                'flex w-full animate-rise items-center gap-3.5 rounded-2xl border-2 bg-surface p-4 text-left transition disabled:pointer-events-none',
                isCorrectOpt ? 'border-ok-bright bg-ok-tint' :
                isWrongPick ? 'animate-shake border-bad bg-bad-tint' :
                isPending ? 'border-plum bg-plum-tint' :
                dim ? 'border-line opacity-40' : 'border-line hover:border-plum active:translate-y-0.5',
              ].join(' ')}
            >
              <span className={[
                'grid h-11 w-11 flex-none place-items-center rounded-xl font-display text-base font-bold transition',
                isCorrectOpt ? 'bg-ok-bright text-white' : isWrongPick ? 'bg-bad text-white' :
                isPending ? 'bg-plum text-white' : 'bg-plum-tint text-plum',
              ].join(' ')}>{LETTERS[i]}</span>
              <span className="min-w-0 flex-1 font-bold leading-snug">{opt}</span>
              {isCorrectOpt && <CheckDraw className="h-6 w-6 flex-none text-ok" />}
              {isWrongPick && <CrossDraw className="h-6 w-6 flex-none text-bad" />}
              {isPending && <Spinner className="h-5 w-5 flex-none border-white/40 border-t-white" />}
            </button>
          )
        })}
      </div>

      <div aria-live="polite">
        {reveal && (
          <div className={`mt-6 animate-rise rounded-3xl border-2 p-5 ${isRight ? 'border-ok-bright bg-ok-tint' : 'border-bad bg-bad-tint'}`}>
            <p className={`font-display text-lg font-bold ${isRight ? 'text-ok' : 'text-bad'}`}>
              {isRight ? 'Верно! 🎯' : `Неверно. Правильный ответ — ${LETTERS[reveal.correct_index]}.`}
            </p>
            {reveal.explanation && <p className="mt-1.5 text-sm font-semibold text-ink-soft">{reveal.explanation}</p>}
            <Button variant={isRight ? 'success' : 'primary'} onClick={next} autoFocus className="mt-4 w-full">
              {idx + 1 >= queue.length ? 'Показать результат' : 'Далее'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
