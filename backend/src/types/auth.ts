// @/types/auth.ts

export type UserRole = 'user' | 'admin';
export interface IJwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export interface UserSettings {
  monthlyTokenLimit: number;
  monthlyRequestLimit: number;
  canUseVideo: boolean;
  canUseAudio: boolean;
  canUseDocument: boolean;
  canUseImage: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  emailNotifications: boolean;
  usageAlerts: boolean;
  accountCreated: Date;
}

export interface AdminSettings {
  canManageUsers: boolean;
  canViewSystemAnalytics: boolean;
  canManageSystemSettings: boolean;
  canAccessLogs: boolean;
  canManageBilling: boolean;
  hasUnlimitedUsage: boolean;
  canOverrideUserLimits: boolean;
  lastAdminAction?: Date;
  adminActionCount: number;
}

export interface IUser {
  _id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  
  // User-specific settings
  userSettings: UserSettings;
  
  // Admin-specific settings
  adminSettings: AdminSettings;
  
  // Analytics data
  analytics: {
    totalSpend: number;
    totalTokens: number;
    totalRequests: number;
    currentMonthTokens: number;
    currentMonthRequests: number;
    currentMonthStart: Date;
    tokens: {
      video: number;
      audio: number;
      document: number;
      image: number;
    };
    requests: {
      video: number;
      audio: number;
      document: number;
      image: number;
    };
    lastUpdated: Date;
  };
  
  // Daily usage tracking
  dailyUsage: Array<{
    date: string; // "2025-07-27"
    video: number;
    audio: number;
    docs: number;
    image: number;
    total: number;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole; // Optional, defaults to 'user'
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: Omit<IUser, 'password'>;
    token?: string;
  };
  error?: string;
}

// API Response interface for auth endpoints
export interface AuthApiResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    lastLogin?: Date;
    isActive: boolean;
  };
  token: string;
}

// Analytics specific types
export interface UsageData {
  date: string;
  video: number;
  audio: number;
  docs: number;
  image: number;
  total: number;
}

export interface ModalityStats {
  modality: 'video' | 'audio' | 'document' | 'image';
  tokens: number;
  requests: number;
  percentage: string;
}

export interface UsageLimits {
  monthlyTokenLimit: number;
  monthlyRequestLimit: number;
  currentMonthTokens: number;
  currentMonthRequests: number;
  tokensRemaining: number;
  requestsRemaining: number;
  tokenUsagePercentage: string;
  requestUsagePercentage: string;
}

export interface AdminInfo {
  hasUnlimitedUsage: boolean;
  lastAdminAction?: Date;
  adminActionCount: number;
  permissions: {
    canManageUsers: boolean;
    canViewSystemAnalytics: boolean;
    canManageSystemSettings: boolean;
    canAccessLogs: boolean;
    canManageBilling: boolean;
  };
}

export interface AnalyticsData {
  totalSpend: number;
  totalTokens: number;
  totalRequests: number;
  dailyUsage: UsageData[];
  modalityBreakdown: {
    video: ModalityStats;
    audio: ModalityStats;
    document: ModalityStats;
    image: ModalityStats;
  };
  limits?: UsageLimits; // Only for normal users
  adminInfo?: AdminInfo; // Only for admin users
}

// Permission types
export type AdminPermission = 
  | 'canManageUsers' 
  | 'canViewSystemAnalytics' 
  | 'canManageSystemSettings' 
  | 'canAccessLogs' 
  | 'canManageBilling';

export interface UserTypeSummary {
  total: number;
  active: number;
  inactive: number;
  admins: number;
  normalUsers: number;
  adminPercentage: string;
}

// API request/response types
export interface CreateAdminRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  adminPermissions?: Partial<AdminSettings>;
}

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
}