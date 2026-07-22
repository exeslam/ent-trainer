import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Brand, Button, Card, Field, MathShapes } from '../components/ui'

export default function ResetPassword() {
  const { updatePassword, clearRecovery } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('Пароль слишком короткий (минимум 6 символов).')
    if (password !== confirm) return setError('Пароли не совпадают.')
    setBusy(true)
    const { error } = await updatePassword(password)
    setBusy(false)
    if (error) { setError('Не удалось сменить пароль. Ссылка могла устареть — запросите новую.'); return }
    clearRecovery()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-dvh pb-12">
      <div className="relative overflow-hidden rounded-b-[2.5rem] bg-plum px-4 pb-24 pt-14 text-center text-white" style={{ boxShadow: '0 6px 0 0 var(--color-plum-dark)' }}>
        <MathShapes />
        <div className="relative animate-pop"><Brand tone="dark" className="text-2xl" /></div>
      </div>

      <div className="px-4">
        <Card className="mx-auto -mt-14 w-full max-w-sm animate-rise p-6" style={{ boxShadow: '0 6px 0 0 var(--color-line)' }}>
          <h1 className="font-display text-xl font-bold">Новый пароль</h1>
          <p className="mb-5 mt-0.5 text-sm font-semibold text-ink-soft">Придумайте новый пароль для входа.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Новый пароль" type="password" required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="минимум 6 символов" autoComplete="new-password" />
            <Field label="Повторите пароль" type="password" required minLength={6} value={confirm}
              onChange={(e) => setConfirm(e.target.value)} placeholder="ещё раз" autoComplete="new-password" />

            {error && <p className="text-sm font-bold text-bad">{error}</p>}

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Секунду…' : 'Сохранить пароль'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
