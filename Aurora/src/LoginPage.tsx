import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import { AuroraBrand, GoogleMark, InputField } from './components/AuthComponents'
import './Auth.css'

function LoginPage() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await signIn(email, password)
      navigate('/', { replace: true })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to log in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-heading">
        <header className="auth-card__header">
          <AuroraBrand />
          <h1 id="login-heading">Welcome Back!</h1>
          <p>Log in to continue learning.</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <InputField
            id="email"
            label="Email Address"
            type="email"
            placeholder="Enter your email (e.g., alex@university.edu)"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={isSubmitting}
          />
          <div className="password-field">
            <InputField
              id="password"
              label="Password"
              type={isPasswordVisible ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={isSubmitting}
              action={
                <button
                  className="password-toggle"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                  aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                  aria-pressed={isPasswordVisible}
                >
                  {isPasswordVisible ? 'Hide' : 'Show'}
                </button>
              }
            />
            {/* TODO: password reset */}
            <a className="text-link forgot-link" href="#forgot-password">
              Forgot password?
            </a>
          </div>

          {error && (
            <p className="auth-message auth-message--error" role="alert">
              {error}
            </p>
          )}

          <button className="button button--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <div className="divider" aria-hidden="true">
          <span>or sign in with</span>
        </div>

        {/* TODO: Google OAuth */}
        <button className="button button--google" type="button">
          <GoogleMark />
          <span>Sign in with Google</span>
        </button>

        <p className="auth-prompt">
          New to Aurora?{' '}
          <Link className="text-link" to="/signup">
            Sign up
          </Link>
        </p>
      </section>
    </main>
  )
}

export default LoginPage
