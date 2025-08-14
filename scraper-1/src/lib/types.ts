export enum AptSource {
	KIJIJI = "KIJIJI",
}

export type Listing = {
	name: string;
	description: string;
	imageUrl: string;
	url: string;
	address: string;
	price: number;
	priceCurrency: string;
	source: AptSource;
	size: number; // 0 is for studio, 1 is for 1 bedroom, 2 for 2 bedrooms, etc.
	petsAllowed?: boolean;
};
