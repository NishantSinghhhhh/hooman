"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"  // import your custom hook
import { AdminHeader } from "./admin-header"
import { AdminSidebar } from "./admin-sidebar"
import { DashboardOverview } from "./dashboard-overview"
import { UserManagement } from "./user-management"
import { SystemAnalytics } from "./system-analytics"
import { SystemSettings } from "./system-settings"
import { SystemLogs } from "./system-logs"
import { BillingManagement } from "./billing-management"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, AlertTriangle } from 'lucide-react'

export default function AdminDashboard() {
    const router = useRouter()
  
    const {
      userInfo,
      isAuthenticated,
      isLoading,
      isAdmin,
      hasPermission
    } = useAuth()
  
    // Redirect if not authenticated / not admin
    useEffect(() => {
      if (!isLoading) {
        if (!isAuthenticated) {
          router.push("/login")
        } else if (!isAdmin) {
          router.push("/dashboard")
        }
      }
    }, [isAuthenticated, isAdmin, isLoading, router])
  
    // **Call hooks before any early returns!**
    const [activeTab, setActiveTab] = useState("overview")
  
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
        </div>
      )
    }
  
    if (!userInfo || !isAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Access denied. Admin privileges required.</AlertDescription>
          </Alert>
        </div>
      )
    }
  
    const adminUser = {
      _id: userInfo.id,
      email: userInfo.email,
      firstName: userInfo.firstName || "",
      lastName: userInfo.lastName || "",
      role: "admin" as const,
      adminSettings: {
        canManageUsers: userInfo.adminSettings?.canManageUsers || false,
        canViewSystemAnalytics: userInfo.adminSettings?.canViewSystemAnalytics || false,
        canManageSystemSettings: userInfo.adminSettings?.canManageSystemSettings || false,
        canAccessLogs: userInfo.adminSettings?.canAccessLogs || false,
        canManageBilling: userInfo.adminSettings?.canManageBilling || false,
        hasUnlimitedUsage: userInfo.adminSettings?.hasUnlimitedUsage || false,
        canOverrideUserLimits: userInfo.adminSettings?.canOverrideUserLimits || false,
        adminActionCount: userInfo.adminSettings?.adminActionCount || 0,
      }
    }
  
    const hasAdminPermission = (permission: keyof typeof adminUser.adminSettings): boolean => {
      return !!adminUser.adminSettings[permission]
    }
  
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminHeader adminUser={adminUser} />
  
        <div className="flex">
          <AdminSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            permissions={adminUser.adminSettings}
          />
  
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              {/* Admin Status Banner */}
              <Alert className="mb-6 border-purple-200 bg-purple-50 dark:bg-purple-900/20">
                <Shield className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-800 dark:text-purple-200">
                  Admin Dashboard - You have elevated privileges. Use them responsibly.
                </AlertDescription>
              </Alert>
  
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="overview">
                  <DashboardOverview adminUser={adminUser} />
                </TabsContent>
  
                {hasAdminPermission("canManageUsers") && (
                  <TabsContent value="users">
                    <UserManagement adminUser={adminUser} />
                  </TabsContent>
                )}
  
                {hasAdminPermission("canViewSystemAnalytics") && (
                  <TabsContent value="analytics">
                    <SystemAnalytics adminUser={adminUser} />
                  </TabsContent>
                )}
  
                {hasAdminPermission("canManageSystemSettings") && (
                  <TabsContent value="settings">
                    <SystemSettings adminUser={adminUser} />
                  </TabsContent>
                )}
  
                {hasAdminPermission("canAccessLogs") && (
                  <TabsContent value="logs">
                    <SystemLogs adminUser={adminUser} />
                  </TabsContent>
                )}
  
                {hasAdminPermission("canManageBilling") && (
                  <TabsContent value="billing">
                    <BillingManagement adminUser={adminUser} />
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    )
  }
  