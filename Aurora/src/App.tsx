import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute } from './auth/ProtectedRoute'
import HomePage from './HomePage'
import LoginPage from './LoginPage'
import { ForgotPasswordPage, SetNewPasswordPage } from './PasswordResetPage'
import SignupPage from './SignupPage'

function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
      </Route>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<SetNewPasswordPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
