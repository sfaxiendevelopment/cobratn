import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Only the public/anon key is exposed to the frontend.
// Service-role keys must NEVER be used in the browser.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  productImages: 'product-images',
  siteAssets: 'site-assets',
}

export function storageUrl(bucket, path) {
  if (!path) return ''
  if (path.startsWith('http') || path.startsWith('/')) return path
  return supabase?.storage.from(bucket).getPublicUrl(path).data.publicUrl || path
}

export async function uploadToStorage(bucket, path, file) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })
  if (error) throw error
  return storageUrl(bucket, path)
}

export async function deleteFromStorage(bucket, path) {
  if (!supabase) return
  if (!path || path.startsWith('http') || path.startsWith('/')) return
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) console.error('storage delete failed', error)
}