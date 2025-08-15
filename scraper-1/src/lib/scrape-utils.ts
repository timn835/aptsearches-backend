import * as cheerio from "cheerio";
import { headers } from "./constants";
import { AptSource, Listing } from "./types";

export const KIJIJI_URLS = [
	"https://www.kijiji.ca/b-location-court-terme/ville-de-montreal/bachelor+studio/c42l1700281a227?sort=dateDesc&view=list", // bachelor
	"https://www.kijiji.ca/b-location-court-terme/ville-de-montreal/1+bedroom/c42l1700281a227?sort=dateDesc&view=list", // 1 bedroom
	"https://www.kijiji.ca/b-location-court-terme/ville-de-montreal/1+bedroom+den/c42l1700281a227?sort=dateDesc&view=list", // also 1 bedroom
	"https://www.kijiji.ca/b-location-court-terme/ville-de-montreal/2+bedrooms/c42l1700281a227?sort=dateDesc&view=list", // 2 bedrooms
	"https://www.kijiji.ca/b-location-court-terme/ville-de-montreal/2+bedrooms+den/c42l1700281a227?sort=dateDesc&view=list", // also 2 bedrooms
	"https://www.kijiji.ca/b-location-court-terme/ville-de-montreal/3+bedrooms/c42l1700281a227?sort=dateDesc&view=list", // 3 bedrooms
	"https://www.kijiji.ca/b-location-court-terme/ville-de-montreal/4+bedrooms/c42l1700281a227?sort=dateDesc&view=list", // 4 bedrooms
	"https://www.kijiji.ca/b-location-court-terme/ville-de-montreal/5+bedrooms/c42l1700281a227?sort=dateDesc&view=list", // 5 bedrooms
	"https://www.kijiji.ca/b-location-court-terme/ville-de-montreal/6+more+bedrooms/c42l1700281a227?sort=dateDesc&view=list", // 5++ bedrooms
	"https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/bachelor+studio/c37l1700281a27949001?sort=dateDesc&view=list", // bachelor
	"https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/1+bedroom/c37l1700281a27949001?sort=dateDesc&view=list", // 1 bedroom
	"https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/1+bedroom+den/c37l1700281a27949001?sort=dateDesc&view=list", // also 1 bedroom
	"https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/2+bedrooms/c37l1700281a27949001?sort=dateDesc&view=list", // 2 bedrooms
	"https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/2+bedroom+den/c37l1700281a27949001?sort=dateDesc&view=list", // also 2 bedrooms
	"https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/3+bedrooms/c37l1700281a27949001?sort=dateDesc&view=list", // 3 bedrooms
	"https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/3+bedroom+den/c37l1700281a27949001?sort=dateDesc&view=list", // also 3 bedrooms
	"https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/4+bedrooms/c37l1700281a27949001?sort=dateDesc&view=list", // 4 bedrooms
	"https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/4+bedroom+den/c37l1700281a27949001?sort=dateDesc&view=list", // also 4 bedrooms
	"https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/5+bedrooms/c37l1700281a27949001?sort=dateDesc&view=list", // 5+ bedrooms
];

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
		// get price as number
		let priceAsNum: number = parseFloat(el.item.offers.price || "");
		if (isNaN(priceAsNum)) priceAsNum = 0;

		return {
			id: el.item.url.split("/")?.at(-1) || "",
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
