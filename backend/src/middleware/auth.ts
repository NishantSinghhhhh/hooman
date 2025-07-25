import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/utils/jwt';
import User from '@/models/User';
import { IApiResponse } from '@/types/api';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response<IApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ 
        success: false,
        error: 'Access token required' 
      });
      return;
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      res.status(401).json({ 
        success: false,
        error: 'User not found' 
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({ 
      success: false,
      error: 'Invalid or expired token' 
    });
  }
};