import { storeListings } from "./lib/db-utils";
import { scrapeCentris, scrapeKijiji } from "./lib/scrape-utils";
import { AptSource } from "./lib/types";

export const scrape1Handler = async () => {
	if (process.env.ENV !== "PROD") {
		const dotenv = await import("dotenv");
		dotenv.config();
	}

	try {
		// Scrape kijiji
		// TODO: when adding more sites, convert to a Promise.allSettled
		// const kijijiListings = await scrapeKijiji();

		// Scrape Centris
		const centrisListings = await scrapeCentris();
		return {
			first: centrisListings.slice(0, 5),
			second: centrisListings.slice(-5),
			listings: centrisListings.length,
		};

		// Store in the database
		// TODO: when adding more sites, convert to a Promise.allSettled
		// const createdListings = await storeListings(
		// 	kijijiListings,
		// 	AptSource.KIJIJI
		// );

		// return {
		// 	// listings: createdListings,
		// 	environment: process.env.ENV,
		// 	message: `created ${createdListings.length} listing${
		// 		createdListings.length !== 1 ? "s" : ""
		// 	}`,
		// };
	} catch (err) {
		console.log(err);
		return {
			statusCode: 500,
			message: "Unable to complete scrape1Handler",
		};
	}
};
