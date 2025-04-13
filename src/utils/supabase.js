import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Create a singleton instance
let supabase
export const getSupabase = () => {
  if (!supabase) {
    supabase = createClient()
  }
  return supabase
} 