import * as cheerio from "cheerio";
import {
	CENTRIS_HEADERS,
	CENTRIS_NEIGHBORHOOD_MAP,
	getCentrisQuery,
	INITIAL_CENTRIS_HEADERS,
	KIJIJI_HEADERS,
	KIJIJI_URLS,
	MTL_NEIGHBORHOODS,
} from "./constants";
import { AptSource, Listing } from "./types";
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

export async function scrapeCentris(bedrooms?: string): Promise<Listing[]> {
	if (!bedrooms) {
		const listings: Listing[] = [];
		// Add a listings tracker to avoid duplicate listings
		const listingsTracker = new Set<string>();
		for (const bedroom of [
			"0",
			"1",
			"1+",
			"2",
			"2+",
			"3",
			"3+",
			"4",
			"4+",
			"5",
			"5+",
		]) {
			const scrapedLstings = await scrapeCentris(bedroom);
			for (const listing of scrapedLstings) {
				if (listingsTracker.has(listing.id)) continue;
				listingsTracker.add(listing.id);
				listings.push(listing);
			}
			await sleep(1000);
		}
		return listings;
	}
	let Cookie: string;
	// Initialize the session for 0 or 1 bedrooms, else it is already initialized

	const startSessionResult = await fetch(
		bedrooms === "0"
			? "https://www.centris.ca/en/lofts-studios~for-rent~montreal?uc=0"
			: "https://www.centris.ca/en/condos-apartments~for-rent~montreal?uc=0",
		{
			headers: INITIAL_CENTRIS_HEADERS,
		}
	);

	// Get the cookies
	Cookie = startSessionResult.headers
		.getSetCookie()
		.map((cookie) => cookie.split(";")[0])
		.join("; ");

	// Update sort
	await fetch("https://www.centris.ca/property/UpdateSort", {
		method: "POST",
		headers: { ...CENTRIS_HEADERS, Cookie: Cookie! },
		body: JSON.stringify({ sort: 3 }),
	});

	let res: Response;
	let text: string;
	if (bedrooms === "0") {
		// Studio general fetch
		res = await fetch("https://www.centris.ca/Property/GetInscriptions", {
			method: "POST",
			headers: { ...CENTRIS_HEADERS, Cookie: Cookie! },
			body: JSON.stringify({ startPosition: 0 }),
		});
		const data = await res.json();
		text = data.d.Result.html;
	} else {
		// Update query
		await fetch("https://www.centris.ca/api/property/UpdateQuery", {
			method: "POST",
			headers: { ...CENTRIS_HEADERS, Cookie: Cookie! },
			body: getCentrisQuery(bedrooms),
		});

		// Apartment fetch
		res = await fetch(
			"https://www.centris.ca/en/condos-apartments~for-rent~montreal?uc=0",
			{
				headers: { ...CENTRIS_HEADERS, Cookie: Cookie! },
			}
		);
		text = await res.text();
	}

	// Write to file for analysis
	// writeFile("page.html", text, "utf8");

	const $ = cheerio.load(text!);

	const listings: (Listing & { lng?: number; lat?: number })[] = $(
		".property-thumbnail-item"
	)
		.map((_, el) => {
			const $el = $(el);

			// href
			const url = `https://www.centris.ca${
				$el
					.find(".property-thumbnail-summary-link")
					.first()
					.attr("href") || ""
			}`;

			// imgUrl
			const imageUrl =
				$el.find(".property-thumbnail-summary-link img").attr("src") ||
				"";

			// address
			const addressDivs = $el.find(".address div");
			const line1 = addressDivs.eq(0).text().trim();
			const line2 = addressDivs.eq(1).text().trim();
			const address = `${line1}, ${line2}`;

			let neighborhood =
				address.charAt(address.length - 1) === ")"
					? address.split("(")?.at(1)?.split(")")?.at(0)
					: address.split(", ")?.at(-1);
			if (neighborhood) {
				if (CENTRIS_NEIGHBORHOOD_MAP[neighborhood])
					neighborhood = CENTRIS_NEIGHBORHOOD_MAP[neighborhood];
				else if (!MTL_NEIGHBORHOODS.has(neighborhood))
					neighborhood = "";
			}

			// Get id
			const matchScore = $el.find(".ll-match-score");
			const id = matchScore.attr("data-id") || "";

			// price (from <meta itemprop="price">, fallback to text)
			let price: string | number =
				$el.find(".price meta[itemprop='price']").attr("content") || "";
			if (!price) {
				const priceText = $el.find(".price span").first().text();
				price = priceText.replace(/[^\d]/g, ""); // strip $ and commas
			}
			price = parseFloat(price);
			if (isNaN(price)) price = 0;

			return {
				id,
				url,
				imageUrl,
				address,
				dateFound: 0,
				name: address,
				description: "Listing found on centris.ca",
				price,
				priceCurrency: "CAD",
				aptSource: AptSource.CENTRIS,
				size: 0,
				neighborhood,
			};
		})
		.get();

	// Adjust neighborhoods and timestamp
	let timeStamp = new Date().getTime() + listings.length;
	for (let i = 0; i < listings.length; i++) {
		// Add date found
		timeStamp -= 1;
		listings[i].dateFound = timeStamp;

		// Remove empty neighborhood
		if (!listings[i].neighborhood) delete listings[i].neighborhood;
	}
	// Take a break
	await sleep(1000);
	// console.log(`found ${listings.length} listings!`);
	return listings;
}
