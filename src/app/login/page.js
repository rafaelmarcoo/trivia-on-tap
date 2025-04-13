'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/utils/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const router = useRouter()
  const supabase = getSupabase()

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
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
    <div className="min-h-screen flex flex-col items-center p-6 bg-white">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-indigo-700">Trivia on Tap</h1>
          <p className="text-gray-600">have a beer have a trivia</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-indigo-700 font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-3 py-2 bg-yellow-50 border-0 rounded-md"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-indigo-700 font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-3 py-2 bg-yellow-50 border-0 rounded-md"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-gray-300 hover:bg-gray-400 rounded-md text-gray-800 font-medium transition-colors"
            >
              Login
            </button>
          </div>
        </form>

        <div className="text-center text-sm">
          <span className="text-gray-600">No account? </span>
          <Link href="/register" className="text-yellow-600 hover:text-yellow-700">
            Sign up now!
          </Link>
        </div>
      </div>
    </div>
  )
} 