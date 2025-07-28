// utils/ratelimitquery.ts

import rateLimit from 'express-rate-limit'
import slowDown from 'express-slow-down'
import { Request, Response, NextFunction } from 'express'

// --- Types ---
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    role: string
    tier: 'free' | 'pro' | 'premium' | 'enterprise'
    email?: string
  }
}
type UserTier = 'free' | 'pro' | 'premium' | 'enterprise'

// --- Configs ---
const RATE_LIMIT_CONFIGS = {
  submitQuery: { windowMs: 15 * 60_000, limits: { free: 10, pro: 25, premium: 50, enterprise: 1000 } },
  generalApi:  { windowMs: 15 * 60_000, limits: { free: 150, pro: 300, premium: 500, enterprise: 2000 } },
  heavyOp:     { windowMs: 60 * 60_000, limits: { free: 20, pro: 50, premium: 100, enterprise: 500 } },
  fileUpload:  { windowMs: 60 * 60_000, limits: { free: 5, pro: 20, premium: 50, enterprise: 200 } }
}
const FILE_SIZE_LIMITS = {
  free: 10 * 1024 * 1024,
  pro: 50 * 1024 * 1024,
  premium: 100 * 1024 * 1024,
  enterprise: 500 * 1024 * 1024,
}

// --- Utilities ---
const getUserTier = (req: AuthenticatedRequest): UserTier => req.user?.tier || 'free'
const shouldSkip = (req: AuthenticatedRequest) =>
  req.user?.role === 'admin' || req.user?.tier === 'enterprise'

// --- Middleware: validate file size ---
export function validateFileSize(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const contentLength = req.get('content-length')
  if (!contentLength) return next()
  const userTier = getUserTier(req)
  const fileSize = parseInt(contentLength)
  const maxSize = FILE_SIZE_LIMITS[userTier]
  if (fileSize > maxSize) {
    return res.status(413).json({
      error: 'File too large',
      message: `Max allowed: ${(maxSize / (1024 * 1024)).toFixed(2)}MB`,
      code: 'FILE_SIZE_LIMIT_EXCEEDED',
      currentPlan: userTier,
      maxFileSize: `${(maxSize / (1024 * 1024)).toFixed(2)}MB`,
      actualFileSize: `${(fileSize / (1024 * 1024)).toFixed(2)}MB`,
      timestamp: new Date().toISOString()
    })
  }
  next()
}

// --- Status method for tier limits ---
export function getRateLimitStatus(req: AuthenticatedRequest) {
  const userTier = getUserTier(req)
  return {
    userId: req.user?.id,
    userTier,
    limits: {
      submitQuery: RATE_LIMIT_CONFIGS.submitQuery.limits[userTier],
      generalApi: RATE_LIMIT_CONFIGS.generalApi.limits[userTier],
      heavyOp: RATE_LIMIT_CONFIGS.heavyOp.limits[userTier],
      fileUpload: RATE_LIMIT_CONFIGS.fileUpload.limits[userTier]
    },
    fileSizeLimit: `${(FILE_SIZE_LIMITS[userTier] / (1024 * 1024)).toFixed(2)}MB`
  }
}

// --- Rate limiter instances ---
export const rateLimiters: any = {
  submitQuery: rateLimit({
    windowMs: RATE_LIMIT_CONFIGS.submitQuery.windowMs,
    max: (req: AuthenticatedRequest) => RATE_LIMIT_CONFIGS.submitQuery.limits[getUserTier(req)],
    standardHeaders: true,
    legacyHeaders: false,
    skip: shouldSkip
  }),
  generalApi: rateLimit({
    windowMs: RATE_LIMIT_CONFIGS.generalApi.windowMs,
    max: (req: AuthenticatedRequest) => RATE_LIMIT_CONFIGS.generalApi.limits[getUserTier(req)],
    standardHeaders: true,
    legacyHeaders: false,
    skip: shouldSkip
  }),
  heavyOp: rateLimit({
    windowMs: RATE_LIMIT_CONFIGS.heavyOp.windowMs,
    max: (req: AuthenticatedRequest) => RATE_LIMIT_CONFIGS.heavyOp.limits[getUserTier(req)],
    standardHeaders: true,
    legacyHeaders: false,
    skip: shouldSkip
  }),
  fileUpload: rateLimit({
    windowMs: RATE_LIMIT_CONFIGS.fileUpload.windowMs,
    max: (req: AuthenticatedRequest) => RATE_LIMIT_CONFIGS.fileUpload.limits[getUserTier(req)],
    standardHeaders: true,
    legacyHeaders: false,
    skip: shouldSkip
  }),
  slowDown: slowDown({
    windowMs: 15 * 60_000,
    delayAfter: 5,
    delayMs: 500
  }),
  validateFileSize
}

// --- Aliases for route compatibility ---
rateLimiters.submitSlowDown = rateLimiters.slowDown
rateLimiters.heavyOperation = rateLimiters.heavyOp

export default {
  rateLimiters,
  getRateLimitStatus,
  validateFileSize
}
