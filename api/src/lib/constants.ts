import { type RouteShorthandOptions } from "fastify";
import { AptSource } from "../lib/types";

export const allowedOrigins = [
	"http://localhost:5173",
	"https://main.d1ycolmbjxtgas.amplifyapp.com",
	"https://www.main.d1ycolmbjxtgas.amplifyapp.com",
	"https://aptsearches.com",
	"https://www.aptsearches.com",
];

export const getListings: RouteShorthandOptions = {
	schema: {
		response: {
			200: {
				type: "object",
				properties: {
					listings: {
						type: "array",
						items: {
							type: "object",
							properties: {
								id: { type: "string" },
								dateFound: { type: "number" },
								name: { type: "string" },
								description: { type: "string" },
								imageUrl: { type: "string" },
								url: { type: "string" },
								address: { type: "string" },
								price: { type: "number" },
								priceCurrency: { type: "string" },
								aptSource: {
									type: "string",
									enum: Object.values(AptSource),
								},
								size: { type: "number" },
								petsAllowed: { type: "boolean" },
								neighborhood: { type: "string" }, // this will be added later on
							},
							required: [
								"id",
								"dateFound",
								"name",
								"description",
								"imageUrl",
								"url",
								"address",
								"price",
								"priceCurrency",
								"aptSource",
								"size",
							],
						},
					},
				},
			},
		},
	},
};

export const createSubscription: RouteShorthandOptions = {
	schema: {
		body: {
			type: "object",
			properties: {
				email: { type: "string" },
			},
			required: ["email"],
		},
		response: {
			201: {
				type: "object",
				properties: {
					message: {
						type: "string",
					},
				},
				required: ["message"],
			},
		},
	},
};

export const createSuggestion: RouteShorthandOptions = {
	schema: {
		body: {
			type: "object",
			properties: {
				email: { type: "string" },
				suggestion: { type: "string" },
			},
			required: ["email", "suggestion"],
		},
		response: {
			201: {
				type: "object",
				properties: {
					message: {
						type: "string",
					},
				},
				required: ["message"],
			},
		},
	},
};
