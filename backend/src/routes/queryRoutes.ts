import { Router } from 'express';
import QueryController from '../controllers/queryController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const queryController = new QueryController();

router.post(
  '/submit',
  authenticateToken,
  queryController.uploadMiddleware,
  queryController.submitQuery
);

// Poll for result
router.get('/:queryId', authenticateToken, queryController.getQueryResult);
// History
// In your routes file (e.g., routes/queryRoutes.ts)
router.get('/queries/:queryId/status', authenticateToken, queryController.getQueryStatus);
router.get('/history/:userId', authenticateToken, queryController.getQueryHistory);
// System info
router.get('/system/capabilities', queryController.getCapabilities);
router.get('/system/health', queryController.healthCheck);

export default router;
