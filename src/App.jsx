import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { RequireAuth, RequireTeacher } from './components/RequireAuth'
import { Spinner } from './components/ui'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Practice from './pages/Practice'
import Exam from './pages/Exam'
import Cabinet from './pages/Cabinet'
import AdminQuestions from './pages/admin/Questions'
import AdminStats from './pages/admin/Stats'

/* Главная: гостям — лендинг, вошедшим — кабинет */
function Home() {
  const { session, loading } = useAuth()
  if (loading) {
    return <div className="grid min-h-dvh place-items-center"><Spinner className="h-8 w-8" /></div>
  }
  return session ? <Dashboard /> : <Landing />
}

export default function App() {
  const { recovery } = useAuth()
  // Пришёл по ссылке «сброс пароля» — показываем экран нового пароля поверх всего
  if (recovery) return <ResetPassword />
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth" element={<Auth />} />

      <Route element={<RequireAuth />}>
        <Route path="/practice" element={<Practice />} />
        <Route path="/exam" element={<Exam />} />
        <Route path="/cabinet" element={<Cabinet />} />

        <Route element={<RequireTeacher />}>
          <Route path="/admin" element={<Navigate to="/admin/questions" replace />} />
          <Route path="/admin/questions" element={<AdminQuestions />} />
          <Route path="/admin/stats" element={<AdminStats />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
