import crypto from "node:crypto";

export const EMAIL_REGEX =
	/^([a-z\d_-]+)(((\.[a-z\d_-]+)|(-[a-z\d_-]+))+)?(\+[a-z\d_-]+)?@([a-z\d-]+)\.([a-z]{2,8})(\.[a-z]{2,8})?$/i;

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

export const base64UrlEncode = (str: Buffer) =>
	str
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");

export const base64UrlDecode = (str: string) => {
	str = str.replace(/-/g, "+").replace(/_/g, "/");
	while (str.length % 4) str += "=";
	return Buffer.from(str, "base64");
};

export const encrypt = (plainText: string): string => {
	const iv = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv(
		"aes-256-gcm",
		Buffer.from(process.env.ENCRYPTION_KEY!),
		iv
	);

	const encrypted = Buffer.concat([
		cipher.update(plainText, "utf8"),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();

	return `${base64UrlEncode(iv)}.${base64UrlEncode(
		encrypted
	)}.${base64UrlEncode(authTag)}`;
};
export const decrypt = (encryptedText: string): string | null => {
	try {
		const [iv, encrypted, authTag] = encryptedText
			.split(".")
			.map(base64UrlDecode);
		const decipher = crypto.createDecipheriv(
			"aes-256-gcm",
			Buffer.from(process.env.ENCRYPTION_KEY!),
			iv
		);

		decipher.setAuthTag(authTag);
		const decrypted = Buffer.concat([
			decipher.update(encrypted),
			decipher.final(),
		]);

		return decrypted.toString("utf8");
	} catch (error) {
		console.error("Decryption failed:", error);
		return null; // Invalid decryption
	}
};
