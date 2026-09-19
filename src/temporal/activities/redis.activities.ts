import { HotelOffer } from '../../types';
import { saveHotels } from '../../redis/hotel-redis.service';
import { logger } from '../../utils';

export async function saveHotelsToRedis(
    city: string,
    hotels: HotelOffer[],
): Promise<void> {
    logger.info(
        { hotelCount: hotels.length },
        'Saving hotels to Redis',
    );

    await saveHotels(city, hotels);

    logger.info(
        { hotelCount: hotels.length },
        'Hotels saved to Redis',
    );
}