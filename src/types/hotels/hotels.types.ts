export interface SupplierHotel {
    hotelId: string;
    name: string;
    price: number;
    city: string;
    commissionPct: number;
}

export interface HotelOffer extends SupplierHotel {
    supplier: 'Supplier A' | 'Supplier B';
}

export interface HotelWorkflowResult {
    hotels: HotelOffer[];
    warnings: string[];
}