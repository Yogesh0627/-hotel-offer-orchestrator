import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils';
import { logger } from '../../utils';

export const errorHandler = (
    error: unknown,
    req: Request,
    res: Response,
    _next: NextFunction,
): void => {
    logger.error(
        {
            error,
            errorName:
                error instanceof Error ? error.name : typeof error,
            errorMessage:
                error instanceof Error ? error.message : String(error),
            method: req.method,
            path: req.path,
        },
        'Request failed',
    );

    if (error instanceof AppError) {
        res.status(error.statusCode).json({
            success: false,
            message: error.message,
        });

        return;
    }

    res.status(500).json({
        success: false,
        message: 'Internal server error',
    });
};