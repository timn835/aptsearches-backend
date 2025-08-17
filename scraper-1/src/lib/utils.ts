import * as turf from "@turf/turf";
import { MONTREAL_NEIGHBORHOODS_DATA } from "./constants";

export async function sleep(ms = 1000) {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeKijijiAddress(address: string): string {
	// Observations:
	// Every address has separations by ", "
	// Every address has at least "City, Province PostalCode" (e.g. "Montreal, QC H1W 1H4")
	// Geocoding works best with "number street city province"
	// If the first character is a number, we will assume that format is "number street city province,
	// and we will use the geocode api"
	// If not, we will assume we only have the postal code, and we will use google maps api for geocoding
	return address.split(", ").slice(0, 2).join(", ");
}

/** Coordinates has to be an array of [lng, lat] */
export function findNeighborhoods(
	coordinates: (number | undefined)[][]
): string[] {
	const result = Array(coordinates.length).fill("");
	const points = coordinates.map(([lng, lat]) =>
		lng === undefined || lat === undefined
			? undefined
			: turf.point([lng, lat])
	);

	const indexArray: number[] = [];
	for (let i = 0; i < points.length; i++) {
		if (!points[i]) continue;
		indexArray.push(i);
	}
	const searchIndexSet = new Set<number>(indexArray);

	for (const feature of MONTREAL_NEIGHBORHOODS_DATA.features) {
		// Initialize polygon
		let polygon = turf.multiPolygon(feature.geometry.coordinates);

		const foundIndices = [];
		for (const index of searchIndexSet) {
			if (turf.booleanPointInPolygon(points[index]!, polygon)) {
				result[index] = feature.properties.NOM_OFFICIEL;
				foundIndices.push(index);
				break;
			}
		}
		for (const index of foundIndices) searchIndexSet.delete(index);
	}

	return result;
}
