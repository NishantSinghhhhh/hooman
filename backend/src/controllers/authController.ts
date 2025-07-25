// src/controllers/authController.ts
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import User from '@/models/User';
import { generateToken } from '@/utils/jwt';
import { 
  IRegisterRequest, 
  ILoginRequest, 
  IAuthResponse, 
  IUserResponse 
} from '@/types/auth';
import { IApiResponse } from '@/types/api';

export const register = async (
  req: Request<{}, IApiResponse<IAuthResponse>, IRegisterRequest>,
  res: Response<IApiResponse<IAuthResponse>>
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

    const { email, password, firstName, lastName } = req.body;

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
      lastName
    });

    await user.save();

    // Generate token
    const token = generateToken(user.id.toString());

    const userResponse: IUserResponse = {
      id: user.id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        message: 'User registered successfully',
        token,
        user: userResponse
      }
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
  req: Request<{}, IApiResponse<IAuthResponse>, ILoginRequest>,
  res: Response<IApiResponse<IAuthResponse>>
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

    const userResponse: IUserResponse = {
      id: user.id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      lastLogin: user.lastLogin
    };

    res.json({
      success: true,
      data: {
        message: 'Login successful',
        token,
        user: userResponse
      }
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
  res: Response<IApiResponse<IUserResponse>>
): Promise<void> => {
  try {
    const userResponse: IUserResponse = {
      id: req.user!._id,
      email: req.user!.email,
      firstName: req.user!.firstName,
      lastName: req.user!.lastName,
      role: req.user!.role,
      lastLogin: req.user!.lastLogin
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
  res: Response<IApiResponse<IUserResponse>>
): Promise<void> => {
  try {
    // User is already attached by the authenticateToken middleware
    const userResponse: IUserResponse = {
      id: req.user!._id,
      email: req.user!.email,
      firstName: req.user!.firstName,
      lastName: req.user!.lastName,
      role: req.user!.role,
      lastLogin: req.user!.lastLogin
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
    .withMessage('Last name is required')
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