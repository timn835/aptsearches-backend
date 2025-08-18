export enum AptSource {
	KIJIJI = "KIJIJI",
	CENTRIS = "CENTRIS",
	FBMARKETPLACE = "FBMARKETPLACE",
}

export type Listing = {
	id: string;
	dateFound: number;
	name: string;
	description: string;
	imageUrl: string;
	url: string;
	address: string;
	price: number;
	priceCurrency: string;
	aptSource: AptSource;
	size: number; // 0 is for studio, 1 is for 1 bedroom, 2 for 2 bedrooms, etc.
	petsAllowed?: boolean;
	neighborhood?: string; // this will be added later on
};
