"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/Dashboard/DashboardHeader"
import { AnalyticsHeader } from "./analytics-header"
import { OverviewStats } from "./overview-stats"
import { MainUsageChart } from "./main-usage-chart"
import { ModalityBreakdown } from "./modality-breakdown"
import { DetailedBreakdownChart } from "./detailed-breakdown-chart"
import { usageData, modalityStats } from "./mock-data"

interface Props {
  userId: string
}

export default function AnalyticsClient({ userId }: Props) {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/login")
    },
  })

  const [isDark, setIsDark] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    setIsDark(savedTheme === "dark" || (!savedTheme && prefersDark))
  }, [])

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }, [isDark])

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <DashboardHeader isDark={isDark} userId={userId} session={session} onSignOut={handleSignOut} />

      <main className="p-6 max-w-7xl mx-auto">
        <AnalyticsHeader />
        <OverviewStats modalityStats={modalityStats} />
        <MainUsageChart data={usageData} isDark={isDark} />
        <ModalityBreakdown stats={modalityStats} />
        <DetailedBreakdownChart data={usageData} isDark={isDark} />
      </main>
    </div>
  )
}
