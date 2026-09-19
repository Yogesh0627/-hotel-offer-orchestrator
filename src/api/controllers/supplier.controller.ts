import { NextFunction, Request, Response } from 'express';
import { supplierAHotels, supplierBHotels } from '../../data';
import { AppError } from '../../utils';

type Supplier = 'A' | 'B';

export const getSupplierHotels = (
    req: Request,
    res: Response,
    next: NextFunction,
    supplier: Supplier,
): void => {
    try {
        const { city } = req.query;

        if (typeof city !== 'string' || !city.trim()) {
            throw new AppError(400, 'City query parameter is required');
        }

        const isSupplierDown =
            supplier === 'A'
                ? process.env.MOCK_SUPPLIER_A_DOWN === 'true'
                : process.env.MOCK_SUPPLIER_B_DOWN === 'true';

        if (isSupplierDown) {
            throw new AppError(
                503,
                `Supplier ${supplier} is currently unavailable`,
            );
        }

        const hotels = supplier === 'A'
            ? supplierAHotels
            : supplierBHotels;

        const filteredHotels = hotels.filter(
            (hotel) =>
                hotel.city.toLowerCase() === city.toLowerCase(),
        );

        res.status(200).json({
            success: true,
            message:
                filteredHotels.length > 0
                    ? 'Hotels Listing'
                    : 'No Data Found',
            hotels: filteredHotels,
        });
    } catch (error) {
        next(error);
    }
};