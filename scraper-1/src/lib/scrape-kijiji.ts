import * as cheerio from "cheerio";
import { KIJIJI_HEADERS, KIJIJI_URLS } from "./constants";
import { AptSource, type Listing } from "./types";
import { sleep } from "./utils";
// import { writeFile } from "node:fs/promises";

export async function scrapeKijiji(
	url?: string,
	bedrooms?: number
): Promise<Listing[]> {
	// Scrape all urls
	if (!url) {
		const listings: Listing[] = [];
		// Add a listings tracker to avoid duplicate listings
		const listingsTracker = new Set<string>();
		for (const { url, bedrooms } of KIJIJI_URLS) {
			const scrapedLstings = await scrapeKijiji(url, bedrooms);
			for (const listing of scrapedLstings) {
				if (listingsTracker.has(listing.id)) continue;
				listingsTracker.add(listing.id);
				listings.push(listing);
			}
			await sleep(1000);
		}
		return listings;
	}

	// Scrape single url
	const res = await fetch(url, { headers: KIJIJI_HEADERS });
	const html = await res.text();

	const $ = cheerio.load(html);

	// Get the raw JSON string inside the script tag
	const jsonText = $('script[type="application/ld+json"]').html();

	if (!jsonText)
		throw Error(
			"Unable to extract information from html, investigation needed"
		);

	// Parse it into a JS object
	let jsonData;

	try {
		jsonData = JSON.parse(jsonText);
	} catch (err) {
		console.error("Failed to parse JSON:", err);
	}

	// Get the timestamp
	let timeStamp = new Date().getTime() + jsonData.itemListElement.length;

	return jsonData.itemListElement.map((el: any) => {
		// get price as number
		let priceAsNum: number = parseFloat(el.item.offers.price || "");
		if (isNaN(priceAsNum)) priceAsNum = 0;

		// adjust timestamp so that the most recent listing has a higher timestamp
		timeStamp -= 1;

		return {
			id: el.item.url.split("/")?.at(-1) || "",
			dateFound: timeStamp,
			name: el.item.name.slice(0, 300) || "",
			description: el.item.description.slice(0, 300) || "",
			address: el.item.address || "",
			url: el.item.url || "",
			imageUrl: el.item.image || "",
			price: priceAsNum,
			priceCurrency: el.item.offers.priceCurrency,
			size: bedrooms,
			aptSource: AptSource.KIJIJI,
			petsAllowed:
				el.item.petsAllowed === "true"
					? true
					: el.item.petsAllowed === "false"
					? false
					: undefined,
		};
	});
}
