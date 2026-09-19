import { NextFunction, Request, Response } from 'express';
import { startHotelWorkflow } from '../../temporal/client';
import { getHotelsByPriceRange } from '../../redis/hotel-redis.service';
import { AppError } from '../../utils';

export async function getHotels(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const { city, minPrice, maxPrice } = req.query;


        if (typeof city !== 'string' || !city.trim()) {
            throw new AppError(400, 'City query parameter is required');
        }

        const min = minPrice !== undefined ? Number(minPrice) : undefined;
        const max = maxPrice !== undefined ? Number(maxPrice) : undefined;

        if (minPrice !== undefined && Number.isNaN(min)) {
            throw new AppError(400, 'Minimum price must a valid number');
        }

        if (maxPrice !== undefined && Number.isNaN(max)) {
            throw new AppError(400, 'Maximum price must be a valid number');
        }

        if (min !== undefined && max !== undefined && min > max) {
            throw new AppError(400, 'Minimum price cannot be greater than maximum price');
        }

        const workflowResult = await startHotelWorkflow(city)

        const hotels = await getHotelsByPriceRange(city, min, max);

        res.status(200).json({
            success: true,
            message: 'hotels list',
            warnings: workflowResult.warnings,
            hotels,
        });
    } catch (error) {
        next(error);
    }
}