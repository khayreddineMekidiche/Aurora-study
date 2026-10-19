// This function reads a caller-owned file, extracts and chunks its text, stores embeddings, and updates its processing status.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { extractText, getDocumentProxy } from 'npm:unpdf'
import { strFromU8, unzipSync } from 'npm:fflate'

type DocumentRow = {
  id: string
  study_space_id: string
  file_path: string
  file_type: 'pdf' | 'docx' | 'txt'
  processing_status: 'pending' | 'processing' | 'ready' | 'failed'
}

type TextChunk = {
  chunk_text: string
  page_number: number | null
}

type EmbeddingSession = {
  run: (
    text: string,
    options: { mean_pool: true; normalize: true },
  ) => Promise<number[]>
}

const session: EmbeddingSession = new Supabase.ai.Session('gte-small')
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function boundaryEnd(text: string, start: number, target: number): number {
  if (target >= text.length) return text.length
  const min = start + 700
  const max = Math.min(start + 1100, text.length)

  const paragraph = text.lastIndexOf('\n\n', max)
  if (paragraph >= min) return paragraph + 2

  const sentenceText = text.slice(min, max)
  const sentencePattern = /[.!?]["')\]]?\s+/g
  let sentenceEnd = -1
  for (const match of sentenceText.matchAll(sentencePattern)) {
    sentenceEnd = min + (match.index ?? 0) + match[0].length
  }
  if (sentenceEnd >= min) return sentenceEnd

  const whitespace = text.lastIndexOf(' ', max)
  if (whitespace >= min) return whitespace
  return target
}

function chunkPage(text: string, pageNumber: number | null): TextChunk[] {
  const normalized = normalizeWhitespace(text)
  const chunks: TextChunk[] = []
  let start = 0

  while (start < normalized.length) {
    const target = Math.min(start + 1000, normalized.length)
    const end = boundaryEnd(normalized, start, target)
    const chunk = normalized.slice(start, end).trim()
    if (chunk.length >= 30) chunks.push({ chunk_text: chunk, page_number: pageNumber })
    if (end >= normalized.length) break
    start = Math.max(start + 1, end - 150)
  }

  return chunks
}

function decodeXmlText(xml: string): string {
  const text = xml
    .replace(/<w:tab\b[^>]*\/?\s*>/g, ' ')
    .replace(/<w:br\b[^>]*\/?\s*>/g, '\n')
    .replace(/<\/w:p\s*>/g, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_entity, decimal: string) => String.fromCodePoint(Number(decimal)))
    .replace(/&#x([0-9a-f]+);/gi, (_entity, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
  return normalizeWhitespace(text)
}

async function extractDocumentText(fileType: DocumentRow['file_type'], bytes: Uint8Array): Promise<TextChunk[]> {
  if (fileType === 'txt') {
    return chunkPage(new TextDecoder('utf-8').decode(bytes), null)
  }

  if (fileType === 'docx') {
    const archive = unzipSync(bytes)
    const documentXml = archive['word/document.xml']
    if (!documentXml) throw new Error('Invalid DOCX document')
    return chunkPage(decodeXmlText(strFromU8(documentXml)), null)
  }

  const pdf = await getDocumentProxy(bytes)
  const extracted = await extractText(pdf, { mergePages: false })
  if (!Array.isArray(extracted.text)) throw new Error('Unable to extract PDF pages')
  return extracted.text.flatMap((pageText, index) => chunkPage(pageText, index + 1))
}

async function embedChunks(chunks: TextChunk[]): Promise<number[][]> {
  const embeddings: number[][] = []
  for (let offset = 0; offset < chunks.length; offset += 8) {
    const group = chunks.slice(offset, offset + 8)
    const groupEmbeddings = await Promise.all(
      group.map((chunk) => session.run(chunk.chunk_text, { mean_pool: true, normalize: true })),
    )
    for (const embedding of groupEmbeddings) {
      if (embedding.length !== 384 || embedding.some((value) => !Number.isFinite(value))) {
        throw new Error('Embedding service returned an invalid vector')
      }
    }
    embeddings.push(...groupEmbeddings)
  }
  return embeddings
}

function friendlyError(error: unknown): string {
  if (error instanceof Error && error.message === 'No readable text found. Scanned PDFs are not supported yet.') {
    return error.message
  }
  if (error instanceof Error && error.message === 'Document is too large to process.') {
    return error.message
  }
  if (error instanceof Error && error.message === 'Could not download the file.') {
    return error.message
  }
  return 'We could not process this document. Please check the file and try again.'
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Use POST to process a document.' }, 405)
  }

  const authorization = request.headers.get('Authorization')
  if (!authorization) return jsonResponse({ ok: false, error: 'Sign in to process this document.' }, 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ ok: false, error: 'Send a valid JSON request.' }, 400)
  }

  if (
    typeof body !== 'object' || body === null ||
    !('document_id' in body) || typeof body.document_id !== 'string' ||
    !uuidPattern.test(body.document_id)
  ) {
    return jsonResponse({ ok: false, error: 'Provide a valid document ID.' }, 400)
  }

  const documentId = body.document_id
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase URL or anon key environment configuration.')
    return jsonResponse({ ok: false, error: 'Document processing is temporarily unavailable.' }, 500)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  })
  let document: DocumentRow | null = null

  try {
    const { data, error } = await supabase
      .from('documents')
      .select('id, study_space_id, file_path, file_type, processing_status')
      .eq('id', documentId)
      .maybeSingle()
    if (error) throw error
    if (!data) return jsonResponse({ ok: false, error: 'Document not found.' }, 404)
    document = data as DocumentRow

    if (document.processing_status === 'processing') {
      return jsonResponse({ ok: false, error: 'This document is already processing.' }, 409)
    }

    const { data: updated, error: updateError } = await supabase
      .from('documents')
      .update({ processing_status: 'processing', error_message: null })
      .eq('id', document.id)
      .neq('processing_status', 'processing')
      .select('id')
      .maybeSingle()
    if (updateError) throw updateError
    if (!updated) {
      return jsonResponse({ ok: false, error: 'This document is already processing.' }, 409)
    }
    const { error: deleteError } = await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', document.id)
    if (deleteError) throw deleteError

    const { data: file, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path)
    if (downloadError || !file) throw new Error('Could not download the file.')

    const chunks = await extractDocumentText(document.file_type, new Uint8Array(await file.arrayBuffer()))
    if (chunks.length === 0) {
      throw new Error('No readable text found. Scanned PDFs are not supported yet.')
    }
    if (chunks.length > 800) throw new Error('Document is too large to process.')

    const embeddings = await embedChunks(chunks)
    for (let offset = 0; offset < chunks.length; offset += 50) {
      const rows = chunks.slice(offset, offset + 50).map((chunk, batchIndex) => ({
        document_id: document!.id,
        study_space_id: document!.study_space_id,
        chunk_text: chunk.chunk_text,
        page_number: chunk.page_number,
        embedding: embeddings[offset + batchIndex],
        metadata: { chunk_index: offset + batchIndex },
      }))
      const { error: insertError } = await supabase.from('document_chunks').insert(rows)
      if (insertError) throw insertError
    }

    const { error: readyError } = await supabase
      .from('documents')
      .update({ processing_status: 'ready', error_message: null })
      .eq('id', document.id)
    if (readyError) throw readyError

    return jsonResponse({ ok: true, chunks: chunks.length }, 200)
  } catch (error) {
    console.error('Document processing failed:', error)
    const message = friendlyError(error)
    if (document) {
      try {
        const { error: cleanupError } = await supabase
          .from('document_chunks')
          .delete()
          .eq('document_id', document.id)
        if (cleanupError) console.error('Failed to clean up document chunks:', cleanupError)
      } catch (cleanupError) {
        console.error('Failed to clean up document chunks:', cleanupError)
      }
      try {
        const { error: statusError } = await supabase
          .from('documents')
          .update({ processing_status: 'failed', error_message: message })
          .eq('id', document.id)
        if (statusError) console.error('Failed to update document failure status:', statusError)
      } catch (statusError) {
        console.error('Failed to update document failure status:', statusError)
      }
    }
    return jsonResponse({ ok: false, error: message }, 500)
  }
})
