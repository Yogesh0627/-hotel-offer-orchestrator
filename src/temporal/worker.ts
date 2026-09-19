import { NativeConnection, Worker } from '@temporalio/worker';
import 'dotenv/config';
import * as activities from './activities';
import { connectRedis } from '../redis/redis.client';

async function run() {
    await connectRedis();
    const connection = await NativeConnection.connect({
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    });

    const worker = await Worker.create({
        connection,
        namespace: process.env.TEMPORAL_NAMESPACE || 'default',
        taskQueue:
            process.env.TEMPORAL_TASK_QUEUE || 'hotel-offer-task-queue',
        workflowsPath: require.resolve('./workflows/hotel.workflow'),
        activities,
    });

    await worker.run();
}

run().catch((error) => {
    console.error('Temporal worker failed', error);
    process.exit(1);
});