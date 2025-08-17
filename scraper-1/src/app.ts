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
		let [kijijiResult, centrisResult] = await Promise.allSettled([
			scrapeKijiji(),
			scrapeCentris(),
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

		// Store in the database
		// TODO: when adding more sites, convert to a Promise.allSettled
		[kijijiResult, centrisResult] = await Promise.allSettled([
			storeListings(kijijiListings, AptSource.KIJIJI),
			storeListings(centrisListings, AptSource.CENTRIS),
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

		return {
			environment: process.env.ENV,
			message: `created ${createdKijijiListings.length} Kijiji listing${
				createdKijijiListings.length !== 1 ? "s" : ""
			}, created ${createdCentrisListings.length} Centris listing${
				createdCentrisListings.length !== 1 ? "s" : ""
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
