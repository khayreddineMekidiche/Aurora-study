import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuroraBrand, InputField } from './components/AuthComponents'
import { supabase } from './lib/supabase'
import './Auth.css'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess(false)
    setIsSubmitting(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetError) throw resetError
      setSuccess(true)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to send a reset email.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="forgot-heading">
        <header className="auth-card__header">
          <AuroraBrand />
          <h1 id="forgot-heading">Reset your password</h1>
          <p>We’ll email you a link to choose a new password.</p>
        </header>
        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
          <InputField
            id="email"
            label="Email Address"
            type="email"
            placeholder="Enter your account email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={isSubmitting}
          />
          {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
          {success && <p className="auth-message auth-message--success" role="status">If an account exists for that email, a password reset link is on its way.</p>}
          <button className="button button--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending link...' : 'Send reset link'}
          </button>
        </form>
        <p className="auth-prompt"><Link className="text-link" to="/login">Back to log in</Link></p>
      </section>
    </main>
  )
}

function SetNewPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setSuccess(true)
      window.setTimeout(() => navigate('/', { replace: true }), 1200)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update your password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="new-password-heading">
        <header className="auth-card__header">
          <AuroraBrand />
          <h1 id="new-password-heading">Choose a new password</h1>
          <p>Enter a new password for your Aurora account.</p>
        </header>
        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
          <InputField
            id="new-password"
            label="New Password"
            type="password"
            placeholder="At least 6 characters"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={isSubmitting || success}
          />
          <InputField
            id="confirm-password"
            label="Confirm Password"
            type="password"
            placeholder="Enter your new password again"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            disabled={isSubmitting || success}
          />
          {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
          {success && <p className="auth-message auth-message--success" role="status">Password updated. Taking you to your workspace...</p>}
          <button className="button button--primary" type="submit" disabled={isSubmitting || success}>
            {isSubmitting ? 'Updating password...' : 'Update password'}
          </button>
        </form>
        {!success && <p className="auth-prompt"><Link className="text-link" to="/login">Back to log in</Link></p>}
      </section>
    </main>
  )
}

export { ForgotPasswordPage, SetNewPasswordPage }
