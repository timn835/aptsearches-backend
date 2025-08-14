import * as cheerio from "cheerio";
import { headers } from "./constants";
import { AptSource, Listing } from "./types";
// import { HEADERS } from "./constants";

export async function scrapeKijiji(url: string): Promise<Listing[]> {
	const res = await fetch(url, { headers });
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

	return jsonData.itemListElement.map((el: any) => {
		let priceAsNum: number = parseFloat(el.item.offers.price || "");
		if (isNaN(priceAsNum)) priceAsNum = 0;
		return {
			name: el.item.name || "",
			description: el.item.description || "",
			address: el.item.address || "",
			url: el.item.url || "",
			imageUrl: el.item.image || "",
			price: priceAsNum,
			priceCurrency: el.item.offers.priceCurrency,
			size: 0,
			source: AptSource.KIJIJI,
			petsAllowed:
				el.item.petsAllowed === "true"
					? true
					: el.item.petsAllowed === "false"
					? false
					: undefined,
		};
	});
}
