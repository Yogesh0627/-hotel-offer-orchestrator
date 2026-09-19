import { NextFunction, Request, Response } from 'express';
import { logger } from '../../utils/logger';

export function requestLogger(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    const startTime = Date.now();

    logger.info(
        {
            method: req.method,
            path: req.originalUrl,
        },
        'Incoming request',
    );

    res.on('finish', () => {
        logger.info(
            {
                method: req.method,
                path: req.originalUrl,
                statusCode: res.statusCode,
                durationMs: Date.now() - startTime,
            },
            'Request completed',
        );
    });

    next();
}