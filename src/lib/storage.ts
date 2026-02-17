import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

let _supabase: SupabaseClient | null = null

function hasSupabaseConfig(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error("Supabase URL and Service Role Key must be configured in environment variables")
    }
    _supabase = createClient(url, key)
  }
  return _supabase
}

const BUCKET = "documents"
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads")

function ensureLocalDir(filePath: string) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export async function uploadFile(
  file: Buffer,
  storagePath: string,
  contentType: string
): Promise<string> {
  // Use Supabase when configured, local filesystem as fallback
  if (hasSupabaseConfig()) {
    const supabase = getSupabase()
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType, upsert: false })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
    return urlData.publicUrl
  }

  // Local filesystem fallback
  const localPath = path.join(LOCAL_UPLOAD_DIR, storagePath)
  ensureLocalDir(localPath)
  fs.writeFileSync(localPath, file)
  return `/uploads/${storagePath.replace(/\\/g, "/")}`
}

export async function deleteFile(storagePath: string): Promise<void> {
  if (hasSupabaseConfig()) {
    const supabase = getSupabase()
    const { error } = await supabase.storage.from(BUCKET).remove([storagePath])
    if (error) {
      throw new Error(`Delete failed: ${error.message}`)
    }
    return
  }

  // Local filesystem fallback
  const localPath = path.join(LOCAL_UPLOAD_DIR, storagePath)
  if (fs.existsSync(localPath)) {
    fs.unlinkSync(localPath)
  }
}
