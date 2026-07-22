import { Component } from 'react'

// Ловит любую ошибку рендера/логики и показывает дружелюбный экран
// вместо белой страницы. Кнопка перезагружает приложение.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // на будущее сюда можно повесить отправку в Sentry и т.п.
    console.error('Поймана ошибка приложения:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    const base = import.meta.env.BASE_URL || '/'
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="w-full max-w-sm rounded-3xl border-2 border-line bg-surface p-8 text-center"
          style={{ boxShadow: '0 6px 0 0 var(--color-line)' }}>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-bad-tint">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-bad)" strokeWidth="2.4" strokeLinecap="round"
              className="h-7 w-7" aria-hidden="true"><path d="M12 8v5M12 17h.01" /><circle cx="12" cy="12" r="9" /></svg>
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-ink">Что-то пошло не так</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm font-semibold text-ink-soft">
            Приложение споткнулось. Прогресс сохранён — просто перезагрузите страницу.
          </p>
          <button
            onClick={() => { window.location.href = base }}
            className="btn3d mt-6 w-full rounded-2xl bg-plum px-5 py-3.5 font-display text-[15px] font-bold text-white"
            style={{ '--sh': 'var(--color-plum-dark)' }}
          >
            Перезагрузить
          </button>
        </div>
      </div>
    )
  }
}
