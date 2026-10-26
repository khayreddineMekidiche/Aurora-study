import { supabase } from '../lib/supabase'
import type { MessageRow } from '../types/db'

type ChatResponse = {
  conversation_id: string
  user_message: MessageRow
  assistant_message: MessageRow
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function friendlyFunctionError(error: unknown, fallback: string): Promise<Error> {
  if (isRecord(error) && 'context' in error && error.context instanceof Response) {
    try {
      const body: unknown = await error.context.clone().json()
      if (isRecord(body) && typeof body.error === 'string' && body.error.trim()) {
        const message = body.error.trim()
        const appearsTechnical = /(exception|stack trace|postgres|postgrest|sqlstate|failed to fetch|typeerror|syntaxerror|internal server error|relation .* does not exist|column .* does not exist)/i.test(message)
        if (message.length <= 240 && !appearsTechnical) return new Error(message)
      }
    } catch {
      // Use the friendly fallback when the response body is absent or not JSON.
    }
  }
  return new Error(fallback)
}

export async function sendMessage(text: string, conversationId: string | null): Promise<ChatResponse> {
  let result: Awaited<ReturnType<typeof supabase.functions.invoke>>
  try {
    result = await supabase.functions.invoke('chat', {
      body: conversationId
        ? { message: text, conversation_id: conversationId }
        : { message: text },
    })
  } catch (error) {
    throw await friendlyFunctionError(error, 'Unable to send your message. Please try again.')
  }

  if (result.error) {
    throw await friendlyFunctionError(result.error, 'Unable to send your message. Please try again.')
  }
  if (!isRecord(result.data) || typeof result.data.conversation_id !== 'string' ||
    !isRecord(result.data.user_message) || !isRecord(result.data.assistant_message)) {
    throw new Error('Aurora returned an unexpected response. Please try again.')
  }
  return result.data as ChatResponse
}

export async function generateSummary(documentId: string): Promise<string> {
  let result: Awaited<ReturnType<typeof supabase.functions.invoke>>
  try {
    result = await supabase.functions.invoke('summarize-document', {
      body: { document_id: documentId },
    })
  } catch (error) {
    throw await friendlyFunctionError(error, 'Unable to generate this summary. Please try again.')
  }

  if (result.error) {
    throw await friendlyFunctionError(result.error, 'Unable to generate this summary. Please try again.')
  }
  if (!isRecord(result.data) || typeof result.data.summary !== 'string') {
    throw new Error('The summary response was incomplete. Please try again.')
  }
  return result.data.summary
}
