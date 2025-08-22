import awsLambdaFastify from "@fastify/aws-lambda";
import cors from "@fastify/cors";
import fastify, { type FastifyPluginAsync } from "fastify";
import { allowedOrigins, getListings } from "./lib/constants";
import { fetchListings } from "./lib/db-utils";
import { AptSource } from "./lib/types";

const app: FastifyPluginAsync = async (fastify): Promise<void> => {
	await fastify.register(cors, {
		origin: (origin, cb) => {
			if (!origin || allowedOrigins.includes(origin)) {
				cb(null, true);
			} else {
				cb(new Error("Not allowed by CORS"), origin);
			}
		},
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		credentials: true,
	});

	fastify.get("/hello", async () => {
		return "world";
	});

	fastify.get<{
		Querystring: {
			bedrooms?: number;
			minPrice?: number;
			maxPrice?: number;
		};
	}>("/listings", getListings, async (request, reply) => {
		// Destructure query params
		const { bedrooms, minPrice, maxPrice } = request.query;

		// Fetch at most 1000 listings of each source
		const promises = Object.values(AptSource).map((aptSource) =>
			fetchListings(aptSource)
		);
		const results = await Promise.allSettled(promises);

		const filteredListings = results
			.filter((result) => result.status === "fulfilled")
			.map((result) => result.value)
			.flat(1)
			.filter(({ size, price }) => {
				if (bedrooms !== undefined && bedrooms > size) return false;
				if (minPrice !== undefined && minPrice > price) return false;
				if (maxPrice !== undefined && maxPrice < price) return false;
				return true;
			});

		reply.send({ listings: filteredListings });
	});
};

// 👇 root instance
const server = fastify();
server.register(app);

// 👇 Lambda handler
const proxy = awsLambdaFastify(server);

export const handler = async (event: any, context: any) => {
	// Set the callbackWaitsForEmptyEventLoop to false
	context.callbackWaitsForEmptyEventLoop = false;

	// Call the proxy with the event and context
	return proxy(event, context);
};

if (process.env.ENV !== "PROD") {
	const start = async () => {
		const dotenv = await import("dotenv");
		dotenv.config();
		try {
			await server.listen({ port: 3000 });
			console.log("listening on port 3000");
		} catch (err) {
			server.log.error(err);
			process.exit(1);
		}
	};
	start();
}
