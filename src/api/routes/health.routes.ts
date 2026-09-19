import { Router } from 'express';
import { getHealth } from '../controllers';

const router = Router();

router.get('/health', getHealth);

export { router as healthRoutes };