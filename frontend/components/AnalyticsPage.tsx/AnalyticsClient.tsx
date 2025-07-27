"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/Dashboard/DashboardHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import {
  Calendar,
  Download,
  TrendingUp,
  Video,
  Headphones,
  FileText,
  ImageIcon,
  Activity,
  DollarSign,
} from "lucide-react"

interface Props {
  userId: string
}

// Mock data for demonstration
const usageData = [
  { date: "Jul 12", video: 45, audio: 32, docs: 28, image: 15, total: 120 },
  { date: "Jul 15", video: 52, audio: 38, docs: 35, image: 22, total: 147 },
  { date: "Jul 18", video: 38, audio: 45, docs: 42, image: 18, total: 143 },
  { date: "Jul 21", video: 65, audio: 28, docs: 38, image: 25, total: 156 },
  { date: "Jul 24", video: 48, audio: 55, docs: 32, image: 28, total: 163 },
  { date: "Jul 27", video: 72, audio: 42, docs: 45, image: 35, total: 194 },
]

const modalityStats = [
  {
    name: "Video Tokens",
    value: "45.2K",
    change: "+12.5%",
    icon: Video,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    requests: 156,
    trend: [20, 25, 30, 28, 35, 45],
  },
  {
    name: "Audio Tokens",
    value: "32.8K",
    change: "+8.3%",
    icon: Headphones,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    requests: 124,
    trend: [15, 20, 18, 25, 30, 32],
  },
  {
    name: "Document Tokens",
    value: "28.5K",
    change: "+15.2%",
    icon: FileText,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    requests: 89,
    trend: [10, 15, 20, 22, 25, 28],
  },
  {
    name: "Image Tokens",
    value: "18.9K",
    change: "+5.7%",
    icon: ImageIcon,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    requests: 67,
    trend: [8, 12, 15, 16, 18, 19],
  },
]

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

  const totalTokens = modalityStats.reduce(
    (sum, stat) => sum + Number.parseFloat(stat.value.replace("K", "")) * 1000,
    0,
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <DashboardHeader isDark={isDark} userId={userId} session={session} onSignOut={handleSignOut} />

      <main className="p-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Usage Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Track your API usage across different modalities</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1">
              <Calendar className="w-4 h-4 mr-2" />
              Jul 12 - Jul 27, 2025
            </Badge>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Spend</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">$0.55</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <span>Budget: $0.63 / $120</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: "0.5%" }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tokens</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{(totalTokens / 1000).toFixed(1)}K</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex items-center mt-4 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-500 font-medium">+12.5%</span>
                <span className="text-gray-600 dark:text-gray-400 ml-1">vs last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">436</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="flex items-center mt-4 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-500 font-medium">+8.3%</span>
                <span className="text-gray-600 dark:text-gray-400 ml-1">this week</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Daily Usage</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">8.2K</p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="flex items-center mt-4 text-sm">
                <span className="text-gray-600 dark:text-gray-400">tokens per day</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Usage Chart */}
        <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 mb-8">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Usage Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Bar dataKey="total" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Modality Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {modalityStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index} className="border-0 shadow-sm bg-white dark:bg-gray-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                        <Icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-gray-900 dark:text-white">{stat.name}</CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{stat.requests} requests</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-green-600 bg-green-50 dark:bg-green-900/20">
                      {stat.change}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stat.value}</p>
                      <div className="h-16 w-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={stat.trend.map((value, i) => ({ value, index: i }))}>
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke={
                                stat.color.includes("purple")
                                  ? "#8B5CF6"
                                  : stat.color.includes("blue")
                                    ? "#3B82F6"
                                    : stat.color.includes("green")
                                      ? "#10B981"
                                      : "#F59E0B"
                              }
                              fill={
                                stat.color.includes("purple")
                                  ? "#8B5CF6"
                                  : stat.color.includes("blue")
                                    ? "#3B82F6"
                                    : stat.color.includes("green")
                                      ? "#10B981"
                                      : "#F59E0B"
                              }
                              fillOpacity={0.2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Detailed Breakdown */}
        <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Usage by Modality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Bar dataKey="video" stackId="a" fill="#8B5CF6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="audio" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="docs" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="image" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Video</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Audio</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Documents</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Images</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
