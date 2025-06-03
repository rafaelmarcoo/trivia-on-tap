import { createBrowserClient } from '@supabase/ssr'
import { useEffect } from 'react'

export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

// Create a singleton instance
let supabase;
export const getSupabase = () => {
  if (!supabase) {
    supabase = createClient();
  }
  return supabase
}

export const useAutoLogout = (options = {}) => {
  const {
    enabled = true,
    inactivityTimeout = 30 * 60 * 1000, // 30 minutes
    onLogout = () => {}
  } = options

  useEffect(() => {
    if (!enabled) return

    let inactivityTimer

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(async () => {
        try {
          const supabase = getSupabase()
          await supabase.auth.signOut()
          onLogout()
        } catch (error) {
          console.error('Error during auto logout:', error)
        }
      }, inactivityTimeout)
    }

    // Reset timer on user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer)
    })

    // Initial timer setup
    resetTimer()

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer)
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer)
      })
    }
  }, [enabled, inactivityTimeout, onLogout])
}

export default getSupabase;