import { ApplicationFailure } from '@temporalio/activity';
import { SupplierHotel } from '../../types';
import { logger } from '../../utils';

export async function fetchSupplierBHotels(
    city: string,
): Promise<SupplierHotel[]> {
    logger.info(
        { city },
        'Fetching hotels from Supplier B',
    );

    const supplierBaseUrl =
        process.env.SUPPLIER_BASE_URL || 'http://localhost:3000';


    try {
        const response = await fetch(
            `${supplierBaseUrl}/supplierB/hotels?city=${encodeURIComponent(city)}`,
        );

        if (!response.ok) {
            logger.warn(
                {
                    city,
                    statusCode: response.status,
                },
                'Supplier B unavailable',
            );

            const message =
                `Supplier B request failed with status ${response.status}`;

            if (response.status >= 400 && response.status < 500) {
                throw ApplicationFailure.create({
                    message,
                    type: 'SUPPLIER_CLIENT_ERROR',
                    nonRetryable: true,
                });
            }

            throw ApplicationFailure.create({
                message,
                type: 'SUPPLIER_SERVER_ERROR',
            });
        }

        const data = (await response.json()) as {
            message: string;
            hotels: SupplierHotel[];
        };

        logger.info(
            {
                city,
                hotelCount: data.hotels.length,
            },
            'Supplier B response received',
        );

        return data.hotels;
    } catch (error) {
        logger.error(
            {
                city,
                error,
            },
            'Supplier B request failed',
        );

        throw error;
    }
}