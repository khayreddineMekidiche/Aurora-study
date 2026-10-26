import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import { AuroraBrand } from './components/AuthComponents'
import { sendMessage, generateSummary } from './data/chatApi'
import { useWorkspaceData } from './data/useWorkspaceData'
import { uploadDocument } from './data/uploadDocument'
import { supabase } from './lib/supabase'
import type { DocumentRow, MessageRow, QuizRow } from './types/db'
import './HomePage.css'

async function invokeDocumentProcessing(documentId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('process-document', {
      body: { document_id: documentId },
    })
    if (error) console.error('Document processing request failed:', error)
  } catch (error) {
    console.error('Document processing request failed:', error)
  }
}

function FileTypeIcon({ kind }: { kind: 'pdf' | 'document' }) {
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

function SummaryPanel({ documents, loading, error, studySpaceId, userId, refetchDocuments }: {
  documents: DocumentRow[]
  loading: boolean
  error: string | null
  studySpaceId: string | null
  userId: string | undefined
  refetchDocuments: () => Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [retryingDocumentIds, setRetryingDocumentIds] = useState<Set<string>>(() => new Set())
  const [currentTime, setCurrentTime] = useState(0)
  const [generatingSummaryIds, setGeneratingSummaryIds] = useState<Set<string>>(() => new Set())
  const [summaryErrors, setSummaryErrors] = useState<Record<string, string>>({})
  const autoRequestedSummaryIds = useRef(new Set<string>())
  const autoSummaryCount = useRef(0)
  const autoSummaryRunning = useRef(false)

  useEffect(() => {
    const candidates = documents.filter((document) =>
      document.processing_status === 'ready' && document.summary === null &&
      !autoRequestedSummaryIds.current.has(document.id))
    const batch = candidates.slice(0, Math.max(0, 3 - autoSummaryCount.current))
    if (batch.length === 0 || autoSummaryRunning.current) return

    autoSummaryRunning.current = true
    const requestedIds = batch.map((document) => document.id)
    for (const document of batch) {
      autoSummaryCount.current += 1
      autoRequestedSummaryIds.current.add(document.id)
    }
    setGeneratingSummaryIds((current) => new Set([...current, ...requestedIds]))

    void (async () => {
      for (const document of batch) {
        try {
          await generateSummary(document.id)
        } catch (caughtError) {
          console.error('Automatic summary generation failed:', caughtError)
          setSummaryErrors((current) => ({
            ...current,
            [document.id]: caughtError instanceof Error ? caughtError.message : 'Unable to generate this summary.',
          }))
        }
      }

      if (requestedIds.length > 0) {
        try {
          await refetchDocuments()
        } catch (caughtError) {
          console.error('Unable to refresh summaries:', caughtError)
        }
      }
      setGeneratingSummaryIds((current) => {
        const next = new Set(current)
        for (const id of requestedIds) next.delete(id)
        return next
      })
      autoSummaryRunning.current = false
    })()
  }, [documents, refetchDocuments])

  useEffect(() => {
    if (!documents.some((document) => document.processing_status === 'pending')) return
    const intervalId = window.setInterval(() => setCurrentTime(Date.now()), 3000)
    return () => window.clearInterval(intervalId)
  }, [documents])

  async function handleRetry(documentId: string) {
    setRetryingDocumentIds((current) => new Set(current).add(documentId))
    try {
      await invokeDocumentProcessing(documentId)
      await refetchDocuments()
    } catch (caughtError) {
      console.error('Unable to refresh document after retry:', caughtError)
    } finally {
      setRetryingDocumentIds((current) => {
        const next = new Set(current)
        next.delete(documentId)
        return next
      })
    }
  }

  async function handleGenerateSummary(documentId: string) {
    setSummaryErrors((current) => {
      const next = { ...current }
      delete next[documentId]
      return next
    })
    setGeneratingSummaryIds((current) => new Set(current).add(documentId))
    try {
      await generateSummary(documentId)
      await refetchDocuments()
    } catch (caughtError) {
      setSummaryErrors((current) => ({
        ...current,
        [documentId]: caughtError instanceof Error ? caughtError.message : 'Unable to generate this summary.',
      }))
    } finally {
      setGeneratingSummaryIds((current) => {
        const next = new Set(current)
        next.delete(documentId)
        return next
      })
    }
  }

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    if (!studySpaceId || !userId) {
      setUploadError('Your study space is not ready yet. Please try again.')
      return
    }

    setUploadError('')
    setIsUploading(true)
    try {
      const document = await uploadDocument(file, studySpaceId, userId)
      void invokeDocumentProcessing(document.id)
      await refetchDocuments()
    } catch (caughtError) {
      setUploadError(caughtError instanceof Error ? caughtError.message : 'Unable to upload this file.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="workspace-panel summaries-panel" aria-labelledby="summaries-heading">
      <div className="panel-heading">
        <div>
          <h2 id="summaries-heading">File Summaries</h2>
          <p className="panel-subtitle">Your study materials at a glance</p>
        </div>
      </div>

      {loading ? <p>Loading files...</p> : error ? <p role="alert">{error}</p> : documents.length > 0 ? (
        <ul className="summary-list">
          {documents.map((file) => {
            const kind = file.file_type.toLowerCase() === 'pdf' ? 'pdf' : 'document'
            const isStalled = file.processing_status === 'pending' &&
              currentTime - new Date(file.created_at).getTime() >= 2 * 60 * 1000
            const canRetry = file.processing_status === 'failed' || isStalled
            return <li key={file.id}>
              <article className="summary-card">
                <div className="summary-card__title">
                  <FileTypeIcon kind={kind} />
                  <h3 title={file.file_name}>{file.file_name}</h3>
                </div>
                <p>{file.summary ?? 'Summary not ready yet'}</p>
                {file.processing_status === 'ready' && file.summary === null && (
                  <>
                    {summaryErrors[file.id] && <p className="summary-card__error">{summaryErrors[file.id]}</p>}
                    <button
                      className="document-retry"
                      type="button"
                      disabled={generatingSummaryIds.has(file.id)}
                      onClick={() => void handleGenerateSummary(file.id)}
                    >
                      {generatingSummaryIds.has(file.id) ? 'Generating...' : 'Generate summary'}
                    </button>
                  </>
                )}
                <span className="summary-card__type">{kind === 'pdf' ? 'PDF document' : 'Document'}</span>
                {file.processing_status === 'processing' && <span className="summary-card__type">Processing...</span>}
                {file.processing_status === 'pending' && <span className="summary-card__type">Pending</span>}
                {file.processing_status === 'failed' && <span className="summary-card__type">Failed</span>}
                {file.processing_status === 'failed' && file.error_message && <p className="summary-card__error">{file.error_message}</p>}
                {canRetry && (
                  <button
                    className="document-retry"
                    type="button"
                    disabled={retryingDocumentIds.has(file.id)}
                    onClick={() => void handleRetry(file.id)}
                  >
                    {retryingDocumentIds.has(file.id) ? 'Retrying...' : 'Retry'}
                  </button>
                )}
              </article>
            </li>
          })}
        </ul>
      ) : (
        <div className="empty-state">
          <span className="empty-state__icon">
            <UploadIcon />
          </span>
          <p>Upload a file to see its summary here</p>
        </div>
      )}

      {uploadError && <p className="upload-error" role="alert">{uploadError}</p>}
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={(event) => void handleFileSelection(event)}
        tabIndex={-1}
        aria-label="Choose a PDF, DOCX, or TXT file"
      />
      <button className="button button--outline upload-cta" type="button" disabled={isUploading || loading || !studySpaceId} onClick={() => inputRef.current?.click()}>
        <UploadIcon />
        <span>{isUploading ? 'Uploading...' : 'Upload a file'}</span>
      </button>
    </section>
  )
}

function ChatPanel({
  messages,
  loading,
  error,
  conversationId,
  setConversationId,
  appendMessages,
  replaceMessages,
}: {
  messages: MessageRow[]
  loading: boolean
  error: string | null
  conversationId: string | null
  setConversationId: (conversationId: string | null) => void
  appendMessages: (messages: MessageRow[]) => void
  replaceMessages: (temporaryIds: string[], messages: MessageRow[]) => void
}) {
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [chatError, setChatError] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = messagesRef.current
    if (container) container.scrollTop = container.scrollHeight
  }, [messages, isSending])

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = input
    if (!text.trim() || isSending || loading) return

    const requestId = crypto.randomUUID()
    const optimisticUserId = `optimistic-user-${requestId}`
    const thinkingId = `thinking-${requestId}`
    const createdAt = new Date().toISOString()
    const optimisticMessages: MessageRow[] = [
      {
        id: optimisticUserId,
        conversation_id: conversationId ?? '',
        role: 'user',
        content: text,
        sources: null,
        created_at: createdAt,
      },
      {
        id: thinkingId,
        conversation_id: conversationId ?? '',
        role: 'assistant',
        content: 'Aurora is thinking...',
        sources: null,
        created_at: createdAt,
      },
    ]

    setChatError('')
    setInput('')
    setIsSending(true)
    appendMessages(optimisticMessages)

    try {
      const response = await sendMessage(text, conversationId)
      setConversationId(response.conversation_id)
      replaceMessages(
        [optimisticUserId, thinkingId],
        [response.user_message, response.assistant_message],
      )
    } catch (caughtError) {
      replaceMessages([optimisticUserId, thinkingId], [])
      setInput(text)
      setChatError(caughtError instanceof Error ? caughtError.message : 'Unable to send your message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

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

      <div className="chat-messages" aria-label="Conversation" ref={messagesRef}>
        {messages.length > 0 && <p className="chat-date">{new Date(messages[0].created_at).toLocaleDateString()}</p>}
        {loading ? <p>Loading conversation...</p> : error ? <p role="alert">{error}</p> : messages.length === 0 ? <p>Ask a question about your files to get started</p> : messages.map((message) => {
          const sources = message.role === 'assistant' ? message.sources ?? [] : []
          const sourceLabels = sources.map((source) => source.page_number === null
            ? source.file_name
            : `${source.file_name} (p. ${source.page_number})`)
          return <article
            className={`message message--${message.role === 'user' ? 'you' : 'aurora'}`}
            key={message.id}
          >
            {message.role === 'assistant' && (
              <span className="assistant-avatar" aria-hidden="true">
                <SparkleIcon />
              </span>
            )}
            <div className="message__content">
              <span className="message__author">
                {message.role === 'user' ? 'You' : 'Aurora'}
              </span>
              <p>{message.content}</p>
              {sourceLabels.length > 0 && <span className="message__sources">Sources: {sourceLabels.join(', ')}</span>}
            </div>
          </article>
        })}
        {chatError && <p className="chat-error" role="alert">{chatError}</p>}
      </div>

      {/* TODO: show attached files (step 3) */}
      {/* <div className="composer-attachment" aria-label="Attached file">
        <FileTypeIcon kind="pdf" />
        <span>Introduction to Biology.pdf</span>
        <span className="attachment-context">Attached</span>
      </div> */}
      <form className="chat-composer" onSubmit={(event) => void handleSend(event)}>
        <label className="visually-hidden" htmlFor="chat-message">
          Message Aurora
        </label>
        <input
          id="chat-message"
          type="text"
          placeholder="Ask a question about your files..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={isSending}
        />
        {/* TODO: connect this button to file attachment. */}
        <button className="icon-button composer-attach" type="button" aria-label="Attach a file">
          <PaperclipIcon />
        </button>
        <button className="icon-button composer-send" type="submit" aria-label="Send message" disabled={isSending || !input.trim() || loading}>
          <SendIcon />
        </button>
      </form>
      <p className="chat-disclaimer">Aurora can make mistakes. Check important details.</p>
    </section>
  )
}

function QuizPanel({ quiz, loading, error }: { quiz: QuizRow | null; loading: boolean; error: string | null }) {
  const question = quiz?.questions[0]
  const total = quiz?.questions.length ?? 0
  const progress = total > 0 ? 100 / total : 0

  return (
    <section className="workspace-panel quiz-panel" aria-labelledby="quiz-heading">
      <div className="panel-heading">
        <div>
          <h2 id="quiz-heading">Quick quiz</h2>
          <p className="panel-subtitle">Check what you’ve learned</p>
        </div>
        {quiz && <span className="quiz-badge">{quiz.title}</span>}
      </div>

      {loading ? <p>Loading quiz...</p> : error ? <p role="alert">{error}</p> : question ? (
        <>
          <div className="quiz-card">
            <div className="quiz-progress">
              <span>Question 1 of {total}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Quiz progress"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={1}
            >
              <span style={{ width: `${progress}%` }} />
            </div>

            <p className="quiz-question">{question.question}</p>

            <ol className="quiz-options">
              {question.options.map((option, index) => (
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
            {/* TODO: quiz navigation (step 6) */}
            <button className="button button--outline" type="button">
              Previous
            </button>
            {/* TODO: quiz navigation (step 6) */}
            <button className="button button--primary quiz-next" type="button">
              Next
            </button>
          </div>
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
  const workspaceData = useWorkspaceData()
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
        <SummaryPanel
          documents={workspaceData.documents}
          loading={workspaceData.loading}
          error={workspaceData.error}
          studySpaceId={workspaceData.studySpace?.id ?? null}
          userId={user?.id}
          refetchDocuments={workspaceData.refetchDocuments}
        />
        <ChatPanel
          messages={workspaceData.messages}
          loading={workspaceData.loading}
          error={workspaceData.error}
          conversationId={workspaceData.conversationId}
          setConversationId={workspaceData.setConversationId}
          appendMessages={workspaceData.appendMessages}
          replaceMessages={workspaceData.replaceMessages}
        />
        <QuizPanel quiz={workspaceData.quiz} loading={workspaceData.loading} error={workspaceData.error} />
      </main>
    </div>
  )
}

export default HomePage
