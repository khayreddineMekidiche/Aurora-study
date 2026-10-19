import { supabase } from '../lib/supabase'
import type { DocumentRow } from '../types/db'

const maxFileSize = 20 * 1024 * 1024

export async function uploadDocument(
  file: File,
  studySpaceId: string,
  userId: string,
): Promise<DocumentRow> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension !== 'pdf' && extension !== 'docx' && extension !== 'txt') {
    throw new Error('Choose a PDF, DOCX, or TXT file.')
  }
  if (file.size > maxFileSize) {
    throw new Error('File must be 20 MB or smaller.')
  }

  const id = crypto.randomUUID()
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_')
  const path = `${userId}/${id}/${safeName}`
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, file, { upsert: false })

  if (uploadError) throw new Error(uploadError.message)

  const { data, error: insertError } = await supabase
    .from('documents')
    .insert({
      id,
      study_space_id: studySpaceId,
      file_name: file.name,
      file_path: path,
      file_type: extension,
      processing_status: 'pending',
    })
    .select()
    .single<DocumentRow>()

  if (insertError) {
    try {
      await supabase.storage.from('documents').remove([path])
    } catch {
      // Keep the original database error if storage cleanup also fails.
    }
    throw new Error(insertError.message)
  }

  return data
}
