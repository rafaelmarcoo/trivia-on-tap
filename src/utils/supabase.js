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

export const useAutoLogout = () => {
  useEffect(() => {
    const handleBeforeUnload = async () => {
      try {
        const supabase = getSupabase()
        await supabase.auth.signOut()
      } catch (error) {
        console.error('Error during auto logout:', error)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])
}

export default getSupabase 