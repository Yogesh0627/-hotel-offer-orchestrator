import { Request, Response } from 'express';
import { isRedisHealthy } from '../../redis/redis.client';
import { isTemporalHealthy } from '../../temporal/client';

interface DependencyHealth {
    status: 'up' | 'down';
    statusCode?: number;
}

async function checkSupplier(
    baseUrl: string,
    path: string,
): Promise<DependencyHealth> {
    try {
        const response = await fetch(
            `${baseUrl}${path}?city=delhi`,
        );

        return response.ok
            ? {
                status: 'up',
                statusCode: response.status,
            }
            : {
                status: 'down',
                statusCode: response.status,
            };
    } catch {
        return {
            status: 'down',
        };
    }
}

export async function getHealth(
    _req: Request,
    res: Response,
): Promise<void> {
    const supplierBaseUrl =
        process.env.SUPPLIER_BASE_URL || 'http://localhost:3000';

    const [
        redisHealthy,
        temporalHealthy,
        supplierA,
        supplierB,
    ] = await Promise.all([
        Promise.resolve(isRedisHealthy()),
        isTemporalHealthy(),
        checkSupplier(
            supplierBaseUrl,
            '/supplierA/hotels',
        ),
        checkSupplier(
            supplierBaseUrl,
            '/supplierB/hotels',
        ),
    ]);

    const allDependenciesHealthy =
        redisHealthy &&
        temporalHealthy &&
        supplierA.status === 'up' &&
        supplierB.status === 'up';

    res.status(200).json({
        success: true,
        status: allDependenciesHealthy
            ? 'healthy'
            : 'degraded',
        dependencies: {
            redis: {
                status: redisHealthy ? 'up' : 'down',
            },
            temporal: {
                status: temporalHealthy ? 'up' : 'down',
            },
            suppliers: {
                supplierA,
                supplierB,
            },
        },
    });
}