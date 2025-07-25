import jwt from 'jsonwebtoken';
import { IJwtPayload } from '@/types/auth';

export const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }


  return jwt.sign(
    { userId },
    secret,
  );
};

export const verifyToken = (token: string): IJwtPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.verify(token, secret) as IJwtPayload;
};