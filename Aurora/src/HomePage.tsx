import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import { AuroraBrand } from './components/AuthComponents'
import './HomePage.css'

type Summary = {
  name: string
  kind: 'pdf' | 'document'
  summary: string
}

type Message = {
  author: 'you' | 'aurora'
  text: string
}

const summaries: Summary[] = [
  {
    name: 'Introduction to Biology.pdf',
    kind: 'pdf',
    summary:
      'An overview of cell structure, energy conversion, and the building blocks of living organisms.',
  },
  {
    name: 'Lecture notes — Week 4.docx',
    kind: 'document',
    summary:
      'Notes on photosynthesis, including the light-dependent reactions and the Calvin cycle.',
  },
]

const messages: Message[] = [
  {
    author: 'you',
    text: 'Can you explain how photosynthesis turns light into chemical energy?',
  },
  {
    author: 'aurora',
    text: 'Absolutely! Plants capture sunlight in their chloroplasts. During the light-dependent reactions, that energy is stored as ATP and NADPH. The Calvin cycle then uses those molecules to build sugars from carbon dioxide.',
  },
]

const quizQuestions = [
  {
    question: 'Which organelle is responsible for photosynthesis?',
    options: [
      'Mitochondrion',
      'Chloroplast',
      'Nucleus',
      'Ribosome',
    ],
  },
  {
    question: 'What is the main purpose of photosynthesis?',
    options: [
      'It converts light energy into chemical energy stored in sugars.',
      'It breaks down glucose to release stored energy.',
      'It absorbs oxygen and releases carbon dioxide.',
      'It moves water from the leaves to the roots.',
    ],
  },
  {
    question: 'Which gas do plants take in during photosynthesis?',
    options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
  },
  {
    question: 'Where do the light-dependent reactions take place?',
    options: [
      'In the thylakoid membranes',
      'In the nucleus',
      'In the cytoplasm',
      'In the cell wall',
    ],
  },
  {
    question: 'What sugar is produced during photosynthesis?',
    options: ['Glucose', 'Lactose', 'Fructose only', 'Sucrose only'],
  },
]
const currentQuizQuestion = quizQuestions[1]

function FileTypeIcon({ kind }: { kind: Summary['kind'] }) {
  return (
    <span className={`file-icon file-icon--${kind}`} aria-hidden="true">
      {kind === 'pdf' ? (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M6.75 2.75h7l4.5 4.5v14h-11.5z" />
          <path d="M13.75 2.75v5h4.5M8.75 14.25h7M8.75 17.25h5.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M6.75 2.75h7l4.5 4.5v14h-11.5z" />
          <path d="M13.75 2.75v5h4.5M8.75 12h7M8.75 15h7M8.75 18h5" />
        </svg>
      )}
    </span>
  )
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15.5V4.75m0 0L8.25 8.5M12 4.75l3.75 3.75M5 14.75v4.5h14v-4.5" />
    </svg>
  )
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m9.5 12.5 5.8-5.8a3.18 3.18 0 0 1 4.5 4.5l-8.3 8.3a5.3 5.3 0 0 1-7.5-7.5l8.1-8.1" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m21 3-7.3 18-3.9-7.8L2 9.3 21 3Z" />
      <path d="M9.8 13.2 15 8" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2Z" />
      <path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" />
    </svg>
  )
}

function SummaryPanel() {
  return (
    <section className="workspace-panel summaries-panel" aria-labelledby="summaries-heading">
      <div className="panel-heading">
        <div>
          <h2 id="summaries-heading">File Summaries</h2>
          <p className="panel-subtitle">Your study materials at a glance</p>
        </div>
      </div>

      {summaries.length > 0 ? (
        <ul className="summary-list">
          {summaries.map((file) => (
            <li key={file.name}>
              <article className="summary-card">
                <div className="summary-card__title">
                  <FileTypeIcon kind={file.kind} />
                  <h3 title={file.name}>{file.name}</h3>
                </div>
                <p>{file.summary}</p>
                <span className="summary-card__type">
                  {file.kind === 'pdf' ? 'PDF document' : 'Word document'}
                </span>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <span className="empty-state__icon">
            <UploadIcon />
          </span>
          <p>Upload a file to see its summary here</p>
        </div>
      )}

      {/* TODO: connect this button to file upload. */}
      <button className="button button--outline upload-cta" type="button">
        <UploadIcon />
        <span>Upload a file</span>
      </button>
    </section>
  )
}

function ChatPanel() {
  return (
    <section className="workspace-panel chat-panel" aria-labelledby="chat-heading">
      <div className="panel-heading chat-panel__heading">
        <div>
          <h2 id="chat-heading">Study chat</h2>
          <p className="panel-subtitle">Ask anything about your materials</p>
        </div>
        <span className="online-indicator">
          <span aria-hidden="true" />
          Ready to help
        </span>
      </div>

      <div className="chat-messages" aria-label="Conversation">
        <p className="chat-date">Today</p>
        {messages.map((message, index) => (
          <article
            className={`message message--${message.author}`}
            key={`${message.author}-${index}`}
          >
            {message.author === 'aurora' && (
              <span className="assistant-avatar" aria-hidden="true">
                <SparkleIcon />
              </span>
            )}
            <div className="message__content">
              <span className="message__author">
                {message.author === 'you' ? 'You' : 'Aurora'}
              </span>
              <p>{message.text}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="composer-attachment" aria-label="Attached file">
        <FileTypeIcon kind="pdf" />
        <span>Introduction to Biology.pdf</span>
        <span className="attachment-context">Attached</span>
      </div>
      {/* TODO: connect the composer to chat submission. */}
      <form className="chat-composer" onSubmit={(event) => event.preventDefault()}>
        <label className="visually-hidden" htmlFor="chat-message">
          Message Aurora
        </label>
        <input
          id="chat-message"
          type="text"
          placeholder="Ask a question about your files..."
        />
        {/* TODO: connect this button to file attachment. */}
        <button className="icon-button composer-attach" type="button" aria-label="Attach a file">
          <PaperclipIcon />
        </button>
        {/* TODO: connect this button to chat submission. */}
        <button className="icon-button composer-send" type="button" aria-label="Send message">
          <SendIcon />
        </button>
      </form>
      <p className="chat-disclaimer">Aurora can make mistakes. Check important details.</p>
    </section>
  )
}

function QuizPanel() {
  return (
    <section className="workspace-panel quiz-panel" aria-labelledby="quiz-heading">
      <div className="panel-heading">
        <div>
          <h2 id="quiz-heading">Quick quiz</h2>
          <p className="panel-subtitle">Check what you’ve learned</p>
        </div>
        <span className="quiz-badge">Biology</span>
      </div>

      {quizQuestions.length > 0 ? (
        <>
          <div className="quiz-card">
            <div className="quiz-progress">
              <span>Question 2 of 5</span>
              <span>40%</span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Quiz progress"
              aria-valuemin={0}
              aria-valuemax={5}
              aria-valuenow={2}
            >
              <span />
            </div>

            <p className="quiz-question">{currentQuizQuestion.question}</p>

            <ol className="quiz-options">
              {currentQuizQuestion.options.map((option, index) => (
                <li className="quiz-option" key={option}>
                  <span className="quiz-option__letter" aria-hidden="true">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="quiz-navigation">
            {/* TODO: connect to quiz question navigation. */}
            <button className="button button--outline" type="button">
              Previous
            </button>
            {/* TODO: connect to quiz question navigation. */}
            <button className="button button--primary quiz-next" type="button">
              Next
            </button>
          </div>
          <p className="quiz-source">Based on Introduction to Biology.pdf</p>
        </>
      ) : (
        <div className="empty-state">
          <span className="empty-state__icon">
            <SparkleIcon />
          </span>
          <p>Upload a file to generate a quiz</p>
        </div>
      )}
    </section>
  )
}

function HomePage() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [menuError, setMenuError] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const metadata = user?.user_metadata as Record<string, unknown> | undefined
  const metadataFullName = metadata?.full_name
  const fullName = typeof metadataFullName === 'string' ? metadataFullName.trim() : ''
  const fallbackName = user?.email?.split('@')[0] ?? 'User'
  const displayName = fullName || fallbackName
  const avatarLetter = displayName.trim().charAt(0).toUpperCase() || 'U'

  useEffect(() => {
    if (!isUserMenuOpen) {
      return
    }

    function handleMouseDown(event: MouseEvent) {
      const target = event.target

      if (target instanceof Node && !menuRef.current?.contains(target)) {
        setIsUserMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isUserMenuOpen])

  async function handleSignOut() {
    setMenuError('')
    setIsSigningOut(true)

    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (caughtError) {
      setMenuError(caughtError instanceof Error ? caughtError.message : 'Unable to log out.')
      setIsSigningOut(false)
    }
  }

  return (
    <div className="home-page">
      <header className="app-header">
        <Link className="app-header__brand" to="/" aria-label="Aurora AI home">
          <AuroraBrand />
        </Link>
        <div className="app-header__right">
          <span className="header-greeting">Your personal study space</span>
          <div className="user-menu-wrapper" ref={menuRef}>
            <button
              className="user-menu"
              type="button"
              aria-label="Open user menu"
              aria-haspopup="menu"
              aria-expanded={isUserMenuOpen}
              onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
            >
              <span className="user-avatar" aria-hidden="true">{avatarLetter}</span>
              <span className="user-menu__name">{displayName}</span>
              <svg className="chevron-icon" viewBox="0 0 16 16" aria-hidden="true">
                <path d="m4 6 4 4 4-4" />
              </svg>
            </button>
            {isUserMenuOpen && (
              <div className="user-dropdown" role="menu">
                {menuError && (
                  <p className="user-dropdown__error" role="alert">
                    {menuError}
                  </p>
                )}
                <button
                  className="user-dropdown__item"
                  type="button"
                  role="menuitem"
                  disabled={isSigningOut}
                  onClick={() => void handleSignOut()}
                >
                  {isSigningOut ? 'Logging out...' : 'Log out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="workspace" aria-label="Study workspace">
        <SummaryPanel />
        <ChatPanel />
        <QuizPanel />
      </main>
    </div>
  )
}

export default HomePage
