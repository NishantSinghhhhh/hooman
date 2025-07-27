"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Save, AlertTriangle, Settings, Shield, Database } from "lucide-react"

interface Props {
  adminUser: any
}

export function SystemSettings({ adminUser }: Props) {
  const [settings, setSettings] = useState({
    general: {
      siteName: "AI Platform",
      maintenanceMode: false,
      registrationEnabled: true,
      emailVerificationRequired: true,
    },
    limits: {
      defaultMonthlyTokenLimit: 100000,
      defaultMonthlyRequestLimit: 1000,
      maxFileSize: 10, // MB
      maxConcurrentRequests: 5,
    },
    features: {
      videoProcessing: true,
      audioProcessing: true,
      documentProcessing: true,
      imageProcessing: true,
    },
    security: {
      passwordMinLength: 8,
      sessionTimeout: 24, // hours
      maxLoginAttempts: 5,
      twoFactorRequired: false,
    },
  })

  const handleSave = async (section: string) => {
    try {
      const response = await fetch(`/api/admin/settings/${section}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings[section as keyof typeof settings]),
      })

      if (response.ok) {
        // Show success message
        console.log("Settings saved successfully")
      }
    } catch (error) {
      console.error("Failed to save settings:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">System Settings</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Configure system-wide settings and preferences</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="limits">User Limits</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>General Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={settings.general.siteName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, siteName: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">Temporarily disable the platform for maintenance</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {settings.general.maintenanceMode && (
                      <Badge variant="destructive">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                    )}
                    <Switch
                      checked={settings.general.maintenanceMode}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          general: { ...settings.general, maintenanceMode: checked },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>User Registration</Label>
                    <p className="text-sm text-muted-foreground">Allow new users to register accounts</p>
                  </div>
                  <Switch
                    checked={settings.general.registrationEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, registrationEnabled: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Verification Required</Label>
                    <p className="text-sm text-muted-foreground">Require email verification for new accounts</p>
                  </div>
                  <Switch
                    checked={settings.general.emailVerificationRequired}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, emailVerificationRequired: checked },
                      })
                    }
                  />
                </div>
              </div>

              <Button onClick={() => handleSave("general")}>
                <Save className="mr-2 h-4 w-4" />
                Save General Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Default User Limits</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="tokenLimit">Monthly Token Limit</Label>
                  <Input
                    id="tokenLimit"
                    type="number"
                    value={settings.limits.defaultMonthlyTokenLimit}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        limits: { ...settings.limits, defaultMonthlyTokenLimit: Number(e.target.value) },
                      })
                    }
                  />
                  <p className="text-sm text-muted-foreground">Default monthly token limit for new users</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requestLimit">Monthly Request Limit</Label>
                  <Input
                    id="requestLimit"
                    type="number"
                    value={settings.limits.defaultMonthlyRequestLimit}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        limits: { ...settings.limits, defaultMonthlyRequestLimit: Number(e.target.value) },
                      })
                    }
                  />
                  <p className="text-sm text-muted-foreground">Default monthly request limit for new users</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fileSize">Max File Size (MB)</Label>
                  <Input
                    id="fileSize"
                    type="number"
                    value={settings.limits.maxFileSize}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        limits: { ...settings.limits, maxFileSize: Number(e.target.value) },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="concurrentRequests">Max Concurrent Requests</Label>
                  <Input
                    id="concurrentRequests"
                    type="number"
                    value={settings.limits.maxConcurrentRequests}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        limits: { ...settings.limits, maxConcurrentRequests: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>

              <Button onClick={() => handleSave("limits")}>
                <Save className="mr-2 h-4 w-4" />
                Save Limit Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Toggles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(settings.features).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable {key.toLowerCase()} functionality system-wide
                    </p>
                  </div>
                  <Switch
                    checked={value}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        features: { ...settings.features, [key]: checked },
                      })
                    }
                  />
                </div>
              ))}

              <Button onClick={() => handleSave("features")}>
                <Save className="mr-2 h-4 w-4" />
                Save Feature Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="passwordLength">Minimum Password Length</Label>
                  <Input
                    id="passwordLength"
                    type="number"
                    value={settings.security.passwordMinLength}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, passwordMinLength: Number(e.target.value) },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={settings.security.sessionTimeout}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, sessionTimeout: Number(e.target.value) },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxAttempts">Max Login Attempts</Label>
                  <Input
                    id="maxAttempts"
                    type="number"
                    value={settings.security.maxLoginAttempts}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, maxLoginAttempts: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication Required</Label>
                  <p className="text-sm text-muted-foreground">Require 2FA for all user accounts</p>
                </div>
                <Switch
                  checked={settings.security.twoFactorRequired}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, twoFactorRequired: checked },
                    })
                  }
                />
              </div>

              <Button onClick={() => handleSave("security")}>
                <Save className="mr-2 h-4 w-4" />
                Save Security Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
