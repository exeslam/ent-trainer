import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { hasSupabase } from '../lib/supabase'
import { Brand, Button, Card, Field, MathShapes } from '../components/ui'

export default function Auth() {
  const { signIn, signUp, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [mode, setMode] = useState(params.get('mode') === 'signup' ? 'signup' : 'signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const isSignup = mode === 'signup'
  const isForgot = mode === 'forgot'

  function switchMode(m) { setMode(m); setError(''); setNotice('') }

  async function onSubmit(e) {
    e.preventDefault()
    setError(''); setNotice(''); setBusy(true)
    try {
      if (isForgot) {
        const { error } = await resetPassword(email.trim())
        if (error) throw error
        setNotice('Ссылка для сброса пароля отправлена на почту. Проверьте входящие и «Спам».')
      } else if (isSignup) {
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

  const title = isForgot ? 'Восстановление' : isSignup ? 'Регистрация' : 'Вход'
  const subtitle = isForgot ? 'Пришлём ссылку для сброса пароля' : isSignup ? 'Создай аккаунт ученика' : 'Войди в свой аккаунт'
  const submitLabel = isForgot ? 'Отправить ссылку' : isSignup ? 'Создать аккаунт' : 'Войти'

  return (
    <div className="min-h-dvh pb-12">
      <div className="relative overflow-hidden rounded-b-[2.5rem] bg-plum px-4 pb-24 pt-14 text-center text-white" style={{ boxShadow: '0 6px 0 0 var(--color-plum-dark)' }}>
        <MathShapes />
        <div className="relative animate-pop">
          <Brand tone="dark" className="text-2xl" />
          <p className="mx-auto mt-3 max-w-60 text-sm font-semibold leading-relaxed text-white/85">
            Подготовка к ЕНТ: тренировки и пробные экзамены
          </p>
        </div>
      </div>

      <div className="px-4">
        <Card className="mx-auto -mt-14 w-full max-w-sm animate-rise p-6" style={{ boxShadow: '0 6px 0 0 var(--color-line)' }}>
          <h1 className="font-display text-xl font-bold">{title}</h1>
          <p className="mb-5 mt-0.5 text-sm font-semibold text-ink-soft">{subtitle}</p>

          {!hasSupabase && (
            <p className="mb-4 rounded-xl bg-plum-tint px-3 py-2 text-sm font-semibold text-plum-dark">
              База ещё не подключена: заполните <code>.env.local</code> ключами Supabase.
            </p>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {isSignup && (
              <Field label="Имя и фамилия" type="text" required value={fullName}
                onChange={(e) => setFullName(e.target.value)} placeholder="Айгерим Сатпаева" autoComplete="name" />
            )}
            <Field label="Почта" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            {!isForgot && (
              <Field label="Пароль" type="password" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="минимум 6 символов"
                autoComplete={isSignup ? 'new-password' : 'current-password'} />
            )}

            {error && <p className="text-sm font-bold text-bad">{error}</p>}
            {notice && <p className="text-sm font-bold text-plum">{notice}</p>}

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Секунду…' : submitLabel}
            </Button>
          </form>

          {mode === 'signin' && (
            <p className="mt-3 text-center">
              <button type="button" onClick={() => switchMode('forgot')}
                className="text-sm font-bold text-ink-soft underline underline-offset-2 hover:text-plum">
                Забыли пароль?
              </button>
            </p>
          )}

          <p className="mt-5 text-center text-sm font-semibold text-ink-soft">
            {isForgot ? (
              <>Вспомнили? <button type="button" onClick={() => switchMode('signin')} className="font-bold text-plum underline underline-offset-2">Войти</button></>
            ) : isSignup ? (
              <>Уже есть аккаунт? <button type="button" onClick={() => switchMode('signin')} className="font-bold text-plum underline underline-offset-2">Войти</button></>
            ) : (
              <>Ещё нет аккаунта? <button type="button" onClick={() => switchMode('signup')} className="font-bold text-plum underline underline-offset-2">Зарегистрироваться</button></>
            )}
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
  if (m.includes('rate limit') || m.includes('too many')) return 'Слишком много попыток. Подождите немного и попробуйте снова.'
  if (m.includes('is invalid') || m.includes('invalid email')) return 'Похоже, почта указана неверно. Проверьте адрес.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Нет связи с базой. Проверьте интернет.'
  return msg || 'Что-то пошло не так. Попробуйте ещё раз.'
}
