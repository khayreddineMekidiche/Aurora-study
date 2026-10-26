// Shared Gemini GenerateContent client with bounded retry and friendly response validation.
export type GeminiContent = {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export type GenerateTextOptions = {
  system: string
  contents: GeminiContent[]
  maxOutputTokens: number
  temperature: number
}

export class RateLimitError extends Error {
  constructor() {
    super('Gemini is temporarily rate limited.')
    this.name = 'RateLimitError'
  }
}

export class GeminiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeminiError'
  }
}

type GeminiPart = { text?: unknown; thought?: unknown }
type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] }
    finishReason?: string
  }>
  promptFeedback?: { blockReason?: string }
}

function isGeminiResponse(value: unknown): value is GeminiResponse {
  return typeof value === 'object' && value !== null
}

function responseError(): GeminiError {
  return new GeminiError('Aurora could not generate a response. Please try again.')
}

export async function generateText({
  system,
  contents,
  maxOutputTokens,
  temperature,
}: GenerateTextOptions): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new GeminiError('AI responses are temporarily unavailable.')
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`

  let response: Response | null = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature, maxOutputTokens },
      }),
    })

    if ((response.status === 429 || response.status === 503) && attempt === 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 2000))
      continue
    }
    break
  }

  if (!response) throw responseError()
  if (response.status === 429) throw new RateLimitError()
  if (response.status === 503) throw responseError()
  if (!response.ok) throw responseError()

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw responseError()
  }
  if (!isGeminiResponse(payload)) throw responseError()
  if (payload.promptFeedback?.blockReason) {
    throw new GeminiError('Aurora could not answer that request. Please try rephrasing it.')
  }

  const candidate = payload.candidates?.[0]
  if (!candidate) throw new GeminiError('Aurora could not generate a response. Please try again.')
  if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'BLOCKLIST') {
    throw new GeminiError('Aurora could not answer that request. Please try rephrasing it.')
  }

  const text = candidate.content?.parts
    ?.filter((part) => part.thought !== true && typeof part.text === 'string')
    .map((part) => part.text as string)
    .join('')
    .trim()
  if (!text) throw responseError()
  return text
}
