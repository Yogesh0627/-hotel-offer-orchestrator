import { redisClient } from './redis.client';
import { HotelOffer } from '../types';

const getHotelKey = (city: string, hotelName: string): string =>
    `hotel:${city.trim().toLowerCase()}:${hotelName.trim().toLowerCase()}`;

const getPriceIndexKey = (city: string): string =>
    `hotels:price:${city.trim().toLowerCase()}`;

export async function saveHotels(
    city: string,
    hotels: HotelOffer[],
): Promise<void> {
    const priceIndexKey = getPriceIndexKey(city);

    const existingHotelKeys = await redisClient.zRange(
        priceIndexKey,
        0,
        -1,
    );

    if (existingHotelKeys.length > 0) {
        await redisClient.del(existingHotelKeys);
    }

    await redisClient.del(priceIndexKey);

    for (const hotel of hotels) {
        const hotelKey = getHotelKey(hotel.city, hotel.name);

        await redisClient.set(
            hotelKey,
            JSON.stringify(hotel),
        );

        await redisClient.zAdd(priceIndexKey, {
            score: hotel.price,
            value: hotelKey,
        });
    }
}

export async function getHotelsByPriceRange(
    city: string,
    minPrice?: number,
    maxPrice?: number,
): Promise<HotelOffer[]> {
    const priceIndexKey = getPriceIndexKey(city);

    const min = minPrice ?? '-inf';
    const max = maxPrice ?? '+inf';

    const hotelKeys = await redisClient.zRangeByScore(
        priceIndexKey,
        min,
        max,
    );

    if (hotelKeys.length === 0) {
        return [];
    }

    const hotelValues = await redisClient.mGet(hotelKeys);

    return hotelValues
        .filter((value): value is string => value !== null)
        .map((value) => JSON.parse(value) as HotelOffer);
}