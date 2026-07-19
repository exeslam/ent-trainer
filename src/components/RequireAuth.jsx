import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './ui'

function FullScreenSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

export function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenSpinner />
  if (!session) return <Navigate to="/auth" replace />
  return <Outlet />
}

export function RequireTeacher() {
  const { session, profile, loading } = useAuth()
  if (loading || (session && !profile)) return <FullScreenSpinner />
  if (!session) return <Navigate to="/auth" replace />
  if (profile?.role !== 'teacher') return <Navigate to="/" replace />
  return <Outlet />
}
