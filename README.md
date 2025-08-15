# Code to convert GeoJSON file

```
import fs from "node:fs";
import {
	MONTREAL_NEIGHBORHOODS_DATA,
	sleep,
} from "./lib/utils";

const NEW_MONTREAL_NEIGHBORHOODS_DATA: any = {
  type: "FeatureCollection",
  crs: {
    type: "name",
    properties: { name: "urn:ogc:def:crs:EPSG::32188" },
  },
  features: [],
};

for (const {
  type,
  properties,
  geometry,
} of MONTREAL_NEIGHBORHOODS_DATA.features) {
  NEW_MONTREAL_NEIGHBORHOODS_DATA.features.push({
    type,
    properties,
    geometry: { type: geometry.type, coordinates: [] },
  });

  for (const coordArr of geometry.coordinates) {
    const newCoordArr: any = [];
    for (const coordArrArr of coordArr) {
      const newCoordArrArr: any = [];
      for (const [x, y] of coordArrArr) {
        const res = await fetch(
          `https://api.maptiler.com/coordinates/transform/${x},${y}.json?key=g0y01TmlRNajMPkic9lG&s_srs=32188&t_srs=4326`,
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
        newCoordArrArr.push([data.results[0].x, data.results[0].y]);
        console.log("added", newCoordArrArr.at(-1));
        await sleep(200);
      }
      newCoordArr.push(newCoordArrArr);
    }
    NEW_MONTREAL_NEIGHBORHOODS_DATA.features
      .at(-1)
      .geometry.coordinates.push(newCoordArr);
  }
  console.log(
    "finished feature: ",
    NEW_MONTREAL_NEIGHBORHOODS_DATA.features.at(-1).properties
      .NOM_OFFICIEL
  );
}

// Write to file
fs.writeFileSync(
  "montreal_neighborhoods_wgs84.json",
  JSON.stringify(NEW_MONTREAL_NEIGHBORHOODS_DATA)
);
```

# Code to geocode address and then check if we are in a polygon

```
import * as turf from "@turf/turf";

let geocodePoint: number[] | undefined;
let googleMapsPoint: number[] | undefined;

for (const { address } of listings) {
	if (geocodePoint !== undefined && googleMapsPoint !== undefined)
		break;
	// Test geocode
	if (!isNaN(parseInt(address.charAt(0)))) {
		if (geocodePoint === undefined) {
			const res = await fetch(
				`https://geocode.maps.co/search?q=${encodeURIComponent(
					normalizeKijijiAddress(address)
				)}&countrycodes=ca&api_key=${process.env.GEOCODE_MAPS_API_KEY}`
			);
			const geocodeInfo = await res.json();
			geocodePoint = [
				parseFloat(geocodeInfo[0].lon),
				parseFloat(geocodeInfo[0].lat),
			];
			console.log(`geocoding for ${address}:`, geocodePoint);
			console.log("Finished testing geocode");
		}
		continue;
	}
	if (googleMapsPoint === undefined) {
		const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
			address
		)}&region=ca&key=${process.env.GOOGLE_MAPS_API_KEY}`;

		const res = await fetch(url);
		const data = await res.json();
		googleMapsPoint = [
			data.results[0].geometry.location.lng,
			data.results[0].geometry.location.lat,
		];
		console.log(`geocoding for ${address}:`, googleMapsPoint);
		console.log("Finished testing google maps");
	}
}

for (const coordPoint of [geocodePoint, googleMapsPoint]) {
	const point = turf.point(coordPoint!); // [lng, lat]
	let neighborhoodName: string | null = null;

	for (const feature of MONTREAL_NEIGHBORHOODS_DATA.features) {
		const geom = feature.geometry;
		let polygon = turf.multiPolygon(geom.coordinates);

		if (turf.booleanPointInPolygon(point, polygon)) {
			neighborhoodName = feature.properties.NOM;
			break;
		}
	}

	console.log("Neighborhood:", neighborhoodName);
}

```
