'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { handleRegister } from '@/utils/auth'

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const onRegister = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    setIsLoading(true)
    setError(null)

    const { success, error, message } = await handleRegister(email, password, username, router)
    
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-amber-200/30 to-amber-300/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-amber-200/30 to-amber-300/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-amber-100/20 to-amber-200/20 rounded-full blur-3xl"></div>
      </div>

      {/* Success notification */}
      {success && (
        <div className="fixed top-8 right-8 z-50 bg-gradient-to-r from-green-400 to-green-500 text-white p-6 rounded-3xl shadow-2xl transform transition-all duration-500 animate-pulse max-w-md">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-bold">Registration Successful! 🎉</p>
              <p className="text-sm opacity-90">Please check your email to confirm your account.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          {/* Header section */}
          <div className="text-center space-y-6 mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-amber-400 to-amber-500 rounded-3xl shadow-2xl mb-4">
              <span className="text-3xl">🎯</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
                Join the Fun!
              </h1>
              <p className="text-amber-700 text-lg font-medium mt-2">
                Create your Trivia on Tap account 🚀
              </p>
            </div>
          </div>

          {/* Registration form */}
          <div className="bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-amber-200/50">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-amber-800">Start Your Journey</h2>
              <p className="text-amber-600 mt-1">Fill in your details to get started</p>
            </div>

            <form className="space-y-5" onSubmit={onRegister}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm text-center shadow-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-amber-800 font-semibold mb-3">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="w-full px-4 py-4 bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200/50 rounded-2xl focus:ring-4 focus:ring-amber-200/50 focus:border-amber-300 transition-all duration-300 text-amber-800 placeholder-amber-500 shadow-inner"
                    placeholder="Choose a unique username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

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
                    placeholder="Enter your email address"
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
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-amber-800 font-semibold mb-3">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className="w-full px-4 py-4 bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200/50 rounded-2xl focus:ring-4 focus:ring-amber-200/50 focus:border-amber-300 transition-all duration-300 text-amber-800 placeholder-amber-500 shadow-inner"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-2xl text-white font-bold text-lg shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border-2 border-amber-400/50"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Creating your account...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <span>🎉</span>
                      Create Account
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-amber-200/50">
              <span className="text-amber-700 font-medium">Already have an account? </span>
              <Link 
                href="/login" 
                className="text-amber-600 hover:text-amber-800 transition-colors duration-200 font-bold hover:underline"
              >
                Sign in here! 🔑
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 