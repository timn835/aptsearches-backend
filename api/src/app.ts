import awsLambdaFastify from "@fastify/aws-lambda";
import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { allowedOrigins, getListings } from "./lib/constants";

const app: FastifyInstance = Fastify();

await app.register(cors, {
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

app.get("/hello", async () => {
	return "world";
});

app.get<{
	Querystring: { bedrooms: number; minPrice: number; maxPrice: number };
}>("/listings", getListings, async (request, reply) => {
	console.log(
		request.query.bedrooms,
		request.query.minPrice,
		request.query.maxPrice
	);
	reply.send({ listings: [] });
});

const proxy = awsLambdaFastify(app);

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
			await app.listen({ port: 3000 });
			console.log("listening on port 3000");
		} catch (err) {
			app.log.error(err);
			process.exit(1);
		}
	};
	start();
}
