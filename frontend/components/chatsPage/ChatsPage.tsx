"use client"

import React, { useState, useEffect } from "react"
import { getSession, signOut } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { DashboardHeader } from "@/components/Dashboard/DashboardHeader"
import type { Session } from "next-auth"
import { ThemeToggle } from "../ThemeToggle/ThemeToggle"
export default function ChatsPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDark, setIsDark] = useState(false)
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  // Check and set user session
  useEffect(() => {
    const checkSession = async () => {
      const userSession = await getSession()
      if (!userSession) {
        router.push('/login')
        return
      }
      setSession(userSession)
      setLoading(false)
    }
    checkSession()
  }, [router])

  // Set theme on mount based on localStorage or prefers-color-scheme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDark(savedTheme === 'dark' || (!savedTheme && prefersDark))
  }, [])

  // Update document class and localStorage when dark mode changes
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  // Handle user sign out
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!session) {
    // Optionally render null or a message while redirecting
    return null
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <DashboardHeader
        isDark={isDark}
        userId={id}
        session={session}
        onSignOut={handleSignOut}
      />
      
      <main className="p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Chats for User {id}</h1>
          <div className={`rounded-lg shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-xl font-semibold mb-4">All Conversations</h2>
            <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Here you can view all chats for user ID: {id}
            </p>
            
            {/* Demo chat list */}
            <div className="space-y-3">
              <div className={`border rounded p-3 transition-colors ${
                isDark 
                  ? 'border-gray-600 hover:bg-gray-700' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <h3 className="font-medium">Chat with AI Assistant</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Last message: 2 hours ago
                </p>
              </div>
              <div className={`border rounded p-3 transition-colors ${
                isDark 
                  ? 'border-gray-600 hover:bg-gray-700' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <h3 className="font-medium">Project Discussion</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Last message: 1 day ago
                </p>
              </div>
              <div className={`border rounded p-3 transition-colors ${
                isDark 
                  ? 'border-gray-600 hover:bg-gray-700' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <h3 className="font-medium">Support Conversation</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Last message: 3 days ago
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
