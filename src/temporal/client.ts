import {
    Client,
    Connection,
    WorkflowFailedError,
} from '@temporalio/client';

import { hotelWorkflow } from './workflows/hotel.workflow';
import { HotelOffer, HotelWorkflowResult } from '../types';
import { AppError } from '../utils';

let temporalClient: Client | null = null;



export async function getTemporalClient(): Promise<Client> {
    if (temporalClient) {
        return temporalClient;
    }

    const connection = await Connection.connect({
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    });

    temporalClient = new Client({
        connection,
        namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    });

    return temporalClient;
}

export async function startHotelWorkflow(
    city: string,
): Promise<HotelWorkflowResult> {
    const client = await getTemporalClient();

    const handle = await client.workflow.start(hotelWorkflow, {
        taskQueue:
            process.env.TEMPORAL_TASK_QUEUE || 'hotel-offer-task-queue',
        workflowId: `hotel-offer-${city}-${Date.now()}`,
        args: [city],
    });

    try {
        return await handle.result();
    } catch (error) {
        if (error instanceof WorkflowFailedError) {
            const cause = error.cause as {
                type?: string;
                message?: string;
            } | undefined;

            if (cause?.type === 'SUPPLIERS_UNAVAILABLE') {
                throw new AppError(
                    503,
                    cause.message || 'Both hotel suppliers are unavailable',
                );
            }
        }

        throw error;
    }
}

export async function isTemporalHealthy(): Promise<boolean> {
    try {
        await getTemporalClient();

        return true;
    } catch (error) {
        return false;
    }
}