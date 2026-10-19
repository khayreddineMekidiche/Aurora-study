import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'
import {
  validQuizQuestions,
  type ConversationRow,
  type DocumentRow,
  type MessageRow,
  type QuizRow,
  type StudySpaceRow,
} from '../types/db'

type WorkspaceData = {
  loading: boolean
  error: string | null
  studySpace: StudySpaceRow | null
  documents: DocumentRow[]
  conversation: ConversationRow | null
  messages: MessageRow[]
  quiz: QuizRow | null
}

type WorkspaceResult = WorkspaceData & { refetchDocuments: () => Promise<void> }

const initialData: WorkspaceData = {
  loading: true,
  error: null,
  studySpace: null,
  documents: [],
  conversation: null,
  messages: [],
  quiz: null,
}

type QuizQueryRow = Omit<QuizRow, 'questions'> & { questions: unknown }

export function useWorkspaceData(): WorkspaceResult {
  const { user } = useAuth()
  const userId = user?.id
  const [data, setData] = useState<WorkspaceData>(initialData)
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null)

  const refetchDocuments = useCallback(async () => {
    const studySpaceId = data.studySpace?.id
    if (!studySpaceId || !userId) return

    const result = await supabase
      .from('documents')
      .select('id, study_space_id, file_name, file_path, file_type, summary, processing_status, error_message, created_at')
      .eq('study_space_id', studySpaceId)
      .order('created_at', { ascending: false })
      .returns<DocumentRow[]>()

    if (result.error) {
      setData((current) => current.studySpace?.id === studySpaceId
        ? { ...current, error: result.error.message }
        : current)
      throw new Error(result.error.message)
    }

    setData((current) => current.studySpace?.id === studySpaceId
      ? { ...current, documents: result.data, error: null }
      : current)
  }, [data.studySpace?.id, userId])

  useEffect(() => {
    const hasActiveProcessing = data.documents.some((document) => {
      if (document.processing_status === 'processing') return true
      return document.processing_status === 'pending' &&
        Date.now() - new Date(document.created_at).getTime() < 2 * 60 * 1000
    })

    if (!userId || !hasActiveProcessing) return

    const intervalId = window.setInterval(() => {
      void refetchDocuments().catch((error: unknown) => console.error('Unable to refresh documents:', error))
    }, 3000)

    return () => window.clearInterval(intervalId)
  }, [data.documents, refetchDocuments, userId])

  useEffect(() => {
    let cancelled = false

    if (!userId) {
      return () => { cancelled = true }
    }

    async function loadWorkspace() {
      try {
        const spaceResult = await supabase
          .from('study_spaces')
          .select('id, user_id, name, description, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(1)
          .returns<StudySpaceRow[]>()
        if (spaceResult.error) throw spaceResult.error

        let studySpace = spaceResult.data[0] ?? null
        if (!studySpace) {
          const insertResult = await supabase
            .from('study_spaces')
            .insert({ user_id: userId, name: 'My Study Space' })
            .select('id, user_id, name, description, created_at')
            .single<StudySpaceRow>()
          if (insertResult.error) throw insertResult.error
          studySpace = insertResult.data
        }

        const [documentsResult, conversationResult, quizResult] = await Promise.all([
          supabase
            .from('documents')
            .select('id, study_space_id, file_name, file_path, file_type, summary, processing_status, error_message, created_at')
            .eq('study_space_id', studySpace.id)
            .order('created_at', { ascending: false })
            .returns<DocumentRow[]>(),
          supabase
            .from('conversations')
            .select('id, study_space_id, title, created_at, updated_at')
            .eq('study_space_id', studySpace.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle<ConversationRow>(),
          supabase
            .from('quizzes')
            .select('id, study_space_id, title, questions, settings, score_history, created_at')
            .eq('study_space_id', studySpace.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .returns<QuizQueryRow[]>(),
        ])

        if (documentsResult.error) throw documentsResult.error
        if (conversationResult.error) throw conversationResult.error
        if (quizResult.error) throw quizResult.error

        const conversation = conversationResult.data
        let messages: MessageRow[] = []
        if (conversation) {
          const messagesResult = await supabase
            .from('messages')
            .select('id, conversation_id, role, content, created_at')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true })
            .limit(100)
            .returns<MessageRow[]>()
          if (messagesResult.error) throw messagesResult.error
          messages = messagesResult.data
        }

        const quizRecord = quizResult.data[0]
        const quiz: QuizRow | null = quizRecord
          ? { ...quizRecord, questions: validQuizQuestions(quizRecord.questions) }
          : null

        if (!cancelled) {
          setData({
            loading: false,
            error: null,
            studySpace,
            documents: documentsResult.data,
            conversation,
            messages,
            quiz,
          })
          setLoadedUserId(userId ?? null)
        }
      } catch (caughtError) {
        if (!cancelled) {
          setData({ ...initialData, loading: false, error: caughtError instanceof Error ? caughtError.message : String(caughtError) })
          setLoadedUserId(userId ?? null)
        }
      }
    }

    void loadWorkspace()
    return () => { cancelled = true }
  }, [userId])

  if (!userId) return { ...initialData, loading: false, refetchDocuments }
  if (loadedUserId !== userId) return { ...initialData, refetchDocuments }
  return { ...data, refetchDocuments }
}
