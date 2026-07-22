import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button, Card, Confetti, CountUp, MathShapes, Ring, Spinner } from '../components/ui'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const QUESTION_LIMIT = 30
const SECONDS_PER_QUESTION = 90
const LS_KEY = 'ent-exam-session'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function Exam() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [stage, setStage] = useState('loading') // loading|empty|intro|running|submitting|done
  const [questions, setQuestions] = useState([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState([])
  const [remaining, setRemaining] = useState(0)
  const [result, setResult] = useState(null)
  const [exitAsk, setExitAsk] = useState(false)

  const deadlineRef = useRef(0)
  const startedAtRef = useRef(null)
  const finishedRef = useRef(false)
  const exitTimer = useRef(null)
  const answersRef = useRef([])

  const totalSec = questions.length * SECONDS_PER_QUESTION

  // Сессия в localStorage — чтобы перезагрузка не обнуляла экзамен.
  function saveSession() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        studentId: user.id, startedAt: startedAtRef.current, deadline: deadlineRef.current,
        questions, answers: answersRef.current,
      }))
    } catch { /* переполнение/приватный режим — не критично */ }
  }
  function clearSession() { try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ } }

  useEffect(() => {
    let active = true
    // Пытаемся восстановить незавершённый экзамен
    let saved = null
    try { saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null') } catch { saved = null }
    if (saved && saved.studentId === user.id && saved.deadline > Date.now() && saved.questions?.length) {
      setQuestions(saved.questions)
      answersRef.current = saved.answers ?? Array(saved.questions.length).fill(null)
      setAnswers(answersRef.current)
      startedAtRef.current = saved.startedAt
      deadlineRef.current = saved.deadline
      setRemaining(Math.max(0, Math.ceil((saved.deadline - Date.now()) / 1000)))
      setIdx(0)
      finishedRef.current = false
      setStage('running')
      return
    }
    clearSession()
    // Правильные ответы НЕ приходят в браузер — только текст и варианты.
    supabase
      .from('questions')
      .select('id, body, options')
      .eq('is_active', true)
      .then(({ data }) => {
        if (!active) return
        const qs = shuffle(data ?? []).slice(0, QUESTION_LIMIT)
        setQuestions(qs)
        setStage(qs.length ? 'intro' : 'empty')
      })
    return () => { active = false }
  }, [user.id])

  function start() {
    startedAtRef.current = new Date().toISOString()
    deadlineRef.current = Date.now() + totalSec * 1000
    answersRef.current = Array(questions.length).fill(null)
    setAnswers(answersRef.current)
    setRemaining(totalSec)
    setIdx(0)
    finishedRef.current = false
    setStage('running')
    saveSession()
  }

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
    saveSession()
  }

  function next() {
    if (idx + 1 >= questions.length) finish()
    else setIdx(idx + 1)
  }

  async function finish() {
    if (finishedRef.current) return
    finishedRef.current = true
    clearSession()
    const spentSec = Math.min(totalSec, Math.round((Date.now() - new Date(startedAtRef.current).getTime()) / 1000))
    setResult({ spentSec })
    setStage('submitting')
    await submitNow(spentSec)
  }

  async function submitNow(spentSec) {
    const payload = questions.map((q, i) => ({ question_id: q.id, selected_index: answersRef.current[i] }))
    // Оценивает СЕРВЕР (клиент не знает правильных ответов).
    const { data, error } = await supabase.rpc('submit_exam', { p_answers: payload })
    if (error || !data) {
      setResult((r) => ({ ...r, saveError: true, spentSec }))
      setStage('done')
      return
    }
    const reviewByQ = {}
    for (const item of data.review) reviewByQ[item.question_id] = item
    setResult({ correct: data.correct, total: data.total, spentSec, reviewByQ, saveError: false })
    setStage('done')
  }

  function askExit() {
    clearTimeout(exitTimer.current)
    setExitAsk(true)
    exitTimer.current = setTimeout(() => setExitAsk(false), 4000)
  }
  function exitNow() { clearSession(); navigate('/') }

  if (stage === 'loading') {
    return <div className="grid min-h-dvh place-items-center"><Spinner className="h-8 w-8" /></div>
  }

  if (stage === 'submitting') {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="text-center">
          <Spinner className="mx-auto h-8 w-8" />
          <p className="mt-4 font-display font-bold text-ink-soft">Проверяем ответы…</p>
        </div>
      </div>
    )
  }

  if (stage === 'empty') {
    return (
      <div className="mx-auto min-h-dvh max-w-lg px-4 pt-16">
        <Card className="animate-pop p-8 text-center">
          <h1 className="font-display text-xl font-bold">Заданий пока нет</h1>
          <p className="mx-auto mt-3 max-w-xs text-sm font-semibold text-ink-soft">
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
      <div className="mx-auto min-h-dvh max-w-lg px-4 pb-12 pt-12">
        <div className="relative animate-pop overflow-hidden rounded-3xl bg-amber p-7 text-ink" style={{ boxShadow: '0 6px 0 0 var(--color-amber-dark)' }}>
          <MathShapes className="opacity-40" />
          <p className="relative font-display text-sm font-bold uppercase tracking-wide text-ink/70">Пробный ЕНТ</p>
          <div className="relative mt-4 flex gap-3">
            <div className="flex-1 rounded-2xl bg-black/10 p-4">
              <p className="font-display text-3xl font-bold">{questions.length}</p>
              <p className="mt-0.5 text-xs font-bold text-ink/70">вопросов</p>
            </div>
            <div className="flex-1 rounded-2xl bg-black/10 p-4">
              <p className="font-display text-3xl font-bold">{Math.round(totalSec / 60)}</p>
              <p className="mt-0.5 text-xs font-bold text-ink/70">минут</p>
            </div>
          </div>
          <ul className="relative mt-6 space-y-2.5 text-sm font-semibold leading-relaxed text-ink/90">
            <li className="flex gap-2.5"><span>✓</span> Как на экзамене: правильные ответы — в конце.</li>
            <li className="flex gap-2.5"><span>✓</span> Ответ можно изменить, пока не перешёл дальше.</li>
            <li className="flex gap-2.5"><span>✓</span> Пропущенный вопрос засчитается как ошибка.</li>
            <li className="flex gap-2.5"><span>✓</span> Перезагрузка не страшна — вернёшься на то же место.</li>
          </ul>
          <div className="relative mt-7 flex flex-col gap-3">
            <Button variant="light" onClick={start}>Начать</Button>
            <Link to="/" className="block"><Button variant="ghost" className="w-full">На главную</Button></Link>
          </div>
        </div>
      </div>
    )
  }

  /* ---------- результат ---------- */
  if (stage === 'done' && result) {
    if (result.saveError) {
      return (
        <div className="mx-auto min-h-dvh max-w-lg px-4 pt-16">
          <Card className="animate-pop p-8 text-center">
            <h1 className="font-display text-xl font-bold">Не удалось отправить результат</h1>
            <p className="mx-auto mt-3 max-w-xs text-sm font-semibold text-ink-soft">Проверьте интернет и попробуйте ещё раз — ответы не потеряны.</p>
            <div className="mt-6 flex flex-col gap-3">
              <Button onClick={() => { setStage('submitting'); submitNow(result.spentSec) }}>Отправить ещё раз</Button>
              <Link to="/" className="block"><Button variant="outline" className="w-full">На главную</Button></Link>
            </div>
          </Card>
        </div>
      )
    }
    const pct = result.total ? Math.round((result.correct / result.total) * 100) : 0
    const win = pct >= 80
    return (
      <div className="mx-auto min-h-dvh max-w-lg px-4 pb-14 pt-10">
        <div className="relative">
          <Confetti fire={win} />
          <Card className="animate-pop p-8 text-center">
            <p className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">Пробный ЕНТ завершён</p>
            <div className="mt-6 flex justify-center">
              <Ring value={pct} size={172} stroke={14}>
                <div>
                  <p className="font-display text-5xl font-bold text-plum"><CountUp value={pct} suffix="%" /></p>
                  <p className="mt-1 text-xs font-bold text-ink-soft">{result.correct} из {result.total}</p>
                </div>
              </Ring>
            </div>
            <p className="mt-5 text-sm font-bold text-ink-soft">время {fmtTime(result.spentSec)}</p>
          </Card>
        </div>

        <h2 className="mb-3 mt-8 font-display text-lg font-bold">Разбор ответов</h2>
        <div className="space-y-2.5">
          {questions.map((q) => {
            const rv = result.reviewByQ[q.id] ?? {}
            const sel = rv.selected_index ?? null
            const ci = rv.correct_index
            const right = rv.is_correct
            return (
              <details key={q.id} className="group rounded-2xl border-2 border-line bg-surface open:border-plum">
                <summary className="flex cursor-pointer list-none items-start gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <span className={[
                    'mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-lg font-display text-xs font-bold',
                    right ? 'bg-ok-tint text-ok' : sel === null ? 'bg-line text-ink-soft' : 'bg-bad-tint text-bad',
                  ].join(' ')}>{sel === null ? '—' : LETTERS[sel]}</span>
                  <span className="min-w-0 flex-1 text-sm font-bold leading-snug line-clamp-2">{q.body}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                    className="mt-1 h-4 w-4 flex-none text-ink-soft transition group-open:rotate-180" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                </summary>
                <div className="border-t-2 border-line px-4 pb-4 pt-3">
                  <div className="space-y-1.5">
                    {q.options.map((opt, i) => {
                      const isCorrect = i === ci
                      const isPicked = i === sel
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
                  {sel === null && <p className="mt-2.5 text-xs font-semibold text-ink-soft">Вопрос был пропущен.</p>}
                  {rv.explanation && <p className="mt-3 text-sm font-semibold text-ink-soft">{rv.explanation}</p>}
                </div>
              </details>
            )
          })}
        </div>

        <div className="mt-7 flex flex-col gap-3">
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
      <header className="sticky top-0 z-10 -mx-4 mb-6 bg-paper/85 px-4 pb-3.5 pt-4 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between gap-3">
          {exitAsk ? (
            <Button variant="danger" onClick={exitNow} className="px-3 py-1.5 text-xs">Выйти? Результат пропадёт</Button>
          ) : (
            <button onClick={askExit} className="text-sm font-bold text-ink-soft transition hover:text-plum">← Выйти</button>
          )}
          <span role="timer" aria-label="Оставшееся время"
            className={[
              'rounded-full px-3.5 py-1 font-display text-sm font-bold tabular-nums',
              lowTime ? 'animate-pulse-soft bg-bad-tint text-bad' : 'bg-white text-ink',
            ].join(' ')}
            style={{ boxShadow: '0 2px 0 0 var(--color-line)' }}>{fmtTime(remaining)}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-plum transition-all duration-500" style={{ width: `${(idx / questions.length) * 100}%` }} />
          </div>
          <span className="font-display text-xs font-bold text-ink-soft"><b className="text-plum">{idx + 1}</b>/{questions.length}</span>
        </div>
      </header>

      <h1 key={q.id} className="mb-6 animate-rise font-display text-[1.6rem] font-bold leading-snug">{q.body}</h1>

      <div className="space-y-3" role="group" aria-label="Варианты ответа">
        {q.options.map((opt, i) => {
          const isPicked = sel === i
          return (
            <button key={`${q.id}-${i}`} onClick={() => pick(i)} aria-pressed={isPicked}
              style={{ animationDelay: `${50 + i * 45}ms`, boxShadow: isPicked ? 'none' : '0 3px 0 0 var(--color-line)' }}
              className={[
                'flex w-full animate-rise items-center gap-3.5 rounded-2xl border-2 bg-surface p-4 text-left transition active:translate-y-0.5',
                isPicked ? 'border-plum bg-plum-tint' : 'border-line hover:border-plum',
              ].join(' ')}>
              <span className={[
                'grid h-11 w-11 flex-none place-items-center rounded-xl font-display text-base font-bold transition',
                isPicked ? 'bg-plum text-white' : 'bg-plum-tint text-plum',
              ].join(' ')}>{LETTERS[i]}</span>
              <span className="min-w-0 flex-1 font-bold leading-snug">{opt}</span>
            </button>
          )
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t-2 border-line bg-paper/95 px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg gap-2.5">
          <Button variant="ghost" onClick={next} className="flex-none">Пропустить</Button>
          <Button onClick={next} disabled={sel === null} className="flex-1">
            {idx + 1 >= questions.length ? 'Завершить' : 'Далее'}
          </Button>
        </div>
      </div>
    </div>
  )
}
