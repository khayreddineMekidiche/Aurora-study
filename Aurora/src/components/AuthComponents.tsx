import type { ReactNode } from 'react'

type InputFieldProps = {
  id: string
  label: string
  type: 'email' | 'password' | 'text'
  placeholder: string
  autoComplete: string
  action?: ReactNode
}

export function InputField({
  id,
  label,
  type,
  placeholder,
  autoComplete,
  action,
}: InputFieldProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        <input
          id={id}
          name={id}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        {action}
      </div>
    </div>
  )
}

export function AuroraBrand() {
  return (
    <div className="brand">
      <svg
        className="brand__mark"
        viewBox="0 0 42 42"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="aurora-mark" x1="4" y1="38" x2="36" y2="3">
            <stop stopColor="#38B2AC" />
            <stop offset="1" stopColor="#3182CE" />
          </linearGradient>
        </defs>
        <path
          fill="url(#aurora-mark)"
          d="M21 3 2 39h9l4-8h13l4 8h9L21 3Zm0 14 4 8h-8l4-8Z"
        />
      </svg>
      <span className="brand__copy">
        <span className="brand__name">Aurora AI</span>
        <span className="brand__tagline">AI-powered study helper</span>
      </span>
    </div>
  )
}

export function GoogleMark() {
  return (
    <svg
      className="google-mark"
      viewBox="0 0 18 18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.27h2.92c1.71-1.58 2.68-3.9 2.68-6.63Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.92-2.27c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71a5.4 5.4 0 0 1 0-3.42V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.62 8.62 0 0 0 9 0a9 9 0 0 0-8.04 4.95l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}
