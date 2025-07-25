"use client"

import { useState, useEffect } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession()
      if (session) {
        const userId = (session as any)?.userId
        if (userId && !searchParams.get('force')) {
          // Only auto-redirect if not forced to login page
          router.push(`/dashboard/${userId}`)
        }
      }
    }
    checkSession()
  }, [router, searchParams])

  // Handle theme toggle
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDark(savedTheme === 'dark' || (!savedTheme && prefersDark))
  }, [])

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (isSignUp) {
      // Sign Up Logic
      if (!email || !password || !confirmPassword || !firstName || !lastName) {
        setError("Please fill all fields.")
        setLoading(false)
        return
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.")
        setLoading(false)
        return
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters long.")
        setLoading(false)
        return
      }

      try {
        // Register user with your backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            firstName,
            lastName,
          }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          // Auto sign in after successful registration
          const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
          })

          if (result?.error) {
            setError("Registration successful but login failed. Please try logging in.")
          } else {
            // Get user ID from registration response and redirect to user dashboard
            const userId = data.data.user.id
            router.push(`/dashboard/${userId}`)
          }
        } else {
          setError(data.error || "Registration failed")
        }
      } catch (error) {
        setError("An error occurred during registration")
      }
    } else {
      // Sign In Logic
      if (!email || !password) {
        setError("Please fill all fields.")
        setLoading(false)
        return
      }

      try {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        })

        if (result?.error) {
          setError("Invalid credentials")
        } else {
          // After successful login, get user session and redirect to user dashboard
          const session = await getSession()
          const userId = (session as any)?.userId
          if (userId) {
            router.push(`/dashboard/${userId}`)
          } else {
            router.push("/dashboard") // Fallback
          }
        }
      } catch (error) {
        setError("An error occurred during login")
      }
    }
    
    setLoading(false)
  }

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setFirstName("")
    setLastName("")
    setError("")
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    resetForm()
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white' 
        : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900'
    } flex items-center justify-center p-4`}>
      
      {/* Access Denied Notice */}
      {searchParams.get('callbackUrl') && (
        <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 p-4 rounded-lg border ${
          isDark 
            ? 'bg-blue-900/20 border-blue-700 text-blue-300' 
            : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <p className="text-sm">Please log in to access the dashboard</p>
        </div>
      )}
      
      {/* Theme Toggle Button */}
      <button
        onClick={() => setIsDark(!isDark)}
        className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${
          isDark 
            ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
            : 'bg-white hover:bg-gray-50 text-gray-600'
        } shadow-lg`}
        aria-label="Toggle theme"
      >
        {isDark ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      <div className="w-full max-w-md space-y-6">
        {/* Logo/Brand Area */}
        <div className="text-center space-y-2">
          <div className={`mx-auto w-12 h-12 rounded-lg flex items-center justify-center ${
            isDark ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'
          }`}>
            <span className="font-bold text-xl">AI</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {isSignUp ? 'Enter your details to get started' : 'Sign in to your account'}
          </p>
        </div>

        {/* Main Card */}
        <div className={`rounded-lg shadow-lg border ${
          isDark 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        } p-6`}>
          
          <div className="text-center space-y-1 mb-6">
            <h2 className="text-xl font-semibold">{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {isSignUp 
                ? 'Join thousands of users already using our platform' 
                : 'Enter your credentials to access your account'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Name Fields (Sign Up Only) */}
            {isSignUp && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className={`block text-sm font-medium ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    First name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    className={`w-full h-11 px-3 rounded-lg border transition-colors ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      isDark ? 'focus:ring-gray-400' : 'focus:ring-gray-900'
                    }`}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    required={isSignUp}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className={`block text-sm font-medium ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Last name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    className={`w-full h-11 px-3 rounded-lg border transition-colors ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      isDark ? 'focus:ring-gray-400' : 'focus:ring-gray-900'
                    }`}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className={`block text-sm font-medium ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                className={`w-full h-11 px-3 rounded-lg border transition-colors ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isDark ? 'focus:ring-gray-400' : 'focus:ring-gray-900'
                }`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className={`block text-sm font-medium ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={`w-full h-11 px-3 pr-10 rounded-lg border transition-colors ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isDark ? 'focus:ring-gray-400' : 'focus:ring-gray-900'
                  }`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                    isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {isSignUp && (
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Must be at least 6 characters long
                </p>
              )}
            </div>

            {/* Confirm Password Field (Sign Up Only) */}
            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className={`block text-sm font-medium ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    className={`w-full h-11 px-3 pr-10 rounded-lg border transition-colors ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      isDark ? 'focus:ring-gray-400' : 'focus:ring-gray-900'
                    }`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    minLength={6}
                    required={isSignUp}
                  />
                  <button
                    type="button"
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                      isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full h-11 rounded-lg font-medium transition-colors ${
                isDark 
                  ? 'bg-white text-gray-900 hover:bg-gray-100 disabled:bg-gray-600' 
                  : 'bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isDark ? 'focus:ring-white' : 'focus:ring-gray-900'
              } disabled:cursor-not-allowed`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isSignUp ? 'Creating account...' : 'Signing in...'}
                </div>
              ) : (
                isSignUp ? 'Create account' : 'Sign in'
              )}
            </button>
          </form>

          {/* Toggle Mode Link */}
          <div className="mt-6 text-center">
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{" "}
              <button
                onClick={toggleMode}
                className={`font-medium hover:underline ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        {isSignUp && (
          <div className="text-center">
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              By creating an account, you agree to our{" "}
              <a href="/terms" className={`underline hover:no-underline ${
                isDark ? 'hover:text-gray-300' : 'hover:text-gray-700'
              }`}>
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className={`underline hover:no-underline ${
                isDark ? 'hover:text-gray-300' : 'hover:text-gray-700'
              }`}>
                Privacy Policy
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}