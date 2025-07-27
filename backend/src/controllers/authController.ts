// src/controllers/authController.ts
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import User from '@/models/User';
import { generateToken } from '@/utils/jwt';
import { 
  RegisterData, 
  LoginCredentials, 
  AuthResponse,
  AuthApiResponse,
  IUser
} from '@/types/auth';
import { IApiResponse } from '@/types/api';

// Define user response interface for API responses
interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  lastLogin?: Date;
  isActive: boolean;
}

export const register = async (
  req: Request<{}, IApiResponse<AuthApiResponse>, RegisterData>,
  res: Response<IApiResponse<AuthApiResponse>>
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
      return;
    }

    const { email, password, firstName, lastName, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ 
        success: false,
        error: 'User already exists with this email' 
      });
      return;
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      role: role || 'user' // Default to 'user' if no role specified
    });

    await user.save();

    // Generate token
    const token = generateToken(user.id.toString());

    const authResponse: AuthApiResponse = {
      user: {
        id: user.id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive
      },
      token
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: authResponse
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error during registration' 
    });
  }
};

export const login = async (
  req: Request<{}, IApiResponse<AuthApiResponse>, LoginCredentials>,
  res: Response<IApiResponse<AuthApiResponse>>
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
      return;
    }

    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401).json({ 
        success: false,
        error: 'Invalid email or password' 
      });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(401).json({ 
        success: false,
        error: 'Account is deactivated. Please contact support.' 
      });
      return;
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({ 
        success: false,
        error: 'Invalid email or password' 
      });
      return;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user.id.toString());

    const authResponse: AuthApiResponse = {
      user: {
        id: user.id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        lastLogin: user.lastLogin,
        isActive: user.isActive
      },
      token
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: authResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error during login' 
    });
  }
};

export const getProfile = async (
  req: Request,
  res: Response<IApiResponse<UserResponse>>
): Promise<void> => {
  try {
    const userResponse: UserResponse = {
      id: req.user!._id,
      email: req.user!.email,
      firstName: req.user!.firstName,
      lastName: req.user!.lastName,
      role: req.user!.role,
      lastLogin: req.user!.lastLogin,
      isActive: req.user!.isActive
    };

    res.json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error while fetching profile' 
    });
  }
};

// New endpoint to verify token (useful for NextAuth)
export const verifyToken = async (
  req: Request,
  res: Response<IApiResponse<UserResponse>>
): Promise<void> => {
  try {
    // User is already attached by the authenticateToken middleware
    const userResponse: UserResponse = {
      id: req.user!._id,
      email: req.user!.email,
      firstName: req.user!.firstName,
      lastName: req.user!.lastName,
      role: req.user!.role,
      lastLogin: req.user!.lastLogin,
      isActive: req.user!.isActive
    };

    res.json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error during token verification' 
    });
  }
};

// Admin-specific endpoints
export const createAdmin = async (
  req: Request<{}, IApiResponse<AuthApiResponse>, RegisterData & { adminPermissions?: any }>,
  res: Response<IApiResponse<AuthApiResponse>>
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
      return;
    }

    // Check if current user is admin with user management permissions
    if (!req.user || req.user.role !== 'admin' || !req.user.canManageUsers()) {
      res.status(403).json({ 
        success: false,
        error: 'Insufficient permissions to create admin users' 
      });
      return;
    }

    const { email, password, firstName, lastName, adminPermissions } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ 
        success: false,
        error: 'User already exists with this email' 
      });
      return;
    }

    // Create admin user using static method
    const adminUser = await User.createAdmin({
      email,
      password,
      firstName,
      lastName,
      adminPermissions
    });

    // Generate token
    const token = generateToken(adminUser.id.toString());

    const authResponse: AuthApiResponse = {
      user: {
        id: adminUser.id.toString(),
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        role: adminUser.role,
        isActive: adminUser.isActive
      },
      token
    };

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: authResponse
    });
  } catch (error) {
    console.error('Admin creation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error during admin creation' 
    });
  }
};

export const getUserSummary = async (
  req: Request,
  res: Response<IApiResponse<any>>
): Promise<void> => {
  try {
    // Check if current user is admin
    if (!req.user || req.user.role !== 'admin' || !req.user.canViewSystemAnalytics()) {
      res.status(403).json({ 
        success: false,
        error: 'Insufficient permissions to view user summary' 
      });
      return;
    }

    const summary = await User.getUserTypeSummary();

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('User summary error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error while fetching user summary' 
    });
  }
};

// Validation rules
export const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Last name is required'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin')
];

export const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .exists()
    .withMessage('Password is required')
];

export const adminValidation = [
  ...registerValidation,
  body('adminPermissions')
    .optional()
    .isObject()
    .withMessage('Admin permissions must be an object')
];