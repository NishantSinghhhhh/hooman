// src/types/auth.ts
import { Types } from 'mongoose';

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  lastLogin?: Date;
}

export interface IRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IAuthResponse {
  message: string;
  token: string;
  user: IUserResponse;
}

export interface IJwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}