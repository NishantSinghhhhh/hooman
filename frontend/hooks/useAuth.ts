import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

// Define user interface based on your auth controller response
interface UserInfo {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'user' | 'admin'
  isActive: boolean
  lastLogin?: Date
  userSettings?: {
    monthlyTokenLimit: number
    monthlyRequestLimit: number
    canUseVideo: boolean
    canUseAudio: boolean
    canUseDocument: boolean
    canUseImage: boolean
    theme: 'light' | 'dark' | 'auto'
    language: string
    emailNotifications: boolean
    usageAlerts: boolean
    accountCreated: Date
  }
  adminSettings?: {
    canManageUsers: boolean
    canViewSystemAnalytics: boolean
    canManageSystemSettings: boolean
    canAccessLogs: boolean
    canManageBilling: boolean
    hasUnlimitedUsage: boolean
    canOverrideUserLimits: boolean
    lastAdminAction?: Date
    adminActionCount: number
  }
  analytics?: {
    totalSpend: number
    totalTokens: number
    totalRequests: number
    currentMonthTokens: number
    currentMonthRequests: number
    tokens: {
      video: number
      audio: number
      document: number
      image: number
    }
    requests: {
      video: number
      audio: number
      document: number
      image: number
    }
  }
}

export function useAuth(requireAuth = true) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(false)

  useEffect(() => {
    if (requireAuth && status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router, requireAuth])

  // Extract basic info from session
  const token = (session as any)?.accessToken || (session as any)?.backendToken
  const userId = (session as any)?.userId
  const userRole = (session as any)?.role
  const userEmail = (session as any)?.email || session?.user?.email
  const userName = (session as any)?.name || session?.user?.name

  // Function to fetch complete user profile from backend
  const fetchUserInfo = async () => {
    if (!token || !userId) return

    setIsLoadingUserInfo(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUserInfo(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching user info:', error)
    } finally {
      setIsLoadingUserInfo(false)
    }
  }

  // Fetch user info when session is available
  useEffect(() => {
    if (session && token && userId && !userInfo) {
      fetchUserInfo()
    }
  }, [session, token, userId])

  const hasPermission = (permission: string): boolean => {
    if (userRole === 'admin' && userInfo?.adminSettings) {
      const value = userInfo.adminSettings[permission as keyof typeof userInfo.adminSettings];
      return Boolean(value);
    }
    return false;
  }
  
  const canUseFeature = (feature: 'video' | 'audio' | 'document' | 'image'): boolean => {
    if (userRole === 'admin' && userInfo?.adminSettings?.hasUnlimitedUsage) {
      return true
    }
    
    if (userInfo?.userSettings) {
      const featureKey = `canUse${feature.charAt(0).toUpperCase() + feature.slice(1)}` as keyof typeof userInfo.userSettings
      return userInfo.userSettings[featureKey] as boolean || false
    }
    return false
  }

  const getRemainingUsage = () => {
    if (userRole === 'admin' && userInfo?.adminSettings?.hasUnlimitedUsage) {
      return { tokens: Infinity, requests: Infinity }
    }

    if (userInfo?.userSettings && userInfo?.analytics) {
      return {
        tokens: Math.max(0, userInfo.userSettings.monthlyTokenLimit - userInfo.analytics.currentMonthTokens),
        requests: Math.max(0, userInfo.userSettings.monthlyRequestLimit - userInfo.analytics.currentMonthRequests)
      }
    }
    return { tokens: 0, requests: 0 }
  }

  const getUsagePercentage = () => {
    if (userRole === 'admin' && userInfo?.adminSettings?.hasUnlimitedUsage) {
      return { tokens: 0, requests: 0 }
    }

    if (userInfo?.userSettings && userInfo?.analytics) {
      return {
        tokens: (userInfo.analytics.currentMonthTokens / userInfo.userSettings.monthlyTokenLimit) * 100,
        requests: (userInfo.analytics.currentMonthRequests / userInfo.userSettings.monthlyRequestLimit) * 100
      }
    }
    return { tokens: 0, requests: 0 }
  }
  return {
    // Session data
    session,
    status,
    
    // Authentication state
    isAuthenticated: !!session && !!token,
    isLoading: status === "loading",
    isLoadingUserInfo,
    
    // Basic user data from session
    token,
    userId,
    userRole,
    userEmail,
    userName,
    
    // Complete user information
    userInfo,
    
    // Convenience getters
    user: {
      id: userId,
      email: userEmail,
      name: userName,
      role: userRole || userInfo?.role, // FALLBACK FIX
      firstName: userInfo?.firstName,
      lastName: userInfo?.lastName,
      isActive: userInfo?.isActive,
      lastLogin: userInfo?.lastLogin,
    },
    
    // Settings
    userSettings: userInfo?.userSettings,
    adminSettings: userInfo?.adminSettings,
    analytics: userInfo?.analytics,
    
    // Permission helpers - FIX THE ISADMIN CHECK
    isAdmin: userRole === 'admin' || userInfo?.role === 'admin', // Check both sources
    isUser: (userRole === 'user' || userInfo?.role === 'user') && userInfo?.role !== 'admin',
    hasPermission,
    canUseFeature,
    
    // Usage helpers
    getRemainingUsage,
    getUsagePercentage,
    
    // Actions
    refreshUserInfo: fetchUserInfo,
  }
}