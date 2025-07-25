import { Request, Response, NextFunction } from 'express';
import { IApiResponse } from '@/types/api';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response<IApiResponse>,
  _next: NextFunction
): void => {
  console.error(err.stack);
  
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message
  });
};

export const notFoundHandler = (
  _req: Request,
  res: Response<IApiResponse>
): void => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
};