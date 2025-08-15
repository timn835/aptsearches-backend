import { KIJIJI_URLS, scrapeKijiji } from "./lib/scrape-utils";
import { type Listing } from "./lib/types";
import { sleep } from "./lib/utils";

export const scrape1Handler = async () => {
	if (process.env.ENV !== "PROD") {
		const dotenv = await import("dotenv");
		dotenv.config();
	}
	try {
		const listings: Listing[] = [];
		const listingsTracker = new Set<string>();
		let initialLength = 0;

		// Scrape kijiji
		for (const url of KIJIJI_URLS) {
			const scrapedLstings = await scrapeKijiji(url);
			initialLength += scrapedLstings.length;
			for (const listing of scrapedLstings) {
				if (listingsTracker.has(listing.id)) continue;
				listingsTracker.add(listing.id);
				listings.push(listing);
			}
			await sleep(1000);
		}

		// Scrape another site here

		// Store in the database

		return {
			listings,
			initialLength,
			length: listings.length,
			environment: process.env.ENV,
		};
	} catch (err) {
		console.log(err);
		return {
			statusCode: 500,
			message: "Unable to complete scrape1Handler",
		};
	}
};
