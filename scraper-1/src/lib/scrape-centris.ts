import * as cheerio from "cheerio";
import {
	CENTRIS_HEADERS,
	CENTRIS_NEIGHBORHOOD_MAP,
	getCentrisQuery,
	INITIAL_CENTRIS_HEADERS,
	MTL_NEIGHBORHOODS,
} from "./constants";
import { AptSource, type Listing } from "./types";
import { sleep } from "./utils";
// import { writeFile } from "node:fs/promises";

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

	// If appartment, update query
	if (bedrooms !== "0") {
		await fetch("https://www.centris.ca/api/property/UpdateQuery", {
			method: "POST",
			headers: {
				...CENTRIS_HEADERS,
				Referer:
					"https://www.centris.ca/en/condos-apartments~for-rent~montreal",
				Cookie: Cookie!,
			},
			body: getCentrisQuery(bedrooms),
		});
	}

	let res: Response;
	let text: string;
	let count = 0;
	let totalListings: Listing[] = [];
	while (true) {
		res = await fetch("https://www.centris.ca/Property/GetInscriptions", {
			method: "POST",
			headers: {
				...CENTRIS_HEADERS,
				Referer:
					bedrooms === "0"
						? "https://www.centris.ca/en/lofts-studios~for-rent~montreal?uc=0"
						: "https://www.centris.ca/en/condos-apartments~for-rent~montreal",
				Cookie: Cookie!,
			},
			body: JSON.stringify({ startPosition: count }),
		});
		const data = await res.json();

		// Update the count and totalCount
		count += data.d.Result.inscNumberPerPage; // usually inscNumberPerPage is 20
		const totalCount = data.d.Result.count;
		text = data.d.Result.html;

		// Write to file for analysis
		// writeFile("page.html", text, "utf8");

		const $ = cheerio.load(text!);

		const listings: Listing[] = $(".property-thumbnail-item")
			.map((_, el) => {
				const $el = $(el);

				// url
				const url = `https://www.centris.ca${
					$el
						.find(".property-thumbnail-summary-link")
						.first()
						.attr("href") || ""
				}`;

				// imageUrl
				const imageUrl =
					$el
						.find(".property-thumbnail-summary-link img")
						.attr("src") || "";

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

				// If no neighborhood, get latitude & longitude
				let lat: string | undefined, lng: string | undefined;
				if (!neighborhood) {
					lat = matchScore.attr("data-lat");
					lng = matchScore.attr("data-lng");
				}

				// price (from <meta itemprop="price">, fallback to text)
				let price: string | number =
					$el.find(".price meta[itemprop='price']").attr("content") ||
					"";
				if (!price) {
					const priceText = $el.find(".price span").first().text();
					price = priceText.replace(/[^\d]/g, ""); // strip $ and commas
				}
				price = parseFloat(price);
				if (isNaN(price)) price = 0;

				let size = parseInt(bedrooms);
				if (isNaN(size)) size = 0;

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
					size,
					neighborhood,
					lat,
					lng,
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

		console.log(
			`scraped ${
				listings.length
			} Centris listings for ${bedrooms} bedrooms, page ${Math.round(
				count / 20
			)}`
		);
		totalListings.push(...listings);
		if (count >= totalCount || count >= 100) break;
		await sleep(1000);
	}
	return totalListings;
}
