import awsLambdaFastify from "@fastify/aws-lambda";
import cors from "@fastify/cors";
import fastify, { type FastifyPluginAsync } from "fastify";
import {
	allowedOrigins,
	createSubscription,
	getListings,
} from "./lib/constants";
import {
	fetchListings,
	removeSubscription,
	storeSubscription,
} from "./lib/db-utils";
import { AptSource } from "./lib/types";
import { decrypt, EMAIL_REGEX, MTL_NEIGHBORHOODS } from "./lib/utils";
import { sendVerificationEmail } from "./lib/email-utils";

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
	});

	fastify.get("/hello", async () => {
		return "world";
	});

	fastify.get<{
		Querystring: {
			bedrooms?: string;
			minPrice?: string;
			maxPrice?: string;
			neighborhood?: string;
		};
	}>("/listings", getListings, async (request, reply) => {
		try {
			// Destructure query params
			let {
				bedrooms,
				minPrice,
				maxPrice,
				neighborhood: requestedNeighborhood,
			} = request.query;
			let bedroomsAsNum = bedrooms ? parseInt(bedrooms) : undefined;
			let minPriceAsNum = minPrice ? parseFloat(minPrice) : undefined;
			let maxPriceAsNum = maxPrice ? parseFloat(maxPrice) : undefined;

			// Adjust params
			if (
				minPriceAsNum !== undefined &&
				(isNaN(minPriceAsNum) || minPriceAsNum < 0)
			)
				minPriceAsNum = undefined;
			if (
				maxPriceAsNum !== undefined &&
				(isNaN(maxPriceAsNum) || maxPriceAsNum < 0)
			)
				maxPriceAsNum = undefined;
			if (
				minPriceAsNum !== undefined &&
				maxPriceAsNum !== undefined &&
				maxPriceAsNum < minPriceAsNum
			) {
				minPriceAsNum = undefined;
			}
			if (
				bedroomsAsNum !== undefined &&
				(isNaN(bedroomsAsNum) || bedroomsAsNum < 0 || bedroomsAsNum > 6)
			)
				bedroomsAsNum = undefined;
			if (
				!requestedNeighborhood ||
				!MTL_NEIGHBORHOODS.has(requestedNeighborhood)
			)
				requestedNeighborhood = undefined;

			// Fetch at most 1000 listings of each source
			const promises = Object.values(AptSource).map((aptSource) =>
				fetchListings(aptSource)
			);
			const results = await Promise.allSettled(promises);

			// Filter and send at most 200 listings, sorted by date found
			const filteredListings = results
				.filter((result) => result.status === "fulfilled")
				.map((result) => result.value)
				.flat(1)
				.filter(({ size, price, neighborhood }) => {
					if (bedroomsAsNum !== undefined && bedroomsAsNum > size)
						return false;
					if (minPriceAsNum !== undefined && minPriceAsNum > price)
						return false;
					if (maxPriceAsNum !== undefined && maxPriceAsNum < price)
						return false;
					if (
						requestedNeighborhood !== undefined &&
						requestedNeighborhood !== neighborhood
					)
						return false;
					return true;
				})
				.sort(
					(listingA, listingB) =>
						listingB.dateFound - listingA.dateFound
				)
				.slice(0, 200);

			reply.send({ listings: filteredListings });
		} catch (error) {
			console.error(error);
			reply.status(500).send({ message: "Unable to fetch listings" });
		}
	});

	fastify.post<{
		Body: {
			email: string;
			bedrooms?: number;
			minPrice?: number;
			maxPrice?: number;
			neighborhood?: string;
		};
	}>("/subscription", createSubscription, async (request, reply) => {
		try {
			let { email, bedrooms, minPrice, maxPrice, neighborhood } =
				request.body;
			// Check if the email satisfies the regex
			if (!EMAIL_REGEX.test(email))
				throw Error("The email is of incorrect format");

			// Format the email to be lowercase and to handle the + trick for gmail
			let [prefix, suffix] = email.split("@");
			prefix = prefix.split("+")[0];
			email = `${prefix}@${suffix}`.toLowerCase();

			// Adjust params
			if (
				minPrice !== undefined &&
				(minPrice < 0 || typeof minPrice !== "number")
			)
				minPrice = undefined;
			if (
				maxPrice !== undefined &&
				(maxPrice < 0 || typeof maxPrice !== "number")
			)
				maxPrice = undefined;
			if (
				minPrice !== undefined &&
				maxPrice !== undefined &&
				maxPrice < minPrice
			) {
				minPrice = undefined;
			}
			if (bedrooms !== undefined && (bedrooms < 0 || bedrooms > 6))
				bedrooms = undefined;
			if (!neighborhood || !MTL_NEIGHBORHOODS.has(neighborhood))
				neighborhood = undefined;

			// Form search params string
			const searchParams = [
				`email=${email}`,
				bedrooms !== undefined ? `bedrooms=${bedrooms}` : "",
				minPrice !== undefined ? `minPrice=${minPrice}` : "",
				maxPrice !== undefined ? `maxPrice=${maxPrice}` : "",
				neighborhood !== undefined
					? `neighborhood=${neighborhood}`
					: "",
			]
				.filter((param) => param)
				.join("&");

			// Form email text
			const emailText = `
				<p>Please confirm that you want to receive email notifications for listings with the following characteristics:</p>
				<p>Bedrooms: ${bedrooms === undefined ? "-" : `${bedrooms}+`}</p>
				<p>Minimum price: ${minPrice === undefined ? "-" : `${minPrice}`}</p>
				<p>Maximum price: ${maxPrice === undefined ? "-" : `${maxPrice}`}</p>
				<p>Neighborhood: ${!neighborhood ? "-" : neighborhood}</p>
				<p>Please be aware that any existing subscriptions will be replaced by this one.</p>

			`;

			// Send the verification email
			await sendVerificationEmail(email, searchParams, emailText);

			reply
				.status(200)
				.send({ message: "Verification email sent successfully" });
		} catch (error) {
			console.error(error);
			reply
				.status(500)
				.send({ message: "Unable to send email verification" });
		}
	});

	fastify.get<{
		Querystring: {
			secret: string;
		};
	}>("/verify", async (request, reply) => {
		try {
			// Destructure query params
			let decryptedSecret = decrypt(request.query.secret);
			if (!decryptedSecret) throw Error("Decryption failed");
			let {
				email,
				bedrooms,
				minPrice,
				maxPrice,
				neighborhood,
			}: {
				email: string;
				bedrooms?: string;
				minPrice?: string;
				maxPrice?: string;
				neighborhood?: string;
			} = Object.fromEntries(
				decryptedSecret.split("&").map((param) => param.split("="))
			);

			if (!email || !EMAIL_REGEX.test(email))
				throw Error("Invalid decrypted email");
			let bedroomsAsNum = bedrooms ? parseInt(bedrooms) : undefined;
			if (bedroomsAsNum !== undefined && isNaN(bedroomsAsNum))
				bedroomsAsNum = undefined;
			let minPriceAsNum = minPrice ? parseFloat(minPrice) : undefined;
			if (minPriceAsNum !== undefined && isNaN(minPriceAsNum))
				minPriceAsNum = undefined;
			let maxPriceAsNum = maxPrice ? parseFloat(maxPrice) : undefined;
			if (maxPriceAsNum !== undefined && isNaN(maxPriceAsNum))
				maxPriceAsNum = undefined;
			if (neighborhood && !MTL_NEIGHBORHOODS.has(neighborhood))
				neighborhood = undefined;

			// Create/update subscription
			await storeSubscription(
				email,
				0,
				bedroomsAsNum,
				minPriceAsNum,
				maxPriceAsNum,
				neighborhood
			);

			reply.redirect(
				`${process.env.FRONTEND_URL}?subscription_success=true`
			);
		} catch (error) {
			console.error(error);
			reply.redirect(
				`${process.env.FRONTEND_URL}?subscription_success=false`
			);
		}
	});

	fastify.get<{
		Querystring: {
			secret: string;
		};
	}>("/unsubscribe", async (request, reply) => {
		try {
			// Destructure query params
			let decryptedSecret = decrypt(request.query.secret);
			if (!decryptedSecret) throw Error("Decryption failed");
			let [email, subscriptionIndex] = decryptedSecret.split(":");

			if (
				!email ||
				!EMAIL_REGEX.test(email) ||
				isNaN(parseInt(subscriptionIndex))
			)
				throw Error("Invalid unsubscribe secret");

			// Delete subscription
			await removeSubscription(email, subscriptionIndex);

			reply.redirect(
				`${process.env.FRONTEND_URL}?unsubscribe_success=true`
			);
		} catch (error) {
			console.error(error);
			reply.redirect(
				`${process.env.FRONTEND_URL}?unsubscribe_success=false`
			);
		}
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
			console.error(err);
			process.exit(1);
		}
	};
	start();
}
