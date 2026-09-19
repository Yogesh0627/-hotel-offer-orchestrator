import { createClient } from 'redis';
import { logger } from '../utils/logger';

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (error) => {
    logger.error({ error }, 'Redis client error');
});

redisClient.on('connect', () => {
    logger.info('Redis client connecting');
});

redisClient.on('ready', () => {
    logger.info('Redis client ready');
});

export async function connectRedis(): Promise<void> {
    if (redisClient.isOpen) {
        return;
    }

    await redisClient.connect();
    logger.info('Redis connected successfully');
}

export function isRedisHealthy(): boolean {
    return redisClient.isReady;
}

export { redisClient };