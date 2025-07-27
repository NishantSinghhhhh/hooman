// app/page.tsx
"use client"

import { useState, useEffect } from "react"
import LoginPage from "@/components/LoginPage/Login"
import { ThemeToggle } from "@/components/Dashboard/ThemeToggle"

export default function Home() {
  const [isDark, setIsDark] = useState(false)

  // Initialize theme on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme = savedTheme === 'dark' || (!savedTheme && prefersDark)
    
    setIsDark(initialTheme)
    
    // Apply theme to document
    if (initialTheme) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // Handle theme toggle
  const handleThemeToggle = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    
    // Update document and localStorage
    if (newTheme) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <div className="font-sans relative">
      {/* Fixed Theme Toggle in top-right corner */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle isDark={isDark} onToggle={handleThemeToggle} />
      </div>
      
      {/* Login Page Content */}
      <LoginPage />
    </div>
  )
}