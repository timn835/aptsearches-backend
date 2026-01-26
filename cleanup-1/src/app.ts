import { deleteOldListings, getTotalListingsCount } from "./lib/db-utils";
import { AptSource } from "./lib/types";

export const cleanup1Handler = async () => {
	if (process.env.ENV !== "PROD") {
		const dotenv = await import("dotenv");
		dotenv.config();
	}

	const totalListingCount = await getTotalListingsCount();

	// Get limit date
	const LIMIT_DATE = `${new Date().getTime() - 30 * 24 * 60 * 60}`;

	// Delete kijiji
	const deletedKijijiListings = await deleteOldListings(
		AptSource.KIJIJI,
		LIMIT_DATE,
	);
	const deletedCentrisListings = await deleteOldListings(
		AptSource.CENTRIS,
		LIMIT_DATE,
	);
	const deletedFBMarketplaceListings = await deleteOldListings(
		AptSource.FBMARKETPLACE,
		LIMIT_DATE,
	);

	return {
		totalListingCount,
		deletedKijijiListings: deletedKijijiListings.length,
		deletedCentrisListings: deletedCentrisListings.length,
		deletedFBMarketplaceListings: deletedFBMarketplaceListings.length,
	};
};
