"use client"

import { useState, useEffect } from "react"
import { getSession, signOut } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { DashboardHeader } from "@/components/Dashboard/DashboardHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileText,
  ImageIcon,
  Volume2,
  Video,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  RefreshCw,
  Eye,
  Copy,
} from "lucide-react"
import type { Session } from "next-auth"

export interface BackendItem {
  queryId: string
  timestamp: string
  agentType: "document" | "image" | "audio" | "video"
  classification: string
  status: "completed" | "processing" | "error"
  confidence: number
  priority: "high" | "medium" | "low"
  reasoning: string
  processingTime: number
  error: string | null
  query: string
  tokens: number
  result: Record<string, any>
  metadata: Record<string, any>
  filePath: string
  // Document specific
  documentType?: string
  pageCount?: number
  // Audio specific
  duration?: number
  format?: string
  // Video specific
  fps?: number
  resolution?: string
}

export interface BackendResponse {
  success: boolean
  queries: BackendItem[]
  summary: {
    totalQueries: number
    totalTokens: number
    averageConfidence: number
    queryTypes: Record<string, number>
    statusCounts: Record<string, number>
  }
  error?: string
}

export default function ChatsPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDark, setIsDark] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [backendData, setBackendData] = useState<BackendItem[]>([])
  const [backendSummary, setBackendSummary] = useState<BackendResponse["summary"] | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)
  const [selectedResult, setSelectedResult] = useState<BackendItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  // Check and set user session
  useEffect(() => {
    const checkSession = async () => {
      const userSession = await getSession()
      if (!userSession) {
        router.push("/login")
        return
      }
      setSession(userSession)
      setLoading(false)
    }
    checkSession()
  }, [router])

  // Set theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    setIsDark(savedTheme === "dark" || (!savedTheme && prefersDark))
  }, [])

  // Update document class when dark mode changes
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }, [isDark])

  // Auto-fetch data when session is ready
  useEffect(() => {
    if (session && id && !isFetching && backendData.length === 0) {
      fetchQueryHistory()
    }
  }, [session, id])

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    if (!session || !id) return
    const interval = setInterval(() => {
      if (!isFetching) {
        fetchQueryHistory(true) // Silent refresh
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [session, id, isFetching])

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  // Enhanced fetch query history function
  const fetchQueryHistory = async (silent = false) => {
    if (!session || !id || isFetching) return
    setIsFetching(true)
    if (!silent) {
      setFetchError(null)
    }

    try {
      console.log("🔄 Starting to fetch query history for user:", id)
      const token = (session as any)?.accessToken || (session as any)?.backendToken
      if (!token) {
        throw new Error("No authentication token found")
      }

      console.log("🔑 Using token:", token.substring(0, 20) + "...")

      // Use the correct URL for your API
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/query/history/${id}`
      console.log("🌐 Fetching from URL:", url)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      console.log("📡 Response status:", response.status)

      if (response.ok) {
        const data: BackendResponse = await response.json()
        console.log("✅ Query history fetched successfully!")
        if (data.success && data.queries) {
          setBackendData(data.queries)
          setBackendSummary(data.summary)
          setLastFetchTime(new Date())
          setFetchError(null)
          if (!silent) {
            console.log("📊 Backend Data Summary:", data.summary)
            console.log("🔢 Total queries:", data.queries.length)
            console.log("📋 All queries:", data.queries)
            // Log breakdown by type
            const breakdown = data.queries.reduce(
              (acc, query) => {
                acc[query.agentType] = (acc[query.agentType] || 0) + 1
                return acc
              },
              {} as Record<string, number>,
            )
            console.log("📈 Query breakdown by type:", breakdown)
          }
        } else {
          throw new Error(data.error || "Invalid response format")
        }
      } else {
        const errorData = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorData}`)
      }
    } catch (error) {
      console.error("❌ Error fetching query history:", error)
      if (!silent) {
        setFetchError(error instanceof Error ? error.message : "Unknown error occurred")
      }
    } finally {
      setIsFetching(false)
    }
  }

  // Helper functions for agent chat display
  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case "document":
        return <FileText className="h-5 w-5" />
      case "image":
        return <ImageIcon className="h-5 w-5" />
      case "audio":
        return <Volume2 className="h-5 w-5" />
      case "video":
        return <Video className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800"
      case "low":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      case "processing":
        return <RefreshCw className="h-4 w-4 text-yellow-600 dark:text-yellow-400 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getFileName = (filePath: string) => {
    return filePath.split("/").pop() || "Unknown file"
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed"
      case "error":
        return "Error"
      case "processing":
        return "Processing"
      default:
        return "Unknown"
    }
  }

  const handleCardClick = (item: BackendItem) => {
    setSelectedResult(item)
    setIsModalOpen(true)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatResultData = (result: Record<string, any>) => {
    return JSON.stringify(result, null, 2)
  }

  const renderResultContent = (item: BackendItem) => {
    const { result, agentType } = item

    if (!result || Object.keys(result).length === 0) {
      return <div className="text-center py-8 text-gray-500 dark:text-gray-400">No result data available</div>
    }

    // Parse the result if it's a JSON string
    let parsedResult
    try {
      parsedResult = typeof result === "string" ? JSON.parse(result) : result
    } catch (error) {
      parsedResult = result
    }

    return (
      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="raw">Raw JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="mt-4">
          <ScrollArea className="h-96 w-full rounded-md border p-4">
            {renderAnalysisView(parsedResult, agentType)}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <ScrollArea className="h-96 w-full rounded-md border p-4">
            {renderDetailsView(parsedResult, agentType)}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="raw" className="mt-4">
          <ScrollArea className="h-96 w-full rounded-md border">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(parsedResult, null, 2))}
                className="absolute top-2 right-2 z-10"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <pre className="p-4 text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                {JSON.stringify(parsedResult, null, 2)}
              </pre>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    )
  }

  // Add these new helper functions after the renderResultContent function:

  const renderAnalysisView = (parsedResult: any, agentType: string) => {
    return (
      <div className="space-y-6">
        {/* Primary Analysis */}
        {parsedResult.primary_analysis && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Primary Analysis</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(parsedResult.primary_analysis)}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {parsedResult.primary_analysis}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Response */}
        {parsedResult.enhanced_response && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Enhanced Analysis</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(parsedResult.enhanced_response)}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {formatEnhancedResponse(parsedResult.enhanced_response)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Information */}
        {parsedResult.status && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Processing Status</h3>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              {typeof parsedResult.status === "string" ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-green-800 dark:text-green-200 font-medium capitalize">
                    {parsedResult.status}
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(parsedResult.status).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-green-700 dark:text-green-300 capitalize">{key.replace(/_/g, " ")}:</span>
                      <div className="flex items-center gap-1">
                        {value === "completed" || value === "success" ? (
                          <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                        )}
                        <span className="text-green-800 dark:text-green-200 text-sm">{String(value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderDetailsView = (parsedResult: any, agentType: string) => {
    return (
      <div className="space-y-4">
        {/* Processing Method */}
        {parsedResult.processing_method && (
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">Processing Method</h4>
            <p className="text-purple-700 dark:text-purple-300 text-sm">{parsedResult.processing_method}</p>
          </div>
        )}

        {/* Query Details */}
        {parsedResult.query_details && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">Query Information</h4>
            <div className="space-y-2">
              {Object.entries(parsedResult.query_details).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-blue-700 dark:text-blue-300 text-sm capitalize">{key.replace(/_/g, " ")}:</span>
                  <span className="text-blue-800 dark:text-blue-200 text-sm font-medium">{String(value) || "N/A"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(parsedResult)
            .filter(
              ([key]) =>
                !["primary_analysis", "enhanced_response", "status", "processing_method", "query_details"].includes(
                  key,
                ),
            )
            .map(([key, value]) => (
              <div key={key} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <h5 className="font-medium text-gray-900 dark:text-white text-sm mb-2 capitalize">
                  {key.replace(/_/g, " ")}
                </h5>
                <div className="text-gray-600 dark:text-gray-300 text-xs">
                  {typeof value === "object" ? (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
                  ) : (
                    <p className="break-words">{String(value)}</p>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    )
  }

  const formatEnhancedResponse = (text: string) => {
    // Split by common markdown-like patterns and format them
    const lines = text.split("\n")
    return lines.map((line, index) => {
      // Handle headers (### or ##)
      if (line.startsWith("### ")) {
        return (
          <h4 key={index} className="text-base font-semibold text-gray-900 dark:text-white mt-4 mb-2">
            {line.replace("### ", "")}
          </h4>
        )
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={index} className="text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2">
            {line.replace("## ", "")}
          </h3>
        )
      }

      // Handle bullet points
      if (line.trim().startsWith("- ")) {
        return (
          <li key={index} className="ml-4 text-gray-700 dark:text-gray-300 mb-1">
            {line.replace(/^- /, "")}
          </li>
        )
      }

      // Handle numbered lists
      if (/^\d+\./.test(line.trim())) {
        return (
          <li key={index} className="ml-4 text-gray-700 dark:text-gray-300 mb-1">
            {line.replace(/^\d+\.\s*/, "")}
          </li>
        )
      }

      // Handle bold text (**text**)
      const boldText = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")

      // Regular paragraphs
      if (line.trim()) {
        return (
          <p
            key={index}
            className="text-gray-700 dark:text-gray-300 mb-2 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: boldText }}
          />
        )
      }

      // Empty lines for spacing
      return <br key={index} />
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your data...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <DashboardHeader isDark={isDark} userId={id} session={session} onSignOut={handleSignOut} />

      {/* Stats Bar */}
      {backendSummary && (
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-300">{backendSummary.totalQueries} total queries</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-300">
                  {backendSummary.totalTokens.toLocaleString()} tokens used
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-300">
                  {Math.round(backendSummary.averageConfidence)}% avg confidence
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {lastFetchTime && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Updated {lastFetchTime.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => fetchQueryHistory()}
                disabled={isFetching}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors"
              >
                {isFetching ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {fetchError && (
        <div className="border-b border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-red-800 dark:text-red-200 text-sm">Failed to load data: {fetchError}</span>
            </div>
            <button
              onClick={() => setFetchError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Agent Chat View */}
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Agent Processing Chat</h1>
          <p className="text-gray-600 dark:text-gray-400">Real-time updates from your AI agents</p>
        </div>

        {backendData.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No processed files yet</h3>
            <p className="text-gray-500 dark:text-gray-400">Upload files to see agent processing results here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {backendData.map((item, index) => (
              <Card
                key={item.queryId}
                className="border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800 cursor-pointer hover:border-purple-300 dark:hover:border-purple-600"
                onClick={() => handleCardClick(item)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                        {getAgentIcon(item.agentType)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {item.agentType} Agent
                        </h3>
                        <Badge variant="outline" className={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(item.status)}
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                            {getStatusText(item.status)}
                          </span>
                        </div>
                        <div className="ml-auto">
                          <Eye className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{item.reasoning}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          <span>Confidence: {item.confidence}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Tokens: {item.tokens.toLocaleString()}</span>
                        </div>
                        <div className="col-span-2">
                          {/* <span className="truncate">File: {getFileName(item.filePath)}</span> */}
                        </div>
                      </div>
                      {item.documentType && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Document Type: {item.documentType.toUpperCase()} • Pages: {item.pageCount}
                        </div>
                      )}
                      {item.format && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Format: {item.format.toUpperCase()}
                          {item.duration && ` • Duration: ${item.duration}s`}
                        </div>
                      )}
                      {item.fps && item.resolution && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Resolution: {item.resolution} • FPS: {item.fps}
                        </div>
                      )}
                      {item.error && (
                        <div className="text-xs text-red-600 dark:text-red-400 mb-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                          Error: {item.error}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400">{formatTimestamp(item.timestamp)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Result Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedResult && (
                <>
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                    {getAgentIcon(selectedResult.agentType)}
                  </div>
                  <div>
                    <span className="capitalize">{selectedResult.agentType} Agent Result</span>
                    <div className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      {/* {getFileName(selectedResult.filePath)} */}
                    </div>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedResult && (
            <div className="mt-4">
              {/* Result metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Confidence</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{selectedResult.confidence}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Tokens</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {selectedResult.tokens.toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
                  <div className="flex items-center justify-center gap-1">
                    {getStatusIcon(selectedResult.status)}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {getStatusText(selectedResult.status)}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Priority</div>
                  <Badge variant="outline" className={getPriorityColor(selectedResult.priority)}>
                    {selectedResult.priority}
                  </Badge>
                </div>
              </div>

              {/* Result content File:*/}
              {renderResultContent(selectedResult)}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
