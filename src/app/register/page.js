'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/utils/supabase'

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const router = useRouter()
  const supabase = getSupabase()

  const handleRegister = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          }
        }
      })
      
      if (error) throw error
      
      // Force a router refresh to update the session
      router.refresh()
      router.push('/dashboard')
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-[var(--color-primary)]">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--color-fourth)]">Join TriviaOnTap</h1>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-[var(--color-fourth)] font-medium mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="w-full px-3 py-2 bg-[var(--color-secondary)] border-0 rounded-md focus:ring-2 focus:ring-[var(--color-tertiary)]"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

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
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[var(--color-fourth)] font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-3 py-2 bg-[var(--color-secondary)] border-0 rounded-md focus:ring-2 focus:ring-[var(--color-tertiary)]"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-[var(--color-fourth)] font-medium mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="w-full px-3 py-2 bg-[var(--color-secondary)] border-0 rounded-md focus:ring-2 focus:ring-[var(--color-tertiary)]"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-[var(--color-tertiary)] hover:bg-[var(--color-fourth)] rounded-md text-[var(--color-primary)] font-medium transition-all duration-300 transform hover:scale-[1.02]"
            >
              Sign up
            </button>
          </div>
        </form>

        <div className="text-center text-sm">
          <span className="text-[var(--color-fourth)]/80">Already have an account? </span>
          <Link href="/login" className="text-[var(--color-tertiary)] hover:text-[var(--color-fourth)] transition-colors">
            Log in now!
          </Link>
        </div>
      </div>
    </div>
  )
} 