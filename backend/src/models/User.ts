import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser, AdminSettings, UserTypeSummary } from '@/types/auth';

interface IUserDocument extends Omit<IUser, '_id'>, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  trackUsage(modality: 'video' | 'audio' | 'document' | 'image', tokens: number, cost?: number): Promise<void>;
  getAnalytics(): any;
  hasPermission(permission: string): boolean;
  canAccessAdminPanel(): boolean;
  canViewAllUsers(): boolean;
  canManageUsers(): boolean;
  canViewSystemAnalytics(): boolean;
  canMakeRequest(modality: 'video' | 'audio' | 'document' | 'image'): { allowed: boolean, reason?: string };
  canUseTokens(tokenCount: number): { allowed: boolean, reason?: string };
}

// Interface for static methods
interface IUserModel extends Model<IUserDocument> {
  createAdmin(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    adminPermissions?: Partial<AdminSettings>;
  }): Promise<IUserDocument>;
  
  getUserTypeSummary(): Promise<UserTypeSummary>;
}

const userSchema = new Schema<IUserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  
  // User-specific settings and limits
  userSettings: {
    // Usage limits for normal users
    monthlyTokenLimit: { type: Number, default: 100000 }, // 100K tokens per month for normal users
    monthlyRequestLimit: { type: Number, default: 1000 }, // 1K requests per month for normal users
    
    // Feature permissions
    canUseVideo: { type: Boolean, default: true },
    canUseAudio: { type: Boolean, default: true },
    canUseDocument: { type: Boolean, default: true },
    canUseImage: { type: Boolean, default: true },
    
    // UI preferences
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
    language: { type: String, default: 'en' },
    
    // Notification preferences
    emailNotifications: { type: Boolean, default: true },
    usageAlerts: { type: Boolean, default: true },
    
    // Account creation date for tracking
    accountCreated: { type: Date, default: Date.now }
  },
  
  // Admin-specific settings (only relevant for admin users)
  adminSettings: {
    // Admin permissions
    canManageUsers: { type: Boolean, default: false },
    canViewSystemAnalytics: { type: Boolean, default: false },
    canManageSystemSettings: { type: Boolean, default: false },
    canAccessLogs: { type: Boolean, default: false },
    canManageBilling: { type: Boolean, default: false },
    
    // Admin privileges
    hasUnlimitedUsage: { type: Boolean, default: false },
    canOverrideUserLimits: { type: Boolean, default: false },
    
    // Admin activity tracking
    lastAdminAction: { type: Date },
    adminActionCount: { type: Number, default: 0 }
  },
  
  // Analytics tracking - minimal additions
  analytics: {
    totalSpend: { type: Number, default: 0 }, // in dollars
    totalTokens: { type: Number, default: 0 },
    totalRequests: { type: Number, default: 0 },
    
    // Monthly tracking for limits
    currentMonthTokens: { type: Number, default: 0 },
    currentMonthRequests: { type: Number, default: 0 },
    currentMonthStart: { type: Date, default: Date.now },
    
    // Token usage by modality
    tokens: {
      video: { type: Number, default: 0 },
      audio: { type: Number, default: 0 },
      document: { type: Number, default: 0 },
      image: { type: Number, default: 0 }
    },
    
    // Request counts by modality
    requests: {
      video: { type: Number, default: 0 },
      audio: { type: Number, default: 0 },
      document: { type: Number, default: 0 },
      image: { type: Number, default: 0 }
    },
    
    // Last updated timestamp
    lastUpdated: { type: Date, default: Date.now }
  },
  
  // Daily usage tracking (for charts) - stores last 30 days
  dailyUsage: [{
    date: { type: String, required: true }, // Format: "2025-07-27"
    video: { type: Number, default: 0 },
    audio: { type: Number, default: 0 },
    docs: { type: Number, default: 0 },
    image: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Reset monthly counters if needed
userSchema.pre('save', function(next) {
  const now = new Date();
  const currentMonthStart = new Date(this.analytics.currentMonthStart);
  
  // Check if we're in a new month
  if (now.getMonth() !== currentMonthStart.getMonth() || now.getFullYear() !== currentMonthStart.getFullYear()) {
    this.analytics.currentMonthTokens = 0;
    this.analytics.currentMonthRequests = 0;
    this.analytics.currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Permission checking methods
userSchema.methods.hasPermission = function(permission: string): boolean {
  if (this.role === 'admin') {
    return this.adminSettings[permission] || false;
  }
  return false;
};

userSchema.methods.canAccessAdminPanel = function(): boolean {
  return this.role === 'admin' && this.isActive;
};

userSchema.methods.canViewAllUsers = function(): boolean {
  return this.role === 'admin' && this.adminSettings.canManageUsers;
};

userSchema.methods.canManageUsers = function(): boolean {
  return this.role === 'admin' && this.adminSettings.canManageUsers;
};

userSchema.methods.canViewSystemAnalytics = function(): boolean {
  return this.role === 'admin' && this.adminSettings.canViewSystemAnalytics;
};

// Usage limit checking methods
userSchema.methods.canMakeRequest = function(modality: 'video' | 'audio' | 'document' | 'image'): { allowed: boolean, reason?: string } {
  // Admins with unlimited usage bypass all limits
  if (this.role === 'admin' && this.adminSettings.hasUnlimitedUsage) {
    return { allowed: true };
  }
  
  // Check if user can use this modality
  const modalityKey = `canUse${modality.charAt(0).toUpperCase() + modality.slice(1)}` as keyof typeof this.userSettings;
  if (!this.userSettings[modalityKey]) {
    return { allowed: false, reason: `${modality} processing is disabled for your account` };
  }
  
  // Check monthly request limit
  if (this.analytics.currentMonthRequests >= this.userSettings.monthlyRequestLimit) {
    return { allowed: false, reason: 'Monthly request limit exceeded' };
  }
  
  return { allowed: true };
};

userSchema.methods.canUseTokens = function(tokenCount: number): { allowed: boolean, reason?: string } {
  // Admins with unlimited usage bypass all limits
  if (this.role === 'admin' && this.adminSettings.hasUnlimitedUsage) {
    return { allowed: true };
  }
  
  // Check monthly token limit
  if (this.analytics.currentMonthTokens + tokenCount > this.userSettings.monthlyTokenLimit) {
    return { allowed: false, reason: 'Monthly token limit would be exceeded' };
  }
  
  return { allowed: true };
};

// Method to track usage
userSchema.methods.trackUsage = async function(modality: 'video' | 'audio' | 'document' | 'image', tokens: number, cost: number = 0) {
  const today = new Date().toISOString().split('T')[0]; // "2025-07-27"
  
  // Update analytics totals
  this.analytics.totalSpend += cost;
  this.analytics.totalTokens += tokens;
  this.analytics.totalRequests += 1;
  this.analytics.tokens[modality] += tokens;
  this.analytics.requests[modality] += 1;
  this.analytics.lastUpdated = new Date();
  
  // Update monthly counters
  this.analytics.currentMonthTokens += tokens;
  this.analytics.currentMonthRequests += 1;
  
  // Find or create today's usage entry
  let todayUsage = this.dailyUsage.find((usage: any) => usage.date === today);
  
  if (todayUsage) {
    // Update existing entry
    todayUsage[modality === 'document' ? 'docs' : modality] += tokens;
    todayUsage.total += tokens;
  } else {
    // Create new entry
    const newUsage = {
      date: today,
      video: modality === 'video' ? tokens : 0,
      audio: modality === 'audio' ? tokens : 0,
      docs: modality === 'document' ? tokens : 0,
      image: modality === 'image' ? tokens : 0,
      total: tokens
    };
    this.dailyUsage.push(newUsage);
  }
  
  // Keep only last 30 days
  if (this.dailyUsage.length > 30) {
    this.dailyUsage = this.dailyUsage.slice(-30);
  }
  
  await this.save();
};

// Method to get analytics data
userSchema.methods.getAnalytics = function() {
  const last7Days = this.dailyUsage.slice(-7);
  
  const baseAnalytics = {
    analytics: this.analytics,
    dailyUsage: last7Days,
    totalTokens: this.analytics.totalTokens,
    totalSpend: this.analytics.totalSpend,
    totalRequests: this.analytics.totalRequests,
    modalityBreakdown: {
      video: {
        tokens: this.analytics.tokens.video,
        requests: this.analytics.requests.video,
        percentage: this.analytics.totalTokens > 0 ? ((this.analytics.tokens.video / this.analytics.totalTokens) * 100).toFixed(1) : 0
      },
      audio: {
        tokens: this.analytics.tokens.audio,
        requests: this.analytics.requests.audio,
        percentage: this.analytics.totalTokens > 0 ? ((this.analytics.tokens.audio / this.analytics.totalTokens) * 100).toFixed(1) : 0
      },
      document: {
        tokens: this.analytics.tokens.document,
        requests: this.analytics.requests.document,
        percentage: this.analytics.totalTokens > 0 ? ((this.analytics.tokens.document / this.analytics.totalTokens) * 100).toFixed(1) : 0
      },
      image: {
        tokens: this.analytics.tokens.image,
        requests: this.analytics.requests.image,
        percentage: this.analytics.totalTokens > 0 ? ((this.analytics.tokens.image / this.analytics.totalTokens) * 100).toFixed(1) : 0
      }
    }
  };
  
  // Add usage limits info for normal users
  if (this.role === 'user') {
    return {
      ...baseAnalytics,
      limits: {
        monthlyTokenLimit: this.userSettings.monthlyTokenLimit,
        monthlyRequestLimit: this.userSettings.monthlyRequestLimit,
        currentMonthTokens: this.analytics.currentMonthTokens,
        currentMonthRequests: this.analytics.currentMonthRequests,
        tokensRemaining: Math.max(0, this.userSettings.monthlyTokenLimit - this.analytics.currentMonthTokens),
        requestsRemaining: Math.max(0, this.userSettings.monthlyRequestLimit - this.analytics.currentMonthRequests),
        tokenUsagePercentage: ((this.analytics.currentMonthTokens / this.userSettings.monthlyTokenLimit) * 100).toFixed(1),
        requestUsagePercentage: ((this.analytics.currentMonthRequests / this.userSettings.monthlyRequestLimit) * 100).toFixed(1)
      }
    };
  }
  
  // For admins, include admin-specific analytics
  return {
    ...baseAnalytics,
    adminInfo: {
      hasUnlimitedUsage: this.adminSettings.hasUnlimitedUsage,
      lastAdminAction: this.adminSettings.lastAdminAction,
      adminActionCount: this.adminSettings.adminActionCount,
      permissions: {
        canManageUsers: this.adminSettings.canManageUsers,
        canViewSystemAnalytics: this.adminSettings.canViewSystemAnalytics,
        canManageSystemSettings: this.adminSettings.canManageSystemSettings,
        canAccessLogs: this.adminSettings.canAccessLogs,
        canManageBilling: this.adminSettings.canManageBilling
      }
    }
  };
};

// Static method to create admin user
userSchema.statics.createAdmin = async function(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  adminPermissions?: Partial<AdminSettings>;
}) {
  const adminUser = new this({
    ...userData,
    role: 'admin',
    adminSettings: {
      canManageUsers: true,
      canViewSystemAnalytics: true,
      canManageSystemSettings: true,
      canAccessLogs: true,
      canManageBilling: true,
      hasUnlimitedUsage: true,
      canOverrideUserLimits: true,
      ...userData.adminPermissions
    }
  });
  
  return await adminUser.save();
};

// Static method to get user type summary
userSchema.statics.getUserTypeSummary = async function() {
  const totalUsers = await this.countDocuments();
  const activeUsers = await this.countDocuments({ isActive: true });
  const adminUsers = await this.countDocuments({ role: 'admin' });
  const normalUsers = await this.countDocuments({ role: 'user' });
  
  return {
    total: totalUsers,
    active: activeUsers,
    inactive: totalUsers - activeUsers,
    admins: adminUsers,
    normalUsers: normalUsers,
    adminPercentage: totalUsers > 0 ? ((adminUsers / totalUsers) * 100).toFixed(1) : 0
  };
};

export default mongoose.model<IUserDocument, IUserModel>('User', userSchema);