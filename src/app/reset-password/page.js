'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { handlePasswordUpdate, checkAuth } from '@/utils/auth'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const { isAuthenticated } = await checkAuth()
      if (!isAuthenticated) {
        router.push('/login')
      }
    }
    checkSession()
  }, [router])

  const onResetPassword = async (e) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    setIsLoading(true)
    setError(null)

    const { success, error, message } = await handlePasswordUpdate(password)
    
    if (success) {
      setSuccess(true)
      setError(null)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } else {
      setError(error)
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center">
      <div className="w-full max-w-sm space-y-8 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--color-fourth)]">Set New Password</h1>
          <p className="text-[var(--color-fourth)]/80 mt-2">
            Please enter your new password below.
          </p>
        </div>

        {success && (
          <div className="bg-[var(--color-tertiary)] text-[var(--color-primary)] p-4 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <p>Password updated successfully! Redirecting to login...</p>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={onResetPassword}>
          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-[var(--color-fourth)] font-medium mb-2">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-3 py-2 bg-[var(--color-secondary)] border-0 rounded-md focus:ring-2 focus:ring-[var(--color-tertiary)]"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-[var(--color-fourth)] font-medium mb-2">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="w-full px-3 py-2 bg-[var(--color-secondary)] border-0 rounded-md focus:ring-2 focus:ring-[var(--color-tertiary)]"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-[var(--color-tertiary)] hover:bg-[var(--color-fourth)] rounded-md text-[var(--color-primary)] font-medium transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 