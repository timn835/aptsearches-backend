export enum AptSource {
	KIJIJI = "KIJIJI",
}

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

export type Listing = {
	id: string;
	dateFound: number;
	name: string;
	description: string;
	imageUrl: string;
	url: string;
	address: string;
	price: number;
	priceCurrency: string;
	aptSource: AptSource;
	size: number; // 0 is for studio, 1 is for 1 bedroom, 2 for 2 bedrooms, etc.
	petsAllowed?: boolean;
	neighborhood?: string; // this will be added later on
};
