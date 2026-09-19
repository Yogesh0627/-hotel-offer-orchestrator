import { Router } from 'express';
import { getHotels } from '../controllers';

const router = Router();

router.get('/api/hotels', getHotels);

export { router as hotelRoutes };