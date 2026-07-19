import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { hasSupabase } from '../lib/supabase'
import { Brand, Button, Card, Field } from '../components/ui'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const isSignup = mode === 'signup'

  async function onSubmit(e) {
    e.preventDefault()
    setError(''); setNotice(''); setBusy(true)
    try {
      if (isSignup) {
        const { data, error } = await signUp(email.trim(), password, fullName.trim())
        if (error) throw error
        if (data.session) navigate('/', { replace: true })
        else setNotice('Аккаунт создан. Если потребуется — подтвердите почту и войдите.')
      } else {
        const { error } = await signIn(email.trim(), password)
        if (error) throw error
        navigate('/', { replace: true })
      }
    } catch (err) {
      setError(translateError(err?.message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Brand className="text-2xl" />
          <p className="mt-2 text-sm text-ink-soft">
            Подготовка к математической грамотности ЕНТ
          </p>
        </div>

        <Card className="p-6">
          <h1 className="mb-1 font-display text-xl font-semibold">
            {isSignup ? 'Регистрация' : 'Вход'}
          </h1>
          <p className="mb-5 text-sm text-ink-soft">
            {isSignup ? 'Создайте аккаунт ученика' : 'Войдите в свой аккаунт'}
          </p>

          {!hasSupabase && (
            <p className="mb-4 rounded-lg bg-plum-tint px-3 py-2 text-sm text-plum-dark">
              База ещё не подключена: заполните <code>.env.local</code> ключами Supabase.
            </p>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {isSignup && (
              <Field
                label="Имя и фамилия" type="text" required
                value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="Айгерим Сатпаева" autoComplete="name"
              />
            )}
            <Field
              label="Почта" type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" autoComplete="email"
            />
            <Field
              label="Пароль" type="password" required minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="минимум 6 символов"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />

            {error && <p className="text-sm text-plum-dark">{error}</p>}
            {notice && <p className="text-sm text-plum">{notice}</p>}

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Секунду…' : isSignup ? 'Создать аккаунт' : 'Войти'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-soft">
            {isSignup ? 'Уже есть аккаунт?' : 'Ещё нет аккаунта?'}{' '}
            <button
              type="button"
              onClick={() => { setMode(isSignup ? 'signin' : 'signup'); setError(''); setNotice('') }}
              className="font-medium text-plum underline underline-offset-2"
            >
              {isSignup ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </p>
        </Card>
      </div>
    </div>
  )
}

function translateError(msg = '') {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'Неверная почта или пароль.'
  if (m.includes('already registered')) return 'Эта почта уже зарегистрирована.'
  if (m.includes('password')) return 'Пароль слишком короткий (минимум 6 символов).'
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Нет связи с базой. Проверьте подключение Supabase.'
  return msg || 'Что-то пошло не так. Попробуйте ещё раз.'
}
