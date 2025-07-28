"use client"

import { useState } from "react"
import { AdminHeader } from "./admin-header"
import { AdminSidebar } from "./admin-sidebar"
import { DashboardOverview } from "./dashboard-overview"
import { UserManagement } from "./user-management"
import { SystemAnalytics } from "./system-analytics"
import { SystemSettings } from "./system-settings"
import { SystemLogs } from "./system-logs"
import { BillingManagement } from "./billing-management"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield } from "lucide-react"

interface AdminUser {
  _id: string
  email: string
  firstName: string
  lastName: string
  role: "admin"
  adminSettings: {
    canManageUsers: boolean
    canViewSystemAnalytics: boolean
    canManageSystemSettings: boolean
    canAccessLogs: boolean
    canManageBilling: boolean
    hasUnlimitedUsage: boolean
    canOverrideUserLimits: boolean
    adminActionCount: number
    lastAdminAction?: string
  }
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(false)

  // Mock admin user with full permissions for demo
  const mockAdminUser: AdminUser = {
    _id: "admin_123",
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    role: "admin",
    adminSettings: {
      canManageUsers: true,
      canViewSystemAnalytics: true,
      canManageSystemSettings: true,
      canAccessLogs: true,
      canManageBilling: true,
      hasUnlimitedUsage: true,
      canOverrideUserLimits: true,
      adminActionCount: 45,
      lastAdminAction: "2025-01-27T10:30:00Z",
    },
  }

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <DashboardOverview adminUser={mockAdminUser} />
      case "users":
        return <UserManagement adminUser={mockAdminUser} />
      case "analytics":
        return <SystemAnalytics adminUser={mockAdminUser} />
      case "settings":
        return <SystemSettings adminUser={mockAdminUser} />
      case "logs":
        return <SystemLogs adminUser={mockAdminUser} />
      case "billing":
        return <BillingManagement adminUser={mockAdminUser} />
      default:
        return <DashboardOverview adminUser={mockAdminUser} />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminHeader adminUser={mockAdminUser} />

      <div className="flex">
        <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} permissions={mockAdminUser.adminSettings} />

        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Admin Status Banner */}
            <Alert className="mb-6 border-purple-200 bg-purple-50 dark:bg-purple-900/20">
              <Shield className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-800 dark:text-purple-200">
                Admin Dashboard - You have elevated privileges. Use them responsibly.
              </AlertDescription>
            </Alert>

            {/* Render active content */}
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}
