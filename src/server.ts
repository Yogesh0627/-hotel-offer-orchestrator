import 'dotenv/config';

import { app } from './api/app';
import { logger } from './utils';
import { connectRedis } from './redis';

async function startServer() {
    await connectRedis();

    const port = Number(process.env.PORT) || 3000;

    app.listen(port, () => {
        logger.info({ port }, 'HTTP server started');
    });
}

startServer().catch((error) => {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
});