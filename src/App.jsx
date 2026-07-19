import { Routes, Route, Navigate } from 'react-router-dom'
import { RequireAuth, RequireTeacher } from './components/RequireAuth'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Practice from './pages/Practice'
import Exam from './pages/Exam'
import Cabinet from './pages/Cabinet'
import AdminQuestions from './pages/admin/Questions'
import AdminStats from './pages/admin/Stats'

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />

      <Route element={<RequireAuth />}>
        <Route path="/" element={<Dashboard />} />
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
