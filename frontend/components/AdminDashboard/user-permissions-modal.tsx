"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Shield,
  Settings,
  Activity,
  DollarSign,
  Save,
  AlertTriangle,
  Video,
  Headphones,
  FileText,
  ImageIcon,
} from "lucide-react"

interface UserInterface {
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
  user: UserInterface
  isOpen: boolean
  onClose: () => void
  onSave: (user: UserInterface) => void
}

export function UserPermissionsModal({ user, isOpen, onClose, onSave }: Props) {
  const [editedUser, setEditedUser] = useState<UserInterface>(user)
  const [loading, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setEditedUser(user)
    setHasChanges(false)
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/users/${user._id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedUser),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        onSave(updatedUser)
      }
    } catch (error) {
      console.error("Failed to update user:", error)
    } finally {
      setSaving(false)
    }
  }

  const updateUserSettings = (key: string, value: any) => {
    setEditedUser((prev) => ({
      ...prev,
      userSettings: {
        ...prev.userSettings,
        [key]: value,
      },
    }))
    setHasChanges(true)
  }

  const updateAdminSettings = (key: string, value: any) => {
    setEditedUser((prev) => ({
      ...prev,
      adminSettings: {
        ...prev.adminSettings!,
        [key]: value,
      },
    }))
    setHasChanges(true)
  }

  const updateBasicInfo = (key: string, value: any) => {
    setEditedUser((prev) => ({
      ...prev,
      [key]: value,
    }))
    setHasChanges(true)
  }

  const toggleRole = () => {
    const newRole = editedUser.role === "admin" ? "user" : "admin"
    setEditedUser((prev) => ({
      ...prev,
      role: newRole,
      adminSettings:
        newRole === "admin"
          ? {
              canManageUsers: false,
              canViewSystemAnalytics: false,
              canManageSystemSettings: false,
              canAccessLogs: false,
              canManageBilling: false,
              hasUnlimitedUsage: false,
              canOverrideUserLimits: false,
            }
          : undefined,
    }))
    setHasChanges(true)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>
              Edit User: {user.firstName} {user.lastName}
            </span>
            <Badge variant={editedUser.role === "admin" ? "default" : "secondary"}>
              {editedUser.role === "admin" && <Shield className="mr-1 h-3 w-3" />}
              {editedUser.role.toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="limits">Usage Limits</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Basic Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={editedUser.firstName}
                      onChange={(e) => updateBasicInfo("firstName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={editedUser.lastName}
                      onChange={(e) => updateBasicInfo("lastName", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editedUser.email}
                    onChange={(e) => updateBasicInfo("email", e.target.value)}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Account Status</Label>
                      <p className="text-sm text-muted-foreground">Enable or disable user account</p>
                    </div>
                    <Switch
                      checked={editedUser.isActive}
                      onCheckedChange={(checked) => updateBasicInfo("isActive", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Admin Role</Label>
                      <p className="text-sm text-muted-foreground">Grant or revoke admin privileges</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={editedUser.role === "admin" ? "default" : "secondary"}>
                        {editedUser.role.toUpperCase()}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={toggleRole}>
                        {editedUser.role === "admin" ? "Remove Admin" : "Make Admin"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>User Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <select
                      id="theme"
                      className="w-full p-2 border rounded-md"
                      value={editedUser.userSettings.theme}
                      onChange={(e) => updateUserSettings("theme", e.target.value)}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <select
                      id="language"
                      className="w-full p-2 border rounded-md"
                      value={editedUser.userSettings.language}
                      onChange={(e) => updateUserSettings("language", e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive email notifications</p>
                    </div>
                    <Switch
                      checked={editedUser.userSettings.emailNotifications}
                      onCheckedChange={(checked) => updateUserSettings("emailNotifications", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Usage Alerts</Label>
                      <p className="text-sm text-muted-foreground">Receive alerts when approaching limits</p>
                    </div>
                    <Switch
                      checked={editedUser.userSettings.usageAlerts}
                      onCheckedChange={(checked) => updateUserSettings("usageAlerts", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Feature Permissions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Video className="h-5 w-5 text-purple-600" />
                      <div>
                        <Label>Video Processing</Label>
                        <p className="text-sm text-muted-foreground">Allow video token usage</p>
                      </div>
                    </div>
                    <Switch
                      checked={editedUser.userSettings.canUseVideo}
                      onCheckedChange={(checked) => updateUserSettings("canUseVideo", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Headphones className="h-5 w-5 text-blue-600" />
                      <div>
                        <Label>Audio Processing</Label>
                        <p className="text-sm text-muted-foreground">Allow audio token usage</p>
                      </div>
                    </div>
                    <Switch
                      checked={editedUser.userSettings.canUseAudio}
                      onCheckedChange={(checked) => updateUserSettings("canUseAudio", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-green-600" />
                      <div>
                        <Label>Document Processing</Label>
                        <p className="text-sm text-muted-foreground">Allow document token usage</p>
                      </div>
                    </div>
                    <Switch
                      checked={editedUser.userSettings.canUseDocument}
                      onCheckedChange={(checked) => updateUserSettings("canUseDocument", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <ImageIcon className="h-5 w-5 text-orange-600" />
                      <div>
                        <Label>Image Processing</Label>
                        <p className="text-sm text-muted-foreground">Allow image token usage</p>
                      </div>
                    </div>
                    <Switch
                      checked={editedUser.userSettings.canUseImage}
                      onCheckedChange={(checked) => updateUserSettings("canUseImage", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {editedUser.role === "admin" && editedUser.adminSettings && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-purple-600" />
                    <span>Admin Permissions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Admin permissions grant elevated access. Use caution when modifying these settings.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    {Object.entries(editedUser.adminSettings).map(([key, value]) => {
                      const labels: Record<string, { title: string; description: string }> = {
                        canManageUsers: {
                          title: "Manage Users",
                          description: "Create, edit, and delete user accounts",
                        },
                        canViewSystemAnalytics: {
                          title: "View Analytics",
                          description: "Access system analytics and reports",
                        },
                        canManageSystemSettings: {
                          title: "System Settings",
                          description: "Modify system-wide settings",
                        },
                        canAccessLogs: { title: "Access Logs", description: "View system logs and audit trails" },
                        canManageBilling: {
                          title: "Manage Billing",
                          description: "Access billing and payment information",
                        },
                        hasUnlimitedUsage: {
                          title: "Unlimited Usage",
                          description: "Bypass all usage limits and restrictions",
                        },
                        canOverrideUserLimits: {
                          title: "Override Limits",
                          description: "Modify user limits beyond defaults",
                        },
                      }

                      const label = labels[key]
                      if (!label) return null

                      return (
                        <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <Label>{label.title}</Label>
                            <p className="text-sm text-muted-foreground">{label.description}</p>
                          </div>
                          <Switch
                            checked={value as boolean}
                            onCheckedChange={(checked) => updateAdminSettings(key, checked)}
                          />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="limits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-4 w-4" />
                  <span>Usage Limits</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tokenLimit">Monthly Token Limit</Label>
                    <Input
                      id="tokenLimit"
                      type="number"
                      value={editedUser.userSettings.monthlyTokenLimit}
                      onChange={(e) => updateUserSettings("monthlyTokenLimit", Number(e.target.value))}
                    />
                    <p className="text-sm text-muted-foreground">
                      Current usage: {editedUser.analytics.currentMonthTokens.toLocaleString()} tokens
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requestLimit">Monthly Request Limit</Label>
                    <Input
                      id="requestLimit"
                      type="number"
                      value={editedUser.userSettings.monthlyRequestLimit}
                      onChange={(e) => updateUserSettings("monthlyRequestLimit", Number(e.target.value))}
                    />
                    <p className="text-sm text-muted-foreground">
                      Current usage: {editedUser.analytics.currentMonthRequests.toLocaleString()} requests
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-2">Usage Overview</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Token Usage:</span>
                        <div className="font-medium">
                          {(
                            (editedUser.analytics.currentMonthTokens / editedUser.userSettings.monthlyTokenLimit) *
                            100
                          ).toFixed(1)}
                          % used
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Request Usage:</span>
                        <div className="font-medium">
                          {(
                            (editedUser.analytics.currentMonthRequests / editedUser.userSettings.monthlyRequestLimit) *
                            100
                          ).toFixed(1)}
                          % used
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-4 w-4" />
                    <span>Usage Statistics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Tokens</span>
                      <span className="font-medium">{editedUser.analytics.totalTokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">This Month</span>
                      <span className="font-medium">{editedUser.analytics.currentMonthTokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Requests This Month</span>
                      <span className="font-medium">{editedUser.analytics.currentMonthRequests.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Billing Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Spend</span>
                      <span className="font-medium">${editedUser.analytics.totalSpend.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Last Login</span>
                      <span className="font-medium">
                        {editedUser.lastLogin ? new Date(editedUser.lastLogin).toLocaleDateString() : "Never"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                Unsaved Changes
              </Badge>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !hasChanges}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
