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

//General utils
export function extractKey(key: string, data: any): any {
	// we assume data is either null, a string, an array or an object
	if (!data || typeof data === "string") return null;
	if (Array.isArray(data)) {
		for (const value of data) {
			let res = extractKey(key, value);
			if (res) return res;
		}
	} else {
		for (let [currKey, value] of Object.entries(data)) {
			if (currKey === key) return value;
			let res = extractKey(key, value);
			if (res) return res;
		}
	}
	return null;
}
