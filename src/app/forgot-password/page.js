'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/utils/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = getSupabase()

  const handleResetPassword = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      
      if (error) throw error
      
      setError(null)
      setSuccess(true)
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center">
      <div className="bg-[var(--color-secondary)] p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-[var(--color-fourth)]">Reset Password</h1>
        
        {success ? (
          <div className="text-green-500 mb-4">
            Check your email for the password reset link.
          </div>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-[var(--color-fourth)] mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 rounded border border-gray-300 bg-[var(--color-third)] text-[var(--color-fourth)]"
                required
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
              Send Reset Link
            </button>
          </form>
        )}
        
        <div className="mt-4 text-center">
          <Link href="/login" className="text-[var(--color-fourth)] hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
} 