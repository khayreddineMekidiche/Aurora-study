import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import { AuroraBrand, GoogleMark, InputField } from './components/AuthComponents'
import './Auth.css'

function SignupPage() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    const trimmedFullName = fullName.trim()

    if (!trimmedFullName) {
      setError('Enter your full name.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await signUp(email, password, trimmedFullName)

      if (result.needsEmailConfirmation) {
        setSuccessMessage('Check your email to confirm your account')
      } else {
        navigate('/', { replace: true })
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to sign up.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card auth-card--signup" aria-labelledby="signup-heading">
        <header className="auth-card__header">
          <AuroraBrand />
          <h1 id="signup-heading">Create Your Account</h1>
          <p>Sign up to start learning.</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <InputField
            id="full-name"
            label="Full Name"
            type="text"
            placeholder="Enter your full name"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            disabled={isSubmitting}
          />
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
              autoComplete="new-password"
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
          </div>
          {error && (
            <p className="auth-message auth-message--error" role="alert">
              {error}
            </p>
          )}
          {successMessage && (
            <p className="auth-message auth-message--success" role="status">
              {successMessage}
            </p>
          )}
          <button className="button button--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>

        <div className="divider" aria-hidden="true">
          <span>or sign up with</span>
        </div>

        {/* TODO: Google OAuth */}
        <button className="button button--google" type="button">
          <GoogleMark />
          <span>Sign up with Google</span>
        </button>

        <p className="auth-prompt">
          Already have an account?{' '}
          <Link className="text-link" to="/login">
            Log in
          </Link>
        </p>
      </section>
    </main>
  )
}

export default SignupPage
