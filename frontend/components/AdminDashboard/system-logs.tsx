"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Download, AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react"

interface LogEntry {
  id: string
  timestamp: string
  level: "info" | "warning" | "error" | "success"
  category: string
  message: string
  userId?: string
  userEmail?: string
  ipAddress: string
  details?: any
}

interface Props {
  adminUser: any
}

export function SystemLogs({ adminUser }: Props) {
  const [searchTerm, setSearchTerm] = useState("")
  const [levelFilter, setLevelFilter] = useState<string>("all")

  // Enhanced mock logs
  const mockLogs: LogEntry[] = [
    {
      id: "1",
      timestamp: "2025-01-27T10:30:00Z",
      level: "info",
      category: "Authentication",
      message: "User login successful",
      userId: "user123",
      userEmail: "john.doe@example.com",
      ipAddress: "192.168.1.100",
    },
    {
      id: "2",
      timestamp: "2025-01-27T10:25:00Z",
      level: "warning",
      category: "Rate Limiting",
      message: "User approaching monthly token limit",
      userId: "user456",
      userEmail: "jane.smith@example.com",
      ipAddress: "192.168.1.101",
    },
    {
      id: "3",
      timestamp: "2025-01-27T10:20:00Z",
      level: "error",
      category: "API",
      message: "Failed to process video request",
      userId: "user789",
      userEmail: "bob.wilson@example.com",
      ipAddress: "192.168.1.102",
      details: { error: "Timeout after 30 seconds", requestId: "req_abc123" },
    },
    {
      id: "4",
      timestamp: "2025-01-27T10:15:00Z",
      level: "success",
      category: "Admin",
      message: "System settings updated",
      userId: adminUser._id,
      userEmail: adminUser.email,
      ipAddress: "192.168.1.1",
    },
    {
      id: "5",
      timestamp: "2025-01-27T10:10:00Z",
      level: "info",
      category: "User Management",
      message: "New user registered",
      userId: "user999",
      userEmail: "alice.johnson@example.com",
      ipAddress: "192.168.1.105",
    },
    {
      id: "6",
      timestamp: "2025-01-27T10:05:00Z",
      level: "warning",
      category: "Security",
      message: "Multiple failed login attempts detected",
      userEmail: "suspicious@example.com",
      ipAddress: "192.168.1.200",
    },
    {
      id: "7",
      timestamp: "2025-01-27T10:00:00Z",
      level: "error",
      category: "Database",
      message: "Connection timeout to primary database",
      ipAddress: "internal",
    },
    {
      id: "8",
      timestamp: "2025-01-27T09:55:00Z",
      level: "success",
      category: "Billing",
      message: "Payment processed successfully",
      userId: "user456",
      userEmail: "jane.smith@example.com",
      ipAddress: "192.168.1.101",
    },
  ]

  const filteredLogs = mockLogs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.userEmail && log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesLevel = levelFilter === "all" || log.level === levelFilter

    return matchesSearch && matchesLevel
  })

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getLevelBadge = (level: string) => {
    const variants = {
      info: "secondary",
      warning: "outline",
      error: "destructive",
      success: "secondary",
    }
    return variants[level as keyof typeof variants] || "secondary"
  }

  const exportLogs = () => {
    const csvContent = [
      ["Timestamp", "Level", "Category", "Message", "User", "IP Address"].join(","),
      ...filteredLogs.map((log) =>
        [log.timestamp, log.level, log.category, `"${log.message}"`, log.userEmail || "", log.ipAddress].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `system-logs-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">System Logs</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor system activity and troubleshoot issues</p>
        </div>
        <Button onClick={exportLogs}>
          <Download className="mr-2 h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex space-x-2">
              {["all", "info", "warning", "error", "success"].map((level) => (
                <Button
                  key={level}
                  variant={levelFilter === level ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLevelFilter(level)}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>System Logs ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>User</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getLevelIcon(log.level)}
                      <Badge variant={getLevelBadge(log.level) as any}>{log.level.toUpperCase()}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.category}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="truncate" title={log.message}>
                      {log.message}
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.userEmail ? (
                      <div className="text-sm">
                        <div className="font-medium">{log.userEmail}</div>
                        <div className="text-gray-500 font-mono text-xs">{log.userId}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">System</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.ipAddress}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
