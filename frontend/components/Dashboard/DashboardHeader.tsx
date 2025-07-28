"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Menu, X } from "lucide-react"
// import { ThemeToggle } from "./ThemeToggle"

interface DashboardHeaderProps {
  isDark: boolean
  userId: string
  session: any
  onSignOut: () => void
  onThemeToggle?: () => void // Add optional theme toggle prop
}

export function DashboardHeader({ isDark, userId, session, onSignOut, onThemeToggle }: DashboardHeaderProps) {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleNavigation = (path: string) => {
    console.log(`Navigating to: ${path}`)
    router.push(path)
    setIsMobileMenuOpen(false) // Close mobile menu after navigation
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleThemeToggle = () => {
    if (onThemeToggle) {
      onThemeToggle()
    } else {
      // Fallback theme toggle if no prop provided
      const newTheme = !isDark
      if (newTheme) {
        document.documentElement.classList.add("dark")
        localStorage.setItem("theme", "dark")
      } else {
        document.documentElement.classList.remove("dark")
        localStorage.setItem("theme", "light")
      }
    }
  }

  return (
    <header className={`shadow-lg transition-colors ${isDark ? "bg-gray-800 border-gray-700" : "bg-white"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 lg:py-6">
          {/* Left: Logo and Title */}
          <button
            onClick={() => handleNavigation(`/dashboard/${userId}`)}
            className="flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-lg p-2 -ml-2"
          >
            <div className="flex items-center">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mr-3 sm:mr-4 ${
                  isDark ? "bg-white text-gray-900" : "bg-gray-900 text-white"
                }`}
              >
                <span className="font-bold text-sm sm:text-lg">AI</span>
              </div>
              <div>
                <h1
                  className={`text-lg sm:text-xl lg:text-2xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  <span className="hidden sm:inline">Multimodal AI Dashboard</span>
                  <span className="sm:hidden">AI Dashboard</span>
                </h1>
              </div>
            </div>
          </button>

          {/* Desktop Navigation - Hidden below 1024px */}
          <nav className="hidden lg:flex space-x-8">
            <button
              className={`text-lg font-medium transition-colors hover:scale-105 ${
                isDark ? "text-white hover:text-gray-300" : "text-gray-900 hover:text-gray-700"
              }`}
              onClick={() => handleNavigation(`/chats/${userId}`)}
            >
              Show All Chats
            </button>
            <button
              className={`text-lg font-medium transition-colors hover:scale-105 ${
                isDark ? "text-white hover:text-gray-300" : "text-gray-900 hover:text-gray-700"
              }`}
              onClick={() => handleNavigation(`/analytics/${userId}`)}
            >
              Analytics
            </button>
          </nav>

          {/* Right: User info, Theme Toggle, and Sign Out - Desktop (Hidden below 1024px) */}
          <div className="hidden lg:flex items-center space-x-4">
            <div className="text-right">
              <p className={`text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Logged in as:</p>
              <p className={`font-medium text-sm ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                <span className="hidden xl:inline">
                  {session.user?.name} (ID: {userId})
                </span>
                <span className="xl:hidden">{session.user?.name}</span>
              </p>
            </div>
            {/* Theme Toggle for Desktop */}
            {/* <ThemeToggle isDark={isDark} onToggle={handleThemeToggle} /> */}
            <button
              onClick={onSignOut}
              className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-medium transition-all hover:scale-105 text-sm sm:text-base ${
                isDark ? "bg-white text-gray-900 hover:bg-gray-100" : "bg-gray-900 text-white hover:bg-gray-800"
              }`}
            >
              Sign Out
            </button>
          </div>

          {/* Mobile menu button and Theme Toggle - Shown below 1024px */}
          <div className="lg:hidden mr-12 flex items-center space-x-2">
            {/* Theme Toggle for Mobile (always visible below 1024px) */}
            {/* <ThemeToggle isDark={isDark} onToggle={handleThemeToggle} /> */}
            <button
              onClick={toggleMobileMenu}
              className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                isDark ? "text-white hover:bg-gray-700" : "text-gray-900 hover:bg-gray-100"
              }`}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu - Shown below 1024px */}
        <div
          className={`lg:hidden transition-all duration-300 ease-in-out ${
            isMobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 overflow-hidden"
          }`}
        >
          <div className={`border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
            <div className="py-4 space-y-2">
              {/* Mobile Navigation Links */}
              <button
                className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "text-white hover:bg-gray-700 active:bg-gray-600"
                    : "text-gray-900 hover:bg-gray-100 active:bg-gray-200"
                }`}
                onClick={() => handleNavigation(`/chats/${userId}`)}
              >
                📱 Show All Chats
              </button>
              <button
                className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "text-white hover:bg-gray-700 active:bg-gray-600"
                    : "text-gray-900 hover:bg-gray-100 active:bg-gray-200"
                }`}
                onClick={() => handleNavigation(`/analytics/${userId}`)}
              >
                📊 Analytics
              </button>

              {/* Mobile User Info and Sign Out */}
              <div className={`mt-4 pt-4 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                <div className="px-4 mb-4">
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Logged in as:</p>
                  <p className={`font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>{session.user?.name}</p>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>ID: {userId}</p>
                </div>
                <div className="px-4">
                  <button
                    onClick={onSignOut}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                      isDark
                        ? "bg-white text-gray-900 hover:bg-gray-100 active:bg-gray-200"
                        : "bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-700"
                    }`}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
