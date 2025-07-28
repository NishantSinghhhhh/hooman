"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MoreHorizontal, UserPlus, Shield, Ban, CheckCircle } from "lucide-react"
import { UserPermissionsModal } from "./user-permissions-modal"

interface User {
  _id: string
  email: string
  firstName: string
  lastName: string
  role: "user" | "admin"
  isActive: boolean
  lastLogin: string
  analytics: {
    totalTokens: number
    totalSpend: number
    currentMonthTokens: number
    currentMonthRequests: number
  }
  userSettings: {
    monthlyTokenLimit: number
    monthlyRequestLimit: number
    canUseVideo: boolean
    canUseAudio: boolean
    canUseDocument: boolean
    canUseImage: boolean
    theme: string
    language: string
    emailNotifications: boolean
    usageAlerts: boolean
  }
  adminSettings?: {
    canManageUsers: boolean
    canViewSystemAnalytics: boolean
    canManageSystemSettings: boolean
    canAccessLogs: boolean
    canManageBilling: boolean
    hasUnlimitedUsage: boolean
    canOverrideUserLimits: boolean
  }
}

interface Props {
  adminUser: any
}

export function UserManagement({ adminUser }: Props) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "admin">("all")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Enhanced mock data with more users
  const mockUsers: User[] = [
    {
      _id: "1",
      email: "john.doe@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "user",
      isActive: true,
      lastLogin: "2025-01-27T10:30:00Z",
      analytics: { totalTokens: 45200, totalSpend: 12.5, currentMonthTokens: 8500, currentMonthRequests: 45 },
      userSettings: {
        monthlyTokenLimit: 100000,
        monthlyRequestLimit: 1000,
        canUseVideo: true,
        canUseAudio: true,
        canUseDocument: true,
        canUseImage: true,
        theme: "light",
        language: "en",
        emailNotifications: true,
        usageAlerts: true,
      },
    },
    {
      _id: "2",
      email: "jane.smith@example.com",
      firstName: "Jane",
      lastName: "Smith",
      role: "admin",
      isActive: true,
      lastLogin: "2025-01-27T09:15:00Z",
      analytics: { totalTokens: 125000, totalSpend: 45.75, currentMonthTokens: 15000, currentMonthRequests: 89 },
      userSettings: {
        monthlyTokenLimit: 100000,
        monthlyRequestLimit: 1000,
        canUseVideo: true,
        canUseAudio: true,
        canUseDocument: true,
        canUseImage: true,
        theme: "dark",
        language: "en",
        emailNotifications: true,
        usageAlerts: false,
      },
      adminSettings: {
        canManageUsers: true,
        canViewSystemAnalytics: true,
        canManageSystemSettings: false,
        canAccessLogs: true,
        canManageBilling: false,
        hasUnlimitedUsage: true,
        canOverrideUserLimits: true,
      },
    },
    {
      _id: "3",
      email: "bob.wilson@example.com",
      firstName: "Bob",
      lastName: "Wilson",
      role: "user",
      isActive: false,
      lastLogin: "2025-01-25T14:20:00Z",
      analytics: { totalTokens: 23400, totalSpend: 8.25, currentMonthTokens: 2300, currentMonthRequests: 12 },
      userSettings: {
        monthlyTokenLimit: 50000,
        monthlyRequestLimit: 500,
        canUseVideo: false,
        canUseAudio: true,
        canUseDocument: true,
        canUseImage: true,
        theme: "auto",
        language: "en",
        emailNotifications: false,
        usageAlerts: true,
      },
    },
    {
      _id: "4",
      email: "alice.johnson@example.com",
      firstName: "Alice",
      lastName: "Johnson",
      role: "user",
      isActive: true,
      lastLogin: "2025-01-27T08:45:00Z",
      analytics: { totalTokens: 67800, totalSpend: 18.9, currentMonthTokens: 12400, currentMonthRequests: 67 },
      userSettings: {
        monthlyTokenLimit: 100000,
        monthlyRequestLimit: 1000,
        canUseVideo: true,
        canUseAudio: true,
        canUseDocument: true,
        canUseImage: false,
        theme: "light",
        language: "es",
        emailNotifications: true,
        usageAlerts: true,
      },
    },
    {
      _id: "5",
      email: "mike.brown@example.com",
      firstName: "Mike",
      lastName: "Brown",
      role: "user",
      isActive: true,
      lastLogin: "2025-01-26T16:30:00Z",
      analytics: { totalTokens: 89200, totalSpend: 24.15, currentMonthTokens: 18900, currentMonthRequests: 134 },
      userSettings: {
        monthlyTokenLimit: 150000,
        monthlyRequestLimit: 1500,
        canUseVideo: true,
        canUseAudio: true,
        canUseDocument: true,
        canUseImage: true,
        theme: "dark",
        language: "en",
        emailNotifications: true,
        usageAlerts: true,
      },
    },
  ]

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter =
      filter === "all" ||
      (filter === "active" && user.isActive) ||
      (filter === "inactive" && !user.isActive) ||
      (filter === "admin" && user.role === "admin")

    return matchesSearch && matchesFilter
  })

  const handleUserClick = (user: User) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  const handleUserAction = (userId: string, action: string) => {
    console.log(`Action ${action} for user ${userId}`)
    // In a real app, this would make an API call
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage user accounts and permissions</p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex space-x-2">
              {["all", "active", "inactive", "admin"].map((filterOption) => (
                <Button
                  key={filterOption}
                  variant={filter === filterOption ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(filterOption as any)}
                >
                  {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Spend</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div
                      className="cursor-pointer hover:text-purple-600 transition-colors"
                      onClick={() => handleUserClick(user)}
                    >
                      <div className="font-medium">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role === "admin" && <Shield className="mr-1 h-3 w-3" />}
                      {user.role.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "secondary" : "destructive"}>
                      {user.isActive ? (
                        <>
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <Ban className="mr-1 h-3 w-3" />
                          Inactive
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>
                        {(user.analytics.currentMonthTokens / 1000).toFixed(1)}K /{" "}
                        {user.userSettings.monthlyTokenLimit / 1000}K
                      </div>
                      <div className="text-gray-500">
                        {((user.analytics.currentMonthTokens / user.userSettings.monthlyTokenLimit) * 100).toFixed(0)}%
                        used
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>${user.analytics.totalSpend.toFixed(2)}</TableCell>
                  <TableCell>{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleUserAction(user._id, user.isActive ? "deactivate" : "activate")}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        {user.role === "user" ? (
                          <DropdownMenuItem onClick={() => handleUserAction(user._id, "makeAdmin")}>
                            Make Admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleUserAction(user._id, "removeAdmin")}>
                            Remove Admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Reset Password</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedUser && (
        <UserPermissionsModal
          user={selectedUser}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedUser(null)
          }}
          onSave={(updatedUser) => {
            console.log("User updated:", updatedUser)
            setIsModalOpen(false)
            setSelectedUser(null)
          }}
        />
      )}
    </div>
  )
}
