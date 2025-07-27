import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, BarChart3, Settings, FileText, CreditCard, Shield } from 'lucide-react'

interface Props {
  activeTab: string
  setActiveTab: (tab: string) => void
  permissions: {
    canManageUsers: boolean
    canViewSystemAnalytics: boolean
    canManageSystemSettings: boolean
    canAccessLogs: boolean
    canManageBilling: boolean
  }
}

export function AdminSidebar({ activeTab, setActiveTab, permissions }: Props) {
  const menuItems = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      enabled: true,
    },
    {
      id: "users",
      label: "User Management",
      icon: Users,
      enabled: permissions.canManageUsers,
    },
    {
      id: "analytics",
      label: "System Analytics",
      icon: BarChart3,
      enabled: permissions.canViewSystemAnalytics,
    },
    {
      id: "settings",
      label: "System Settings",
      icon: Settings,
      enabled: permissions.canManageSystemSettings,
    },
    {
      id: "logs",
      label: "System Logs",
      icon: FileText,
      enabled: permissions.canAccessLogs,
    },
    {
      id: "billing",
      label: "Billing Management",
      icon: CreditCard,
      enabled: permissions.canManageBilling,
    },
  ]

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen">
      <div className="p-6">
        <nav className="space-y-2">
          {menuItems.map((item) => {
            if (!item.enabled) return null
            
            const Icon = item.icon
            return (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  activeTab === item.id && "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                )}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            )
          })}
        </nav>

        {/* Admin Privileges Badge */}
        <div className="mt-8 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
              Admin Privileges
            </span>
          </div>
          <p className="text-xs text-purple-600 dark:text-purple-300 mt-1">
            Full system access enabled
          </p>
        </div>
      </div>
    </aside>
  )
}
