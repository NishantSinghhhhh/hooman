// backend/routes/queryRoutes.ts
import { Router } from 'express';
import QueryController from '../controllers/queryController';
import { authenticateToken } from '../middleware/auth';  // Your JWT auth middleware

const router = Router();
const queryController = new QueryController();

router.use(authenticateToken); // Protect all routes; ensure req.user is set

// Upload middleware needed for submit route
router.post(
    '/submit',
    authenticateToken, // 1. First, authenticate the user
    queryController.uploadMiddleware, // 2. THEN, use multer to parse form data and files
    queryController.submitQuery // 3. Finally, run your main controller logic
  );

export default router;
