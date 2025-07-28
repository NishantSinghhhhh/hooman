// routes/queryRoutes.ts
import { Router } from 'express';
import QueryController from '../controllers/queryController';
import { authenticateToken } from '../middleware/auth';
import { 
  rateLimiters,
  getRateLimitStatus,
  validateFileSize 
} from '../utils/ratelimitquery';

const router = Router();
const queryController = new QueryController();

// Submit query with comprehensive rate limiting
router.post(
  '/submit',
  authenticateToken,                    // Authentication first
  validateFileSize,                     // Check file size limits
  rateLimiters.submitSlowDown,          // Progressive slow down
  rateLimiters.submitQuery,             // Strict rate limiting
  queryController.uploadMiddleware,     // File upload handling
  queryController.submitQuery           // Final controller
);

// Poll for result with general API rate limiting
router.get(
  '/:queryId', 
  authenticateToken, 
  rateLimiters.generalApi, 
  queryController.getQueryResult
);

// Query status with general API rate limiting
router.get(
  '/queries/:queryId/status', 
  authenticateToken, 
  rateLimiters.generalApi, 
  queryController.getQueryStatus
);

// Query history (potentially heavy operation)
router.get(
  '/history/:userId', 
  authenticateToken, 
  rateLimiters.heavyOperation, 
  queryController.getQueryHistory
);

// Rate limit status endpoint (for monitoring/debugging)
router.get(
  '/rate-limit/status',
  authenticateToken,
  (req, res) => {
    const status = getRateLimitStatus(req);
    res.json({
      success: true,
      rateLimitStatus: status,
      timestamp: new Date().toISOString()
    });
  }
);

// System endpoints (no rate limiting)
router.get('/system/capabilities', queryController.getCapabilities);
router.get('/system/health', queryController.healthCheck);

export default router;