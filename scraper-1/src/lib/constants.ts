export const KIJIJI_HEADERS = {
	"Cache-Control": "max-age=0",
	"Sec-Ch-Ua": '"Not)A;Brand";v="8", "Chromium";v="138"',
	"Sec-Ch-Ua-Mobile": "?0",
	"Sec-Ch-Ua-Platform": '"macOS"',
	"Upgrade-Insecure-Requests": "1",
	"User-Agent":
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
	Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
	"Accept-Language": "en-US,en;q=0.9",
	"Sec-Fetch-Site": "same-origin",
	"Sec-Fetch-Mode": "navigate",
	"Sec-Fetch-User": "?1",
	"Sec-Fetch-Dest": "document",
};

export const INITIAL_CENTRIS_HEADERS = {
	"Sec-Ch-Ua": `"Chromium";v="139", "Not;A=Brand";v="99"`,
	"Sec-Ch-Ua-Mobile": "?0",
	"Sec-Ch-Ua-Platform": `"macOS"`,
	"Accept-Language": "en-US,en;q=0.9",
	"Upgrade-Insecure-Requests": "1",
	"User-Agent":
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
	Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
	"Sec-Fetch-Site": "none",
	"Sec-Fetch-Mode": "navigate",
	"Sec-Fetch-User": "?1",
	"Sec-Fetch-Dest": "document",
};

export const CENTRIS_HEADERS = {
	Host: "www.centris.ca",
	"Sec-Ch-Ua-Platform": '"macOS"',
	"Cache-Control": "no-cache",
	"Accept-Language": "en-US,en;q=0.9",
	"Sec-Ch-Ua": '"Chromium";v="139", "Not;A=Brand";v="99"',
	"X-Centris-Uc": "0",
	"Sec-Ch-Ua-Mobile": "?0",
	"X-Centris-Uck": "0b8766ba-73a4-4929-9680-aff8b9b66521",
	"X-Requested-With": "XMLHttpRequest",
	"User-Agent":
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
	Accept: "application/json, text/javascript, */*; q=0.01",
	"Content-Type": "application/json; charset=UTF-8",
	Origin: "https://www.centris.ca",
	"Sec-Fetch-Site": "same-origin",
	"Sec-Fetch-Mode": "cors",
	"Sec-Fetch-Dest": "empty",
};

export const FBMARKETPLACE_HEADERS = {
	"Cache-Control": "max-age=0",
	Dpr: "2",
	"Viewport-Width": "1432",
	"Sec-Ch-Ua": `"Chromium";v="139", "Not;A=Brand";v="99"`,
	"Sec-Ch-Ua-Mobile": "?0",
	"Sec-Ch-Ua-Platform": `"macOS"`,
	"Sec-Ch-Prefers-Color-Scheme": "dark",
	"Accept-Language": "en-US,en;q=0.9",
	"Upgrade-Insecure-Requests": "1",
	"User-Agent":
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
	Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
	"Sec-Fetch-Site": "same-origin",
	"Sec-Fetch-Mode": "navigate",
	"Sec-Fetch-User": "?1",
	"Sec-Fetch-Dest": "document",
	Referer: "https://www.facebook.com/marketplace",
	"Accept-Encoding": "gzip, deflate, br",
	Priority: "u=0, i",
};

export function getCentrisQuery(bedrooms: string): string {
	return JSON.stringify({
		query: {
			UseGeographyShapes: 0,
			Filters: [],
			FieldsValues: [
				{
					fieldId: "PropertyType",
					value: "RentCondo",
					fieldConditionId: "",
					valueConditionId: "IsResidentialForRent",
				},
				{
					fieldId: "Category",
					value: "Residential",
					fieldConditionId: "",
					valueConditionId: "",
				},
				{
					fieldId: "SellingType",
					value: "Rent",
					fieldConditionId: "",
					valueConditionId: "",
				},
				{
					fieldId: "Rooms",
					value: bedrooms,
					fieldConditionId: "IsResidentialNotLot",
					valueConditionId: "",
				},
				{
					fieldId: "LivingArea",
					value: "SquareFeet",
					fieldConditionId: "IsResidentialNotLot",
					valueConditionId: "",
				},
				{
					fieldId: "RentPrice",
					value: 0,
					fieldConditionId: "ForRent",
					valueConditionId: "",
				},
				{
					fieldId: "RentPrice",
					value: 999999999999,
					fieldConditionId: "ForRent",
					valueConditionId: "",
				},
			],
		},
		isHomePage: false,
	});
}

export const KIJIJI_URLS = [
	{
		url: "https://www.kijiji.ca/b-location-court-terme/ville-de-montreal/bachelor+studio/c42l1700281a227?sort=dateDesc&view=list",
		bedrooms: 0,
	}, // bachelor
	{
		url: "https://www.kijiji.ca/b-location-court-terme/ville-de-montreal/1+bedroom/c42l1700281a227?sort=dateDesc&view=list",
		bedrooms: 1,
	}, // 1 bedroom
	{
		url: "https://www.kijiji.ca/b-location-court-terme/ville-de-montreal/1+bedroom+den/c42l1700281a227?sort=dateDesc&view=list",
		bedrooms: 1,
	}, // also 1 bedroom
	{
		url: "https://www.kijiji.ca/b-location-court-terme/ville-de-montreal/2+bedrooms/c42l1700281a227?sort=dateDesc&view=list",
		bedrooms: 2,
	}, // 2 bedrooms
	{
		url: "https://www.kijiji.ca/b-location-court-terme/ville-de-montreal/2+bedrooms+den/c42l1700281a227?sort=dateDesc&view=list",
		bedrooms: 2,
	}, // also 2 bedrooms
	{
		url: "https://www.kijiji.ca/b-location-court-terme/ville-de-montreal/3+bedrooms/c42l1700281a227?sort=dateDesc&view=list",
		bedrooms: 3,
	}, // 3 bedrooms
	{
		url: "https://www.kijiji.ca/b-location-court-terme/ville-de-montreal/4+bedrooms/c42l1700281a227?sort=dateDesc&view=list",
		bedrooms: 4,
	}, // 4 bedrooms
	{
		url: "https://www.kijiji.ca/b-location-court-terme/ville-de-montreal/5+bedrooms/c42l1700281a227?sort=dateDesc&view=list",
		bedrooms: 5,
	}, // 5 bedrooms
	{
		url: "https://www.kijiji.ca/b-location-court-terme/ville-de-montreal/6+more+bedrooms/c42l1700281a227?sort=dateDesc&view=list",
		bedrooms: 5,
	}, // 5+ bedrooms
	{
		url: "https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/bachelor+studio/c37l1700281a27949001?sort=dateDesc&view=list",
		bedrooms: 0,
	}, // bachelor
	{
		url: "https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/1+bedroom/c37l1700281a27949001?sort=dateDesc&view=list",
		bedrooms: 1,
	}, // 1 bedroom
	{
		url: "https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/1+bedroom+den/c37l1700281a27949001?sort=dateDesc&view=list",
		bedrooms: 1,
	}, // also 1 bedroom
	{
		url: "https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/2+bedrooms/c37l1700281a27949001?sort=dateDesc&view=list",
		bedrooms: 2,
	}, // 2 bedrooms
	{
		url: "https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/2+bedroom+den/c37l1700281a27949001?sort=dateDesc&view=list",
		bedrooms: 2,
	}, // also 2 bedrooms
	{
		url: "https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/3+bedrooms/c37l1700281a27949001?sort=dateDesc&view=list",
		bedrooms: 3,
	}, // 3 bedrooms
	{
		url: "https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/3+bedroom+den/c37l1700281a27949001?sort=dateDesc&view=list",
		bedrooms: 3,
	}, // also 3 bedrooms
	{
		url: "https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/4+bedrooms/c37l1700281a27949001?sort=dateDesc&view=list",
		bedrooms: 4,
	}, // 4 bedrooms
	{
		url: "https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/4+bedroom+den/c37l1700281a27949001?sort=dateDesc&view=list",
		bedrooms: 4,
	}, // also 4 bedrooms
	{
		url: "https://www.kijiji.ca/b-appartement-condo/ville-de-montreal/5+bedrooms/c37l1700281a27949001?sort=dateDesc&view=list",
		bedrooms: 5,
	}, // 5+ bedrooms
];

export const MTL_NEIGHBORHOODS = new Set<string>([
	"LaSalle",
	"Dollard-des-Ormeaux",
	"Côte-Saint-Luc",
	"Villeray-Saint-Michel-Parc-Extension",
	"Rosemont-La Petite-Patrie",
	"Hampstead",
	"Senneville",
	"Le Plateau-Mont-Royal",
	"Sainte-Anne-de-Bellevue",
	"Montréal-Ouest",
	"Côte-des-Neiges-Notre-Dame-de-Grâce",
	"L'Île-Bizard-Sainte-Geneviève",
	"Beaconsfield",
	"Anjou",
	"Verdun",
	"Le Sud-Ouest",
	"Mercier-Hochelaga-Maisonneuve",
	"Montréal-Est",
	"Lachine",
	"Saint-Léonard",
	"Montréal-Nord",
	"Outremont",
	"L'Île-Dorval",
	"Mont-Royal",
	"Pointe-Claire",
	"Dorval",
	"Pierrefonds-Roxboro",
	"Rivière-des-Prairies-Pointe-aux-Trembles",
	"Ahuntsic-Cartierville",
	"Saint-Laurent",
	"Ville-Marie",
	"Kirkland",
	"Baie-D'Urfé",
	"Westmount",
]);

export const CENTRIS_NEIGHBORHOOD_MAP: Record<string, string> = {
	"Villeray/Saint-Michel/Parc-Extension":
		"Villeray-Saint-Michel-Parc-Extension",
	"Rosemont/La Petite-Patrie": "Rosemont-La Petite-Patrie",
	"Côte-des-Neiges/Notre-Dame-de-Grâce":
		"Côte-des-Neiges-Notre-Dame-de-Grâce",
	"Mercier/Hochelaga-Maisonneuve": "Mercier-Hochelaga-Maisonneuve",
	"Verdun/Île-des-Soeurs": "Verdun",
	"Rivière-des-Prairies/Pointe-aux-Trembles":
		"Rivière-des-Prairies-Pointe-aux-Trembles",
};
