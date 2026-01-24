import * as turf from "@turf/turf";
import {
	// deleteAllListings,
	fetchBookmark,
	fetchListings,
	storeListings,
	updateBookmark,
} from "./lib/db-utils";
import { AptSource } from "./lib/types";
import {
	MONTREAL_NEIGHBORHOODS_DATA,
	MTL_NEIGHBORHOODS,
	sleep,
} from "./lib/utils";

export const adjust1Handler = async () => {
	if (process.env.ENV !== "PROD") {
		const dotenv = await import("dotenv");
		dotenv.config();
	}

	try {
		// Keep track of how many calls we have made to the api
		let googleApiCount = 0;
		// await deleteAllListings();
		// Get the bookmark
		const bookmark = await fetchBookmark("adjustingListings");

		// Fetch 1000 listings from db that need neighborhood adjustment
		const initialListings = await fetchListings(bookmark);

		const listings = initialListings.filter(
			(listing) =>
				!listing.neighborhood &&
				(listing.aptSource !== AptSource.FBMARKETPLACE || // FBMarketplace does not include postal code, unlike KIJIJI, discard
					!isNaN(parseInt(listing.address.charAt(0))))
		);

		// First do the ones that we can do using geocode
		let keyToUse = process.env.GEOCODE_MAPS_API_KEY1;
		for (const listing of listings) {
			if (listing.lat && listing.lng) continue;
			if (isNaN(parseInt(listing.address.charAt(0)))) continue;
			try {
				// Geocode address
				const res = await fetch(
					`https://geocode.maps.co/search?q=${encodeURIComponent(
						listing.address.split(",").slice(0, -1).join(",")
					)}&countrycodes=ca&api_key=${keyToUse}`
				);
				const geocodeInfo = await res.json();
				listing.lat = geocodeInfo[0]?.lat;
				listing.lng = geocodeInfo[0]?.lon;
				console.log(
					"geocode point",
					listing.address,
					listing.lat,
					listing.lng
				);
			} catch (error) {
				console.error("Unable to geocode");
			} finally {
				// Switch key to use
				keyToUse =
					keyToUse === process.env.GEOCODE_MAPS_API_KEY1
						? process.env.GEOCODE_MAPS_API_KEY2
						: process.env.GEOCODE_MAPS_API_KEY1;
				await sleep(1000);
			}
		}

		// Now, do the ones we can do using google maps api
		for (const listing of listings) {
			if (listing.lat && listing.lng) continue;
			try {
				googleApiCount++;
				const res = await fetch(
					`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
						listing.address
					)}&region=ca&key=${process.env.GOOGLE_MAPS_API_KEY}`
				);
				const data = await res.json();
				listing.lat = data?.results[0]?.geometry?.location?.lat;
				listing.lng = data?.results[0]?.geometry?.location?.lng;
				console.log(
					"google maps point",
					listing.address,
					listing.lat,
					listing.lng
				);
			} catch (error) {
				console.error("Unable to geocode with google");
			}
		}

		for (const listing of listings) {
			if (!listing.lat || !listing.lng) continue;
			// Convert coordinates to GeoJSON
			const res = await fetch(
				`https://api.maptiler.com/coordinates/transform/${listing.lng},${listing.lat}.json?key=g0y01TmlRNajMPkic9lG&s_srs=4326&t_srs=32188`,
				{
					credentials: "omit",
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0",
						Accept: "*/*",
						"Accept-Language": "en-CA,en-US;q=0.7,en;q=0.3",
						"Sec-Fetch-Dest": "empty",
						"Sec-Fetch-Mode": "cors",
						"Sec-Fetch-Site": "cross-site",
					},
					referrer: "https://epsg.io/",
					method: "GET",
					mode: "cors",
				}
			);
			const data = await res.json();

			const pt = turf.point([data.results[0].x, data.results[0].y]); // Turf doesn't care as long as coords match the polygons’ CRS
			let neighborhoodName: string | null = null;

			for (const feature of MONTREAL_NEIGHBORHOODS_DATA.features) {
				const polygon = turf.multiPolygon(feature.geometry.coordinates);
				if (turf.booleanPointInPolygon(pt, polygon)) {
					neighborhoodName = feature.properties.NOM;
					break;
				}
			}
			console.log(
				listing.address,
				[data.results[0].x, data.results[0].y],
				neighborhoodName,
				neighborhoodName
					? MTL_NEIGHBORHOODS.has(neighborhoodName)
					: "no neighborhood"
			);
			if (neighborhoodName) listing.neighborhood = neighborhoodName;
			await sleep(200);
		}

		// Update the neighborhoods within the listings
		const listingsToUpdate = listings
			.filter((listing) => listing.neighborhood)
			.map((listing) => ({
				...listing,
				lat: undefined,
				lng: undefined,
			}));

		await storeListings(listingsToUpdate);

		// Update the bookmark
		await updateBookmark(
			"adjustingListings",
			initialListings.length
				? initialListings[0]?.dateFound
				: new Date().getTime()
		);

		return {
			length: listingsToUpdate.length,
			googleApiCount,
		};
	} catch (error) {
		console.error(error);
		return {
			statusCode: 500,
			message: "Unable to complete adjust1Handler",
		};
	}
};
