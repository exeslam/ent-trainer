import { Link } from 'react-router-dom'
import { Brand, Card } from '../components/ui'

export default function Soon({ title }) {
  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-12 pt-5">
      <header className="mb-8 flex items-center justify-between">
        <Brand />
        <Link to="/" className="text-sm font-medium text-plum underline underline-offset-2">
          На главную
        </Link>
      </header>

      <Card className="p-8 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm text-ink-soft">
          Этот раздел в разработке — добавим на следующем шаге.
        </p>
      </Card>
    </div>
  )
}
