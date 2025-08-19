import * as cheerio from "cheerio";
import { FBMARKETPLACE_HEADERS } from "./constants";
import { AptSource, type Listing } from "./types";
import { extractKey, sleep } from "./utils";
// import { writeFile } from "node:fs/promises";

export async function scrapeFBMarketplace(
	bedrooms?: number,
	searchType?: "property" | "apartment"
): Promise<Listing[]> {
	if (bedrooms === undefined) {
		const listings: Listing[] = [];
		// Add a listings tracker to avoid duplicate listings
		const listingsTracker = new Set<string>();

		// Get properties
		for (const bedroom of [1, 2, 3, 4, 5, 6]) {
			const scrapedLstings = await scrapeFBMarketplace(
				bedroom,
				"property"
			);
			console.log(
				`scraped ${scrapedLstings.length} FBM property listings for ${bedroom} bedrooms`
			);
			for (const listing of scrapedLstings) {
				if (listingsTracker.has(listing.id)) continue;
				listingsTracker.add(listing.id);
				listings.push(listing);
			}
		}

		// Get appartments
		for (const bedroom of [1, 2, 3, 4]) {
			const scrapedLstings = await scrapeFBMarketplace(
				bedroom,
				"apartment"
			);
			console.log(
				`scraped ${scrapedLstings.length} FBM apartment listings for ${bedroom} bedrooms`
			);
			for (const listing of scrapedLstings) {
				if (listingsTracker.has(listing.id)) continue;
				listingsTracker.add(listing.id);
				listings.push(listing);
			}
		}
		return listings;
	}
	const res = await fetch(
		searchType === "property"
			? `https://www.facebook.com/marketplace/category/propertyrentals?minBedrooms=${bedrooms}&sortBy=creation_time_descend&exact=false`
			: `https://www.facebook.com/marketplace/montreal/${bedrooms}-bedroom-apartments?sortBy=creation_time_descend&exact=false`,
		{
			method: "GET",
			headers: {
				...FBMARKETPLACE_HEADERS,
				Cookie: `c_user=${process.env.C_USER}; xs=${process.env.XS};`,
			},
		}
	);

	const text = await res.text();
	// writeFile("page.html", text, "utf8");

	const $ = cheerio.load(text);
	let listings: Listing[] | null = null;

	$("script").each((_i, el) => {
		const content = $(el).html()?.trim();
		if (content) {
			try {
				const json = JSON.parse(content);
				const extract = extractKey(
					searchType === "property"
						? "marketplace_feed_stories"
						: "marketplace_search",
					json
				);
				if (extract?.edges || extract?.feed_units?.edges) {
					listings = (
						searchType === "property"
							? extract.edges
							: extract.feed_units.edges
					).map(({ node }: { node: any }) => {
						let price = parseFloat(
							node.listing.listing_price.amount
						);
						if (isNaN(price)) price = 0;
						return {
							id: node.listing.id,
							dateFound: 0,
							name: node.listing.marketplace_listing_title,
							description: "Listing found on FBMarketplace",
							imageUrl:
								node.listing.primary_listing_photo.image.uri,
							url: `https://www.facebook.com/marketplace/item/${node.listing.id}`,
							address:
								node.listing.custom_sub_titles_with_rendering_flags?.at(
									0
								)?.subtitle ||
								node.listing.location?.reverse_geocode
									?.city_page?.display_name ||
								"",
							price,
							priceCurrency: "CAD",
							aptSource: AptSource.FBMARKETPLACE,
							size: bedrooms,
						};
					});
					return false;
				}
			} catch (err) {
				// Not valid JSON, continue
			}
		}
	});

	if (!listings)
		throw Error(
			"Something went wrong, we were not able to extract json from the html, investigation needed."
		);

	await sleep(1000);
	return listings;
}
