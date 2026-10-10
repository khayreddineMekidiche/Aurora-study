import { useState, type FormEvent } from 'react'
import { AuroraBrand, GoogleMark, InputField } from './components/AuthComponents'
import './Auth.css'

function SignupPage() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // TODO: implement account creation
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
          />
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
              autoComplete="new-password"
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
          </div>
          <button className="button button--primary" type="submit">
            Sign Up
          </button>
        </form>

        <div className="divider" aria-hidden="true">
          <span>or sign up with</span>
        </div>

        <button className="button button--google" type="button">
          <GoogleMark />
          <span>Sign up with Google</span>
        </button>

        <p className="auth-prompt">
          Already have an account?{' '}
          <a className="text-link" href="#login">
            Log in
          </a>
        </p>
      </section>
    </main>
  )
}

export default SignupPage
