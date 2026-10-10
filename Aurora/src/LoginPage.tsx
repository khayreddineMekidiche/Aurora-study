import { useState, type FormEvent } from 'react'
import { AuroraBrand, GoogleMark, InputField } from './components/AuthComponents'
import './Auth.css'

function LoginPage() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // TODO: implement authentication
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
          />
          <div className="password-field">
            <InputField
              id="password"
              label="Password"
              type={isPasswordVisible ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              action={
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                  aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                  aria-pressed={isPasswordVisible}
                >
                  {isPasswordVisible ? 'Hide' : 'Show'}
                </button>
              }
            />
            <a className="text-link forgot-link" href="#forgot-password">
              Forgot password?
            </a>
          </div>

          <button className="button button--primary" type="submit">
            Log in
          </button>
        </form>

        <div className="divider" aria-hidden="true">
          <span>or sign in with</span>
        </div>

        <button className="button button--google" type="button">
          <GoogleMark />
          <span>Sign in with Google</span>
        </button>

        <p className="auth-prompt">
          New to Aurora?{' '}
          <a className="text-link" href="#signup">
            Sign up
          </a>
        </p>
      </section>
    </main>
  )
}

export default LoginPage
