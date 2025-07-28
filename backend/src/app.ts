import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import { IApiResponse } from './types/api';
import queryRoutes from "./routes/queryRoutes";

// Load environment variables
dotenv.config();

class App {
  public app: Application;

  constructor() {
    this.app = express();

    this.initializeDatabase();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/multimodal-ai';
      await mongoose.connect(mongoUri);
      console.log('✅ MongoDB connected successfully');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      process.exit(1);
    }
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(
      helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
      })
    );

    // Allowed origins for CORS (add your frontend URLs here)
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002', // Added your frontend port here
    ];

    // CORS configuration
    this.app.use(
      cors({
        origin: function (origin, callback) {
          // allow requests with no origin (like mobile apps or curl requests)
          if (!origin) return callback(null, true);
          if (allowedOrigins.indexOf(origin) === -1) {
            const msg = `The CORS policy for this site does not allow access from the specified Origin.`;
            return callback(new Error(msg), false);
          }
          return callback(null, true);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
          'Origin',
          'X-Requested-With',
          'Content-Type',
          'Accept',
          'Authorization',
          'Cache-Control',
          'Pragma',
        ],
      })
    );

    // Handle preflight requests
    this.app.options('*', cors());

    // Logging (skip in test environment)
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined'));
    }

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging for debugging
    this.app.use((req, _res, next) => {
      console.log(`${req.method} ${req.path}`, req.body);
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (_req, res: express.Response) => {
      res.json({
        success: true,
        message: 'Server is running',
        data: {
          status: 'OK',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
          version: '1.0.0',
        },
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use("/api/query", queryRoutes);
    // Root route
    this.app.get('/', (_req, res) => {
      res.json({
        success: true,
        message: 'Multimodal AI Backend API',
        data: {
          version: '1.0.0',
          endpoints: {
            auth: '/api/auth',
            health: '/health',
          },
        },
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use('*', notFoundHandler);

    // Error handler
    this.app.use(errorHandler);
  }
}

export default new App().app;
