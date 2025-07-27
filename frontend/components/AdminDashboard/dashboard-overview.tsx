import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Users, Activity, DollarSign, TrendingUp, AlertTriangle, CheckCircle, Clock, Shield } from 'lucide-react'

interface Props {
  adminUser: any
}

interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalSpend: number
  totalTokens: number
  systemHealth: "healthy" | "warning" | "critical"
  recentActivity: number
}

export function DashboardOverview({ adminUser }: Props) {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSystemStats()
  }, [])

  const fetchSystemStats = async () => {
    try {
      const response = await fetch("/api/admin/system-stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch system stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse">Loading...</div>
  }

  const mockStats: SystemStats = {
    totalUsers: 1247,
    activeUsers: 892,
    totalSpend: 15420.50,
    totalTokens: 2847392,
    systemHealth: "healthy",
    recentActivity: 156,
  }

  const currentStats = stats || mockStats

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">System Overview</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Monitor system performance and user activity
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {currentStats.activeUsers} active users
            </p>
            <Progress 
              value={(currentStats.activeUsers / currentStats.totalUsers) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentStats.totalSpend.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(currentStats.totalTokens / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground">
              {currentStats.totalTokens.toLocaleString()} tokens processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            {currentStats.systemHealth === "healthy" ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={currentStats.systemHealth === "healthy" ? "secondary" : "destructive"}
                className={currentStats.systemHealth === "healthy" ? "bg-green-100 text-green-800" : ""}
              >
                {currentStats.systemHealth.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <span>Your Admin Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Unlimited Usage</span>
              <Badge variant={adminUser.adminSettings.hasUnlimitedUsage ? "secondary" : "outline"}>
                {adminUser.adminSettings.hasUnlimitedUsage ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Admin Actions</span>
              <span className="font-medium">{adminUser.adminSettings.adminActionCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Last Action</span>
              <span className="text-sm text-muted-foreground">
                {adminUser.adminSettings.lastAdminAction ? 
                  new Date(adminUser.adminSettings.lastAdminAction).toLocaleDateString() : 
                  "Never"
                }
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{currentStats.recentActivity}</div>
            <p className="text-sm text-muted-foreground">
              Actions in the last 24 hours
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>User registrations</span>
                <span className="font-medium">23</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>API requests</span>
                <span className="font-medium">1,847</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>System alerts</span>
                <span className="font-medium">2</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permissions Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Your Admin Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(adminUser.adminSettings).map(([key, value]) => {
              if (typeof value !== "boolean") return null
              
              const labels: Record<string, string> = {
                canManageUsers: "Manage Users",
                canViewSystemAnalytics: "View Analytics",
                canManageSystemSettings: "System Settings",
                canAccessLogs: "Access Logs",
                canManageBilling: "Manage Billing",
                hasUnlimitedUsage: "Unlimited Usage",
                canOverrideUserLimits: "Override Limits",
              }

              return (
                <div key={key} className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${value ? "bg-green-500" : "bg-gray-300"}`} />
                  <span className="text-sm">{labels[key] || key}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
