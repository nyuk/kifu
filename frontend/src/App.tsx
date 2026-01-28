import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './routes/RequireAuth'
import { GuestOnly } from './routes/GuestOnly'
import { Shell } from './components/Shell'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Chart } from './pages/Chart'
import { Bubbles } from './pages/Bubbles'
import { Settings } from './pages/Settings'
import { NotFound } from './pages/NotFound'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chart" replace />} />
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route path="/chart" element={<Chart />} />
          <Route path="/chart/:symbol" element={<Chart />} />
          <Route path="/bubbles" element={<Bubbles />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
