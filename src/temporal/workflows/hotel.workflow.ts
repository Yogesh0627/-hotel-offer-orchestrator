import { proxyActivities, ApplicationFailure } from '@temporalio/workflow';
import { HotelOffer, HotelWorkflowResult, SupplierHotel } from '../../types';
import type * as activities from '../activities';



const {
    fetchSupplierAHotels,
    fetchSupplierBHotels,
} = proxyActivities<typeof activities>({
    startToCloseTimeout: '30 seconds',
    retry: {
        maximumAttempts: 3,
    },
});

const { saveHotelsToRedis } = proxyActivities<typeof activities>({
    startToCloseTimeout: '10 seconds',
    retry: {
        maximumAttempts: 3,
    },
});

export async function hotelWorkflow(
    city: string,
): Promise<HotelWorkflowResult> {
    const [supplierAResult, supplierBResult] =
        await Promise.allSettled([
            fetchSupplierAHotels(city),
            fetchSupplierBHotels(city),
        ]);



    const supplierAFailed =
        supplierAResult.status === 'rejected';

    const supplierBFailed =
        supplierBResult.status === 'rejected';

    const warnings: string[] = [];

    if (supplierAFailed) {
        warnings.push('Supplier A is currently unavailable');
    }

    if (supplierBFailed) {
        warnings.push('Supplier B is currently unavailable');
    }

    if (supplierAFailed && supplierBFailed) {
        throw ApplicationFailure.create({
            message: `Both hotel suppliers are unavailable for city: ${city}`,
            type: 'SUPPLIERS_UNAVAILABLE',
        });
    }

    const supplierAHotels =
        supplierAResult.status === 'fulfilled'
            ? supplierAResult.value
            : [];

    const supplierBHotels =
        supplierBResult.status === 'fulfilled'
            ? supplierBResult.value
            : [];

    const hotelsByName = new Map<string, HotelOffer>();

    const addHotels = (
        hotels: SupplierHotel[],
        supplier: 'Supplier A' | 'Supplier B',
    ) => {
        for (const hotel of hotels) {
            const key = hotel.name.trim().toLowerCase();

            const offer: HotelOffer = {
                ...hotel,
                supplier,
            };

            const existing = hotelsByName.get(key);

            if (!existing || offer.price < existing.price) {
                hotelsByName.set(key, offer);
            }
        }
    };

    addHotels(supplierAHotels, 'Supplier A');
    addHotels(supplierBHotels, 'Supplier B');

    const finalHotels = Array.from(hotelsByName.values());

    await saveHotelsToRedis(city, finalHotels);

    return {
        hotels: finalHotels,
        warnings,
    };
}