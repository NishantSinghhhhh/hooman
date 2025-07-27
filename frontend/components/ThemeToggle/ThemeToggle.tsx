// components/ThemeToggle.tsx
"use client"

import { Moon, Sun } from "lucide-react"

interface ThemeToggleProps {
  isDark: boolean
  onToggle: () => void
}

export function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`p-2 rounded-lg transition-all duration-200 shadow-lg hover:scale-105 ${
        isDark 
          ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400 border border-gray-700' 
          : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200'
      }`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Sun size={20} className="transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon size={20} className="transition-transform duration-200 hover:-rotate-12" />
      )}
    </button>
  )
}