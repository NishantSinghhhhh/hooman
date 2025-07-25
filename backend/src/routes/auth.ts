// src/routes/auth.ts
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  getProfile,
  verifyToken,
  registerValidation,
  loginValidation
} from '@/controllers/authController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Increased from 5 to 10 for better UX
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration limiter (stricter)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 registration attempts per hour
  message: {
    success: false,
    error: 'Too many registration attempts, please try again later'
  }
});

// Public routes
router.post('/register', registerLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.get('/verify', authenticateToken, verifyToken); // New route for NextAuth

// Health check for auth service
// Fix: Prefix 'req' with an underscore to indicate it's intentionally unused
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Auth service is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
