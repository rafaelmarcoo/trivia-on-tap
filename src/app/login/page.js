'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { handleLogin } from '@/utils/auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const onLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { success, error } = await handleLogin(email, password, router)
    
    if (!success) {
      setError(error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-amber-200/30 to-amber-300/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-amber-200/30 to-amber-300/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-amber-100/20 to-amber-200/20 rounded-full blur-3xl"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Header section */}
          <div className="text-center space-y-6 mb-8 mt-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-amber-400 to-amber-500 rounded-3xl shadow-2xl mb-4">
              <span className="text-3xl">🍺</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
                Trivia on Tap
              </h1>
              <p className="text-amber-700 text-lg font-medium mt-2">
                Have a beer, have a trivia! 🧠✨
              </p>
            </div>
          </div>

          {/* Login form */}
          <div className="bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-amber-200/50">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-amber-800">Welcome Back!</h2>
              <p className="text-amber-600 mt-1">Sign in to continue your trivia journey</p>
            </div>

            <form className="space-y-6" onSubmit={onLogin}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm text-center shadow-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-amber-800 font-semibold mb-3">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full px-4 py-4 bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200/50 rounded-2xl focus:ring-4 focus:ring-amber-200/50 focus:border-amber-300 transition-all duration-300 text-amber-800 placeholder-amber-500 shadow-inner"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-amber-800 font-semibold mb-3">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="w-full px-4 py-4 bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200/50 rounded-2xl focus:ring-4 focus:ring-amber-200/50 focus:border-amber-300 transition-all duration-300 text-amber-800 placeholder-amber-500 shadow-inner"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="flex justify-end">
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-amber-600 hover:text-amber-800 transition-colors duration-200 font-medium hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 rounded-2xl text-white font-bold text-lg shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border-2 border-amber-300/50"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Signing you in...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <span>🚀</span>
                      Sign In
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 mb-5">
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-amber-200/50">
              <span className="text-amber-700 font-medium">New to Trivia on Tap? </span>
              <Link 
                href="/register" 
                className="text-amber-600 hover:text-amber-800 transition-colors duration-200 font-bold hover:underline"
              >
                Create your account now! 🎯
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 