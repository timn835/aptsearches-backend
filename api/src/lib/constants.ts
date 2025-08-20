import { type RouteShorthandOptions } from "fastify";
import { AptSource } from "../lib/types";

export const allowedOrigins = [
	"http://localhost:5173",
	// "https://search-quest.net",
	// "https://www.search-quest.net",
	// "https://main.d3rvmvp6m28np.amplifyapp.com",
	// "https://www.main.d3rvmvp6m28np.amplifyapp.com",
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
