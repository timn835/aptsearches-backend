import { storeListings } from "./lib/db-utils";
import { scrapeCentris } from "./lib/scrape-centris";
import { scrapeFBMarketplace } from "./lib/scrape-fbmarketplace";
import { scrapeKijiji } from "./lib/scrape-kijiji";
import { AptSource } from "./lib/types";

export const scrape1Handler = async () => {
	if (process.env.ENV !== "PROD") {
		const dotenv = await import("dotenv");
		dotenv.config();
	}

	try {
		let [kijijiResult, centrisResult, fbmarketplaceResult] =
			await Promise.allSettled([
				scrapeKijiji(),
				scrapeCentris(),
				scrapeFBMarketplace(),
			]);

		const kijijiListings =
			kijijiResult.status === "fulfilled" ? kijijiResult.value : [];
		if (kijijiResult.status === "rejected") {
			console.error("Error scraping Kijiji:", kijijiResult.reason);
		}

		const centrisListings =
			centrisResult.status === "fulfilled" ? centrisResult.value : [];
		if (centrisResult.status === "rejected") {
			console.error("Error scraping Centris:", centrisResult.reason);
		}

		const fbmarketplaceListings =
			fbmarketplaceResult.status === "fulfilled"
				? fbmarketplaceResult.value
				: [];
		if (fbmarketplaceResult.status === "rejected") {
			console.error(
				"Error scraping FBMarketplace:",
				fbmarketplaceResult.reason
			);
		}

		// Store in the database
		// TODO: when adding more sites, convert to a Promise.allSettled
		[kijijiResult, centrisResult, fbmarketplaceResult] =
			await Promise.allSettled([
				storeListings(kijijiListings, AptSource.KIJIJI),
				storeListings(centrisListings, AptSource.CENTRIS),
				storeListings(fbmarketplaceListings, AptSource.FBMARKETPLACE),
			]);

		const createdKijijiListings =
			kijijiResult.status === "fulfilled" ? kijijiResult.value : [];
		if (kijijiResult.status === "rejected") {
			console.error(
				"Error storing Kijiji listings:",
				kijijiResult.reason
			);
		}

		const createdCentrisListings =
			centrisResult.status === "fulfilled" ? centrisResult.value : [];
		if (centrisResult.status === "rejected") {
			console.error(
				"Error storing Centris listings:",
				centrisResult.reason
			);
		}

		const createdFBMarketplaceListings =
			fbmarketplaceResult.status === "fulfilled"
				? fbmarketplaceResult.value
				: [];
		if (fbmarketplaceResult.status === "rejected") {
			console.error(
				"Error storing FBMarketplace listings:",
				fbmarketplaceResult.reason
			);
		}

		return {
			environment: process.env.ENV,
			message: `Created ${createdKijijiListings.length} Kijiji listing${
				createdKijijiListings.length !== 1 ? "s" : ""
			}, ${createdCentrisListings.length} Centris listing${
				createdCentrisListings.length !== 1 ? "s" : ""
			}, ${createdFBMarketplaceListings.length} FBMarketplace listing${
				createdFBMarketplaceListings.length !== 1 ? "s" : ""
			}`,
		};
	} catch (err) {
		console.log(err);
		return {
			statusCode: 500,
			message: "Unable to complete scrape1Handler",
		};
	}
};
