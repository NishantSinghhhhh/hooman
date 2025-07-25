"use client"

import type React from "react"

import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { DashboardHeader } from "./DashboardHeader"
import { QuerySubmission } from "./QuerySubmission"
import { QueryHistory } from "./QueryHistory"
import { ThemeToggle } from "./ThemeToggle"
import { LoadingScreen } from "./LoadingScreen"
import { ErrorScreen } from "./ErrorScreen"
import { useTheme } from "../../hooks/useTheme"
import type { UserData, QueryHistory as QueryHistoryType } from "./types"

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  const { isDark, toggleTheme } = useTheme()

  // States
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [queryHistory, setQueryHistory] = useState<QueryHistoryType[]>([])

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
      return
    }

    const sessionUserId = (session as any)?.userId
    if (sessionUserId !== userId) {
      setError("You can only access your own dashboard")
      setLoading(false)
      return
    }

    fetchUserData()
    fetchQueryHistory()
  }, [session, status, router, userId])

  const fetchUserData = async () => {
    try {
      const token = (session as any)?.backendToken
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/user/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (response.ok) {
        const data = await response.json()
        setUserData(data.user)
      } else {
        setUserData({
          id: userId,
          email: session?.user?.email || "",
          firstName: session?.user?.name?.split(" ")[0] || "",
          lastName: session?.user?.name?.split(" ")[1] || "",
          role: "user",
        })
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      setUserData({
        id: userId,
        email: session?.user?.email || "",
        firstName: session?.user?.name?.split(" ")[0] || "",
        lastName: session?.user?.name?.split(" ")[1] || "",
        role: "user",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchQueryHistory = async () => {
    try {
      const token = (session as any)?.backendToken
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/queries/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (response.ok) {
        const data = await response.json()
        setQueryHistory(data.queries || [])
      }
    } catch (error) {
      console.error("Error fetching query history:", error)
    }
  }

  const addQueryToHistory = (query: QueryHistoryType) => {
    setQueryHistory((prev) => [query, ...prev])
  }

  const updateQueryInHistory = (queryId: string, updates: Partial<QueryHistoryType>) => {
    setQueryHistory((prev) => prev.map((q) => (q.id === queryId ? { ...q, ...updates } : q)))
  }

  if (status === "loading" || loading) {
    return <LoadingScreen isDark={isDark} />
  }

  if (!session) {
    return null
  }

  if (error) {
    return <ErrorScreen error={error} isDark={isDark} onGoBack={() => router.push("/dashboard")} />
  }

  return (
    <div className={`min-h-screen transition-colors ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
      
      <DashboardHeader 
        isDark={isDark} 
        userId={userId} 
        session={session} 
        onSignOut={() => router.push("/logout")} 
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-8">
          <QuerySubmission
            isDark={isDark}
            userId={userId}
            session={session}
            onQueryAdded={addQueryToHistory}
            onQueryUpdated={updateQueryInHistory}
          />
          
          <QueryHistory isDark={isDark} queryHistory={queryHistory} />
        </div>
      </main>
    </div>
  )
}
