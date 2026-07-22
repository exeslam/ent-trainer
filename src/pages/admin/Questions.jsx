import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button, Card, Spinner } from '../../components/ui'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const EMPTY = { body: '', options: ['', '', '', ''], correctIndex: 0, explanation: '', isActive: true }

export default function AdminQuestions() {
  const [list, setList] = useState(null)
  const [view, setView] = useState('list')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const confirmTimer = useRef(null)

  async function refresh() {
    // Правильный ответ живёт в answer_keys (ученикам недоступно, админу — да).
    const { data } = await supabase
      .from('questions')
      .select('id, body, options, is_active, created_at, answer_keys(correct_index, explanation)')
      .order('created_at', { ascending: false })
    const rows = (data ?? []).map((q) => {
      const ak = Array.isArray(q.answer_keys) ? q.answer_keys[0] : q.answer_keys
      return { ...q, correct_index: ak?.correct_index ?? 0, explanation: ak?.explanation ?? null }
    })
    setList(rows)
  }
  useEffect(() => { refresh() }, [])

  function openNew() { setForm(EMPTY); setEditingId(null); setFormError(''); setView('form') }
  function openEdit(q) {
    setForm({ body: q.body, options: [...q.options], correctIndex: q.correct_index, explanation: q.explanation ?? '', isActive: q.is_active })
    setEditingId(q.id); setFormError(''); setView('form')
  }
  function setOption(i, v) { setForm((f) => ({ ...f, options: f.options.map((o, j) => (j === i ? v : o)) })) }
  function addOption() { setForm((f) => (f.options.length >= 6 ? f : { ...f, options: [...f.options, ''] })) }
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
    if (options.some((o) => !o)) return setFormError('Заполните все варианты или удалите лишние (крестик справа).')
    if (options.length < 2) return setFormError('Нужно минимум два варианта ответа.')
    if (!options[form.correctIndex]) return setFormError('Отметьте правильный вариант — нажмите на букву слева.')

    setSaving(true); setFormError('')
    // Пишем и вопрос, и ключ ответа одним RPC (атомарно, ответ не утекает клиенту).
    const { error } = await supabase.rpc('upsert_question', {
      p_id: editingId,
      p_body: body,
      p_options: options,
      p_correct_index: form.correctIndex,
      p_explanation: form.explanation.trim() || null,
      p_is_active: editingId ? form.isActive : true,
    })
    setSaving(false)
    if (error) { setFormError('Не удалось сохранить. Проверьте интернет и попробуйте ещё раз.'); return }
    setView('list'); refresh()
  }

  async function toggleActive(q) {
    await supabase.from('questions').update({ is_active: !q.is_active }).eq('id', q.id)
    refresh()
  }
  function askDelete(id) { clearTimeout(confirmTimer.current); setConfirmId(id); confirmTimer.current = setTimeout(() => setConfirmId(null), 4000) }
  async function doDelete(id) { clearTimeout(confirmTimer.current); setConfirmId(null); await supabase.from('questions').delete().eq('id', id); refresh() }

  if (list === null) {
    return <div className="grid min-h-dvh place-items-center"><Spinner className="h-8 w-8" /></div>
  }

  /* ================= ФОРМА ================= */
  if (view === 'form') {
    return (
      <div className="mx-auto min-h-dvh max-w-lg px-4 pb-16 pt-5">
        <header className="mb-6">
          <button onClick={() => setView('list')} className="text-sm font-bold text-ink-soft transition hover:text-plum">← К списку</button>
        </header>
        <h1 className="mb-5 font-display text-2xl font-bold">{editingId ? 'Изменить вопрос' : 'Новый вопрос'}</h1>

        <div className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-ink-soft">Текст вопроса</span>
            <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={4}
              placeholder="Например: Проезд стоит 120 тенге. Сколько заплатят 3 человека?"
              className="w-full resize-y rounded-2xl border-2 border-line bg-surface px-4 py-3 font-semibold text-ink outline-none transition focus:border-plum placeholder:text-ink-soft/50" />
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-bold text-ink-soft">Варианты — нажми на букву, чтобы отметить правильный</span>
            <div className="space-y-2.5">
              {form.options.map((opt, i) => {
                const isCorrect = i === form.correctIndex
                return (
                  <div key={i} className="flex items-center gap-2.5">
                    <button type="button" onClick={() => setForm((f) => ({ ...f, correctIndex: i }))} aria-pressed={isCorrect}
                      aria-label={`Отметить вариант ${LETTERS[i]} правильным`}
                      className={[
                        'grid h-12 w-12 flex-none place-items-center rounded-2xl border-2 font-display text-base font-bold transition',
                        isCorrect ? 'border-ok-bright bg-ok-bright text-white' : 'border-line bg-surface text-ink-soft hover:border-ok-bright hover:text-ok',
                      ].join(' ')}>{LETTERS[i]}</button>
                    <input value={opt} onChange={(e) => setOption(i, e.target.value)} placeholder={`Вариант ${LETTERS[i]}`}
                      className="h-12 w-full min-w-0 rounded-2xl border-2 border-line bg-surface px-4 font-semibold text-ink outline-none transition focus:border-plum placeholder:text-ink-soft/50" />
                    {form.options.length > 2 && (
                      <button type="button" onClick={() => removeOption(i)} aria-label={`Удалить вариант ${LETTERS[i]}`}
                        className="grid h-12 w-10 flex-none place-items-center rounded-2xl text-ink-soft transition hover:bg-bad-tint hover:text-bad">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            {form.options.length < 6 && (
              <button type="button" onClick={addOption} className="mt-2.5 text-sm font-bold text-plum underline underline-offset-2">+ Добавить вариант</button>
            )}
            <p className="mt-2 text-xs font-bold text-ink-soft">Правильный сейчас: <b className="text-ok">{LETTERS[form.correctIndex]}</b></p>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-ink-soft">Пояснение к ответу (необязательно)</span>
            <textarea value={form.explanation} onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))} rows={2}
              placeholder="Ученик увидит его после ответа. Например: 120 × 3 × 2 = 720 ₸"
              className="w-full resize-y rounded-2xl border-2 border-line bg-surface px-4 py-3 font-semibold text-ink outline-none transition focus:border-plum placeholder:text-ink-soft/50" />
          </label>

          {formError && <p className="rounded-2xl bg-bad-tint px-4 py-3 text-sm font-bold text-bad">{formError}</p>}

          <div className="flex flex-col gap-3">
            <Button variant="success" onClick={save} disabled={saving}>{saving ? 'Сохраняю…' : editingId ? 'Сохранить изменения' : 'Добавить вопрос'}</Button>
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
        <Link to="/" className="text-sm font-bold text-ink-soft transition hover:text-plum">← На главную</Link>
        <Link to="/admin/stats" className="font-display text-sm font-bold text-plum underline underline-offset-2">Статистика</Link>
      </header>

      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Задания</h1>
        <span className="rounded-full bg-plum-tint px-3 py-1 font-display text-sm font-bold text-plum">{list.length}</span>
      </div>

      <Button onClick={openNew} className="mb-5 w-full">+ Новый вопрос</Button>

      {list.length === 0 ? (
        <Card className="p-8 text-center"><p className="font-semibold text-ink-soft">Вопросов пока нет — добавьте первый.</p></Card>
      ) : (
        <div className="space-y-3">
          {list.map((q) => (
            <Card key={q.id} className={`p-4 ${q.is_active ? '' : 'opacity-70'}`}>
              <div className="flex items-start gap-3">
                <p className="min-w-0 flex-1 text-sm font-bold leading-snug line-clamp-2">{q.body}</p>
                {!q.is_active && <span className="flex-none rounded-full bg-line px-2.5 py-0.5 text-xs font-bold text-ink-soft">скрыт</span>}
              </div>
              <p className="mt-1.5 text-xs font-semibold text-ink-soft">Правильный: <b className="text-ok">{LETTERS[q.correct_index]}</b> · {q.options[q.correct_index]}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={() => openEdit(q)} className="rounded-xl border-2 border-line bg-surface px-3.5 py-2 text-sm font-bold transition hover:border-plum">Изменить</button>
                <button onClick={() => toggleActive(q)} className="rounded-xl border-2 border-line bg-surface px-3.5 py-2 text-sm font-bold transition hover:border-plum">
                  {q.is_active ? 'Скрыть' : 'Показать'}
                </button>
                {confirmId === q.id ? (
                  <button onClick={() => doDelete(q.id)} className="rounded-xl bg-bad px-3.5 py-2 text-sm font-bold text-white" style={{ boxShadow: '0 3px 0 0 var(--color-bad-dark)' }}>Точно удалить?</button>
                ) : (
                  <button onClick={() => askDelete(q.id)} className="rounded-xl px-3.5 py-2 text-sm font-bold text-bad transition hover:bg-bad-tint">Удалить</button>
                )}
              </div>
              {confirmId === q.id && (
                <p className="mt-2 text-xs font-semibold text-bad">Вопрос и все ответы учеников на него удалятся навсегда. Чтобы просто убрать из тренировок — лучше «Скрыть».</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
