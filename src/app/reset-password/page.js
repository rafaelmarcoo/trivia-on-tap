'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/utils/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = getSupabase()

  useEffect(() => {
    // Check if we have a session (user clicked the reset link)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      }
    }
    checkSession()
  }, [router, supabase])

  const handleResetPassword = async (e) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })
      
      if (error) throw error
      
      setError(null)
      setSuccess(true)
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center">
      <div className="bg-[var(--color-secondary)] p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-[var(--color-fourth)]">Set New Password</h1>
        
        {success ? (
          <div className="text-green-500 mb-4">
            Password updated successfully! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-[var(--color-fourth)] mb-2">
                New Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 rounded border border-gray-300 bg-[var(--color-third)] text-[var(--color-fourth)]"
                required
                minLength={6}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="confirmPassword" className="block text-[var(--color-fourth)] mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2 rounded border border-gray-300 bg-[var(--color-third)] text-[var(--color-fourth)]"
                required
                minLength={6}
              />
            </div>
            
            {error && (
              <div className="text-red-500 mb-4">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full bg-[var(--color-fourth)] text-[var(--color-primary)] py-2 rounded hover:bg-opacity-90 transition-colors"
            >
              Update Password
            </button>
          </form>
        )}
      </div>
    </div>
  )
} 