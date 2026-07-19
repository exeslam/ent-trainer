import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button, Card, CountUp, Spinner } from '../components/ui'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const QUESTION_LIMIT = 30
const SECONDS_PER_QUESTION = 90

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const fmtTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function Exam() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [stage, setStage] = useState('loading') // loading | intro | running | done
  const [questions, setQuestions] = useState([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState([])     // выбранный индекс или null
  const [remaining, setRemaining] = useState(0)
  const [result, setResult] = useState(null)     // { correct, total, spentSec, saveError }
  const [exitAsk, setExitAsk] = useState(false)

  const deadlineRef = useRef(0)
  const startedAtRef = useRef(null)
  const finishedRef = useRef(false)
  const exitTimer = useRef(null)
  // Ответы дублируем в ref: finish() может вызваться из таймера,
  // и читать их из state было бы гонкой со StrictMode/замыканиями.
  const answersRef = useRef([])

  const totalSec = questions.length * SECONDS_PER_QUESTION

  useEffect(() => {
    let active = true
    supabase
      .from('questions')
      .select('id, body, options, correct_index, explanation')
      .eq('is_active', true)
      .then(({ data }) => {
        if (!active) return
        const qs = shuffle(data ?? []).slice(0, QUESTION_LIMIT)
        setQuestions(qs)
        setStage(qs.length ? 'intro' : 'empty')
      })
    return () => { active = false }
  }, [])

  function start() {
    startedAtRef.current = new Date().toISOString()
    deadlineRef.current = Date.now() + totalSec * 1000
    answersRef.current = Array(questions.length).fill(null)
    setAnswers(answersRef.current)
    setRemaining(totalSec)
    setIdx(0)
    finishedRef.current = false
    setStage('running')
  }

  /* таймер: считаем от дедлайна, чтобы не накапливать дрейф */
  useEffect(() => {
    if (stage !== 'running') return
    const t = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) finish()
    }, 400)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  function pick(i) {
    answersRef.current = answersRef.current.map((v, j) => (j === idx ? i : v))
    setAnswers(answersRef.current)
  }

  function next() {
    if (idx + 1 >= questions.length) finish()
    else setIdx(idx + 1)
  }

  async function finish() {
    if (finishedRef.current) return
    finishedRef.current = true

    const finalAnswers = answersRef.current
    const total = questions.length
    const correct = questions.reduce(
      (s, q, i) => s + (finalAnswers[i] === q.correct_index ? 1 : 0), 0)
    const spentSec = Math.min(totalSec,
      Math.round((Date.now() - new Date(startedAtRef.current).getTime()) / 1000))

    setResult({ correct, total, spentSec, saveError: false })
    setStage('done')

    // Сохраняем: exams + attempts (только отвеченные)
    const { data: exam, error } = await supabase
      .from('exams')
      .insert({
        student_id: user.id,
        total,
        correct,
        started_at: startedAtRef.current,
        finished_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (error) { setResult((r) => ({ ...r, saveError: true })); return }
    const rows = questions
      .map((q, i) => ({ q, sel: finalAnswers[i] }))
      .filter((x) => x.sel !== null)
      .map((x) => ({
        student_id: user.id,
        question_id: x.q.id,
        selected_index: x.sel,
        is_correct: x.sel === x.q.correct_index,
        mode: 'exam',
        exam_id: exam.id,
      }))
    if (rows.length) {
      const { error: e2 } = await supabase.from('attempts').insert(rows)
      if (e2) setResult((r) => ({ ...r, saveError: true }))
    }
  }

  function askExit() {
    clearTimeout(exitTimer.current)
    setExitAsk(true)
    exitTimer.current = setTimeout(() => setExitAsk(false), 4000)
  }

  /* ---------- загрузка ---------- */
  if (stage === 'loading') {
    return <div className="grid min-h-dvh place-items-center"><Spinner className="h-8 w-8" /></div>
  }

  /* ---------- нет вопросов ---------- */
  if (stage === 'empty') {
    return (
      <div className="mx-auto min-h-dvh max-w-lg px-4 pt-16">
        <Card className="p-8 text-center">
          <h1 className="font-display text-xl font-semibold">Заданий пока нет</h1>
          <p className="mx-auto mt-3 max-w-xs text-sm text-ink-soft">
            Учитель скоро добавит вопросы — и пробный ЕНТ станет доступен.
          </p>
          <Link to="/" className="mt-6 inline-block"><Button variant="outline">На главную</Button></Link>
        </Card>
      </div>
    )
  }

  /* ---------- интро ---------- */
  if (stage === 'intro') {
    return (
      <div className="mx-auto min-h-dvh max-w-lg px-4 pt-14">
        <Card className="p-7">
          <p className="text-xs uppercase tracking-widest text-ink-soft">Пробный ЕНТ</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            {questions.length} вопросов · {Math.round(totalSec / 60)} минут
          </h1>
          <ul className="mt-5 space-y-2.5 text-sm leading-relaxed text-ink-soft">
            <li className="flex gap-2.5"><span className="text-plum">—</span> Как на экзамене: правильные ответы покажем только в конце.</li>
            <li className="flex gap-2.5"><span className="text-plum">—</span> Ответ можно изменить, пока не перешли к следующему вопросу.</li>
            <li className="flex gap-2.5"><span className="text-plum">—</span> Вопрос можно пропустить — он засчитается как ошибка.</li>
            <li className="flex gap-2.5"><span className="text-plum">—</span> Когда время закончится, тест завершится сам.</li>
          </ul>
          <div className="mt-7 flex flex-col gap-2.5">
            <Button onClick={start}>Начать</Button>
            <Link to="/" className="block"><Button variant="outline" className="w-full">На главную</Button></Link>
          </div>
        </Card>
      </div>
    )
  }

  /* ---------- результат ---------- */
  if (stage === 'done' && result) {
    const pct = result.total ? Math.round((result.correct / result.total) * 100) : 0
    return (
      <div className="mx-auto min-h-dvh max-w-lg px-4 pb-14 pt-10">
        <Card className="p-8 text-center">
          <p className="text-sm uppercase tracking-widest text-ink-soft">Пробный ЕНТ завершён</p>
          <p className="mt-4 font-mono text-6xl font-semibold text-plum"><CountUp value={pct} suffix="%" /></p>
          <p className="mt-2 text-ink-soft">
            Правильно {result.correct} из {result.total} · время {fmtTime(result.spentSec)}
          </p>
          {result.saveError && (
            <p className="mt-3 text-xs text-ink-soft">
              Результат не сохранился (проблемы с сетью), но разбор ниже доступен.
            </p>
          )}
        </Card>

        <h2 className="mb-3 mt-8 font-display text-lg font-semibold">Разбор ответов</h2>
        <div className="space-y-2.5">
          {questions.map((q, qi) => {
            const sel = answers[qi]
            const right = sel === q.correct_index
            return (
              <details key={q.id} className="group rounded-2xl border border-line bg-surface open:border-plum">
                <summary className="flex cursor-pointer list-none items-start gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <span className={[
                    'mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-lg font-mono text-xs font-semibold',
                    right ? 'bg-ok-tint text-ok' : sel === null ? 'bg-line text-ink-soft' : 'bg-bad-tint text-bad',
                  ].join(' ')}>
                    {sel === null ? '—' : LETTERS[sel]}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium leading-snug line-clamp-2">{q.body}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="mt-1 h-4 w-4 flex-none text-ink-soft transition group-open:rotate-180" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <div className="border-t border-line px-4 pb-4 pt-3">
                  <div className="space-y-1.5">
                    {q.options.map((opt, i) => {
                      const isCorrect = i === q.correct_index
                      const isPicked = i === sel
                      return (
                        <div key={i} className={[
                          'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm',
                          isCorrect ? 'border-ok bg-ok-tint font-medium' :
                          isPicked ? 'border-bad bg-bad-tint' : 'border-line opacity-60',
                        ].join(' ')}>
                          <span className={[
                            'grid h-6 w-6 flex-none place-items-center rounded font-mono text-xs font-semibold',
                            isCorrect ? 'bg-ok text-white' : isPicked ? 'bg-bad text-white' : 'bg-plum-tint text-plum',
                          ].join(' ')}>{LETTERS[i]}</span>
                          <span className="min-w-0 flex-1">{opt}</span>
                          {isCorrect && <span className="text-xs font-semibold text-ok">верно</span>}
                          {isPicked && !isCorrect && <span className="text-xs text-bad">ваш ответ</span>}
                        </div>
                      )
                    })}
                  </div>
                  {sel === null && <p className="mt-2.5 text-xs text-ink-soft">Вопрос был пропущен.</p>}
                  {q.explanation && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{q.explanation}</p>}
                </div>
              </details>
            )
          })}
        </div>

        <div className="mt-7 flex flex-col gap-2.5">
          <Link to="/cabinet" className="block"><Button className="w-full">Мой прогресс</Button></Link>
          <Link to="/" className="block"><Button variant="outline" className="w-full">На главную</Button></Link>
        </div>
      </div>
    )
  }

  /* ---------- экзамен ---------- */
  const q = questions[idx]
  const sel = answers[idx]
  const lowTime = remaining <= 60

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-28">
      <header className="sticky top-0 z-10 -mx-4 mb-5 border-b border-line bg-paper/90 px-4 pb-3 pt-4 backdrop-blur">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          {exitAsk ? (
            <button onClick={() => navigate('/')}
              className="rounded-lg bg-bad px-3 py-1.5 text-sm font-semibold text-white">
              Выйти? Результат пропадёт
            </button>
          ) : (
            <button onClick={askExit}
              className="text-sm font-medium text-ink-soft transition hover:text-plum">
              ← Выйти
            </button>
          )}
          <span
            role="timer" aria-label="Оставшееся время"
            className={`font-mono text-base font-semibold tabular-nums ${lowTime ? 'text-bad' : 'text-ink'}`}
          >
            {fmtTime(remaining)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-plum transition-all duration-500"
              style={{ width: `${(idx / questions.length) * 100}%` }} />
          </div>
          <span className="font-mono text-xs text-ink-soft">
            <b className="font-semibold text-plum">{idx + 1}</b>/{questions.length}
          </span>
        </div>
      </header>

      <h1 className="mb-5 font-display text-xl font-semibold leading-snug">{q.body}</h1>

      <div className="space-y-2.5" role="group" aria-label="Варианты ответа">
        {q.options.map((opt, i) => {
          const isPicked = sel === i
          return (
            <button key={i} onClick={() => pick(i)} aria-pressed={isPicked}
              className={[
                'flex w-full items-center gap-3.5 rounded-xl border-2 bg-surface p-4 text-left transition active:translate-y-px',
                isPicked ? 'border-plum bg-plum-tint' : 'border-line hover:border-plum',
              ].join(' ')}
            >
              <span className={[
                'grid h-9 w-9 flex-none place-items-center rounded-lg font-mono text-sm font-semibold transition',
                isPicked ? 'bg-plum text-white' : 'bg-plum-tint text-plum',
              ].join(' ')}>{LETTERS[i]}</span>
              <span className="min-w-0 flex-1 font-medium leading-snug">{opt}</span>
            </button>
          )
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/95 px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg gap-2.5">
          <Button variant="ghost" onClick={next} className="flex-none">
            Пропустить
          </Button>
          <Button onClick={next} disabled={sel === null} className="flex-1">
            {idx + 1 >= questions.length ? 'Завершить' : 'Далее'}
          </Button>
        </div>
      </div>
    </div>
  )
}
