export type StudySpaceRow = {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
}

export type DocumentRow = {
  id: string
  study_space_id: string
  file_name: string
  file_path: string
  file_type: string
  summary: string | null
  processing_status: 'pending' | 'processing' | 'ready' | 'failed'
  error_message: string | null
  created_at: string
}

export type ConversationRow = {
  id: string
  study_space_id: string
  title: string
  created_at: string
  updated_at: string
}

export type MessageRow = {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  sources: MessageSource[] | null
  created_at: string
}

export type MessageSource = {
  document_id: string
  file_name: string
  page_number: number | null
}

export type QuizQuestion = {
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
}

export type QuizRow = {
  id: string
  study_space_id: string
  title: string
  questions: QuizQuestion[]
  settings: unknown
  score_history: unknown
  created_at: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isQuizQuestion(value: unknown): value is QuizQuestion {
  return (
    isRecord(value) &&
    typeof value.question === 'string' &&
    Array.isArray(value.options) &&
    value.options.every((option: unknown) => typeof option === 'string') &&
    typeof value.correctIndex === 'number' &&
    (value.explanation === undefined || typeof value.explanation === 'string')
  )
}

export function validQuizQuestions(value: unknown): QuizQuestion[] {
  if (!Array.isArray(value)) return []
  return value.filter(isQuizQuestion)
}
