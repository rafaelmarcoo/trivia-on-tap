'use client'
import { useState } from 'react'
import Link from 'next/link'
import { handlePasswordReset } from '@/utils/auth'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const onResetPassword = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { success, error, message } = await handlePasswordReset(email)
    
    if (success) {
      setSuccess(true)
      setError(null)
    } else {
      setError(error)
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center">
      <div className="w-full max-w-sm space-y-8 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--color-fourth)]">Reset Password</h1>
          <p className="text-[var(--color-fourth)]/80 mt-2">
            Enter your email address and we&apos;ll send you instructions to reset your password.
          </p>
        </div>

        {success && (
          <div className="bg-[var(--color-tertiary)] text-[var(--color-primary)] p-4 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <p>Password reset instructions have been sent to your email.</p>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={onResetPassword}>
          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-[var(--color-fourth)] font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 bg-[var(--color-secondary)] border-0 rounded-md focus:ring-2 focus:ring-[var(--color-tertiary)]"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-[var(--color-tertiary)] hover:bg-[var(--color-fourth)] rounded-md text-[var(--color-primary)] font-medium transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending...' : 'Send Reset Instructions'}
            </button>
          </div>
        </form>

        <div className="text-center text-sm">
          <Link href="/login" className="text-[var(--color-tertiary)] hover:text-[var(--color-fourth)] transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
} 