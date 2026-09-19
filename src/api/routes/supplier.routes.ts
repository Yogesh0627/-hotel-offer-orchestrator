import { Router } from 'express';

import { getSupplierHotels } from '../controllers';

const router = Router();

router.get('/supplierA/hotels', (req, res, next) =>
    getSupplierHotels(req, res, next, 'A'),
);

router.get('/supplierB/hotels', (req, res, next) =>
    getSupplierHotels(req, res, next, 'B'),
);

export { router as supplierRoutes };