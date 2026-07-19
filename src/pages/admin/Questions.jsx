import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Button, Card, Spinner } from '../../components/ui'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const EMPTY = { body: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' }

export default function AdminQuestions() {
  const { user } = useAuth()
  const [list, setList] = useState(null)          // null = загрузка
  const [view, setView] = useState('list')        // 'list' | 'form'
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState(null) // двухтапное удаление
  const confirmTimer = useRef(null)

  async function refresh() {
    const { data } = await supabase
      .from('questions')
      .select('id, body, options, correct_index, explanation, is_active, created_at')
      .order('created_at', { ascending: false })
    setList(data ?? [])
  }
  useEffect(() => { refresh() }, [])

  /* ---------- форма ---------- */
  function openNew() {
    setForm(EMPTY); setEditingId(null); setFormError(''); setView('form')
  }
  function openEdit(q) {
    setForm({
      body: q.body,
      options: [...q.options],
      correctIndex: q.correct_index,
      explanation: q.explanation ?? '',
    })
    setEditingId(q.id); setFormError(''); setView('form')
  }
  function setOption(i, v) {
    setForm((f) => ({ ...f, options: f.options.map((o, j) => (j === i ? v : o)) }))
  }
  function addOption() {
    setForm((f) => (f.options.length >= 6 ? f : { ...f, options: [...f.options, ''] }))
  }
  function removeOption(i) {
    setForm((f) => {
      if (f.options.length <= 2) return f
      const options = f.options.filter((_, j) => j !== i)
      let correctIndex = f.correctIndex
      if (i === f.correctIndex) correctIndex = 0
      else if (i < f.correctIndex) correctIndex -= 1
      return { ...f, options, correctIndex }
    })
  }

  async function save() {
    const body = form.body.trim()
    const options = form.options.map((o) => o.trim())
    if (!body) return setFormError('Введите текст вопроса.')
    if (options.some((o) => !o)) return setFormError('Заполните все варианты ответа или удалите лишние (крестик справа).')
    if (options.length < 2) return setFormError('Нужно минимум два варианта ответа.')
    if (!options[form.correctIndex]) return setFormError('Отметьте правильный вариант — нажмите на букву слева.')

    setSaving(true); setFormError('')
    const payload = {
      body,
      options,
      correct_index: form.correctIndex,
      explanation: form.explanation.trim() || null,
    }
    const q = editingId
      ? supabase.from('questions').update(payload).eq('id', editingId)
      : supabase.from('questions').insert({ ...payload, created_by: user.id })
    const { error } = await q
    setSaving(false)
    if (error) { setFormError('Не удалось сохранить. Проверьте интернет и попробуйте ещё раз.'); return }
    setView('list')
    refresh()
  }

  /* ---------- действия в списке ---------- */
  async function toggleActive(q) {
    await supabase.from('questions').update({ is_active: !q.is_active }).eq('id', q.id)
    refresh()
  }
  function askDelete(id) {
    clearTimeout(confirmTimer.current)
    setConfirmId(id)
    confirmTimer.current = setTimeout(() => setConfirmId(null), 4000)
  }
  async function doDelete(id) {
    clearTimeout(confirmTimer.current)
    setConfirmId(null)
    await supabase.from('questions').delete().eq('id', id)
    refresh()
  }

  if (list === null) {
    return <div className="grid min-h-dvh place-items-center"><Spinner className="h-8 w-8" /></div>
  }

  /* ================= ФОРМА ================= */
  if (view === 'form') {
    return (
      <div className="mx-auto min-h-dvh max-w-lg px-4 pb-16 pt-5">
        <header className="mb-6 flex items-center justify-between">
          <button onClick={() => setView('list')} className="text-sm font-medium text-ink-soft transition hover:text-plum">
            ← К списку
          </button>
        </header>

        <h1 className="mb-5 font-display text-2xl font-semibold tracking-tight">
          {editingId ? 'Изменить вопрос' : 'Новый вопрос'}
        </h1>

        <div className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-soft">Текст вопроса</span>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={4}
              placeholder="Например: Проезд стоит 120 тенге. Сколько заплатят 3 человека?"
              className="w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 text-ink outline-none transition focus:border-plum placeholder:text-ink-soft/60"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-sm text-ink-soft">
              Варианты ответа — нажмите на букву, чтобы отметить правильный
            </span>
            <div className="space-y-2.5">
              {form.options.map((opt, i) => {
                const isCorrect = i === form.correctIndex
                return (
                  <div key={i} className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, correctIndex: i }))}
                      aria-pressed={isCorrect}
                      aria-label={`Отметить вариант ${LETTERS[i]} правильным`}
                      className={[
                        'grid h-12 w-12 flex-none place-items-center rounded-xl border-2 font-mono text-sm font-semibold transition',
                        isCorrect
                          ? 'border-ok bg-ok text-white'
                          : 'border-line bg-surface text-ink-soft hover:border-ok hover:text-ok',
                      ].join(' ')}
                    >
                      {LETTERS[i]}
                    </button>
                    <input
                      value={opt}
                      onChange={(e) => setOption(i, e.target.value)}
                      placeholder={`Вариант ${LETTERS[i]}`}
                      className="h-12 w-full min-w-0 rounded-xl border border-line bg-surface px-4 text-ink outline-none transition focus:border-plum placeholder:text-ink-soft/60"
                    />
                    {form.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        aria-label={`Удалить вариант ${LETTERS[i]}`}
                        className="grid h-12 w-10 flex-none place-items-center rounded-xl text-ink-soft transition hover:bg-bad-tint hover:text-bad"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            {form.options.length < 6 && (
              <button type="button" onClick={addOption}
                className="mt-2.5 text-sm font-medium text-plum underline underline-offset-2">
                + Добавить вариант
              </button>
            )}
            <p className="mt-2 text-xs text-ink-soft">
              Правильный сейчас: <b className="text-ok">{LETTERS[form.correctIndex]}</b>
            </p>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-soft">Пояснение к ответу (необязательно)</span>
            <textarea
              value={form.explanation}
              onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
              rows={2}
              placeholder="Ученик увидит его после ответа. Например: 120 × 3 × 2 = 720 ₸"
              className="w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 text-ink outline-none transition focus:border-plum placeholder:text-ink-soft/60"
            />
          </label>

          {formError && (
            <p className="rounded-xl bg-bad-tint px-4 py-3 text-sm font-medium text-bad">{formError}</p>
          )}

          <div className="flex flex-col gap-2.5">
            <Button onClick={save} disabled={saving}>
              {saving ? 'Сохраняю…' : editingId ? 'Сохранить изменения' : 'Добавить вопрос'}
            </Button>
            <Button variant="outline" onClick={() => setView('list')}>Отмена</Button>
          </div>
        </div>
      </div>
    )
  }

  /* ================= СПИСОК ================= */
  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-16 pt-5">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="text-sm font-medium text-ink-soft transition hover:text-plum">← На главную</Link>
        <Link to="/admin/stats" className="text-sm font-medium text-plum underline underline-offset-2">Статистика</Link>
      </header>

      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Задания</h1>
        <span className="font-mono text-sm text-ink-soft">{list.length}</span>
      </div>

      <Button onClick={openNew} className="mb-5 w-full">+ Новый вопрос</Button>

      {list.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-ink-soft">Вопросов пока нет — добавьте первый.</p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {list.map((q) => (
            <Card key={q.id} className={`p-4 ${q.is_active ? '' : 'opacity-70'}`}>
              <div className="flex items-start gap-3">
                <p className="min-w-0 flex-1 text-sm font-medium leading-snug line-clamp-2">{q.body}</p>
                {!q.is_active && (
                  <span className="flex-none rounded-full bg-line px-2.5 py-0.5 text-xs font-medium text-ink-soft">
                    скрыт
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-ink-soft">
                Правильный: <b className="text-ok">{LETTERS[q.correct_index]}</b> · {q.options[q.correct_index]}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={() => openEdit(q)}
                  className="rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium transition hover:border-plum">
                  Изменить
                </button>
                <button onClick={() => toggleActive(q)}
                  className="rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium transition hover:border-plum">
                  {q.is_active ? 'Скрыть от учеников' : 'Показать ученикам'}
                </button>
                {confirmId === q.id ? (
                  <button onClick={() => doDelete(q.id)}
                    className="rounded-lg bg-bad px-3.5 py-2 text-sm font-semibold text-white">
                    Точно удалить?
                  </button>
                ) : (
                  <button onClick={() => askDelete(q.id)}
                    className="rounded-lg px-3.5 py-2 text-sm font-medium text-bad transition hover:bg-bad-tint">
                    Удалить
                  </button>
                )}
              </div>
              {confirmId === q.id && (
                <p className="mt-2 text-xs text-bad">
                  Вопрос и все ответы учеников на него удалятся навсегда. Если хотите просто убрать его из тренировок — лучше «Скрыть».
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
