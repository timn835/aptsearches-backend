import {
	DynamoDBClient,
	QueryCommand,
	GetItemCommand,
	PutItemCommand,
	type QueryCommandInput,
} from "@aws-sdk/client-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";
import { v4 as uuidv4 } from "uuid";
import { type Listing, type AptSource } from "./types";

const LISTINGS_TABLE = "aptsearches_listings";
const SUBSCRIPTIONS_TABLE = "aptsearches_subscriptions";

const dbClient = new DynamoDBClient({
	region: process.env.AWS_REGION,
	credentials: fromEnv(),
});

export async function fetchListings(aptSource: AptSource): Promise<Listing[]> {
	const params: QueryCommandInput = {
		TableName: LISTINGS_TABLE,
		IndexName: "aptSource-dateFound-index",
		KeyConditionExpression: "aptSource = :aptSource",
		ExpressionAttributeValues: {
			":aptSource": { S: aptSource },
		},
		// ProjectionExpression: "id",
		ScanIndexForward: false,
		Limit: 1000,
	};
	const command = new QueryCommand(params);
	const response = await dbClient.send(command);
	if (!response?.Items)
		throw Error(`Unable to fetch listings from ${aptSource} source`);
	return response.Items.map((item) =>
		Object.fromEntries(
			Object.entries(item).map(([key, value]) => {
				if (value.S) return [key, value.S];
				if (value.N) {
					// handle floating point
					if (key === "price") {
						return [key, parseFloat(value.N)];
					}
					// handle integer
					return [key, parseInt(value.N)];
				}
				if (value.BOOL) return [key, value.BOOL];
				return [key, Object.values(value)[0]];
			})
		)
	) as Listing[];
}

export async function fetchSubscription(
	email: string,
	subscriptionIndex: number
): Promise<{ subscriptionIndex: number; isVerified: boolean } | undefined> {
	const params = {
		TableName: SUBSCRIPTIONS_TABLE,
		Key: {
			email: { S: email },
			subscriptionIndex: { N: `${subscriptionIndex}` },
		},
		ProjectionExpression: "email, subscriptionIndex, isVerified",
	};

	const command = new GetItemCommand(params);
	const response = await dbClient.send(command);

	if (response.Item) {
		const item = {
			subscriptionIndex: Number(response.Item.subscriptionIndex.N),
			isVerified: response.Item.isVerified.BOOL!,
		};
		return item;
	}
}

export async function storeSubscription(
	email: string,
	subscriptionIndex: number,
	bedrooms?: number,
	minPrice?: number,
	maxPrice?: number,
	neighborhood?: string
) {
	const searchParams: any = {};
	if (bedrooms !== undefined) {
		searchParams.bedrooms = { N: `${bedrooms}` };
	}
	if (minPrice !== undefined) {
		searchParams.minPrice = { N: `${minPrice}` };
	}
	if (maxPrice !== undefined) {
		searchParams.maxPrice = { N: `${maxPrice}` };
	}
	if (neighborhood !== undefined) {
		searchParams.neighborhood = { S: `${neighborhood}` };
	}

	const item = {
		email: { S: email },
		subscriptionIndex: { N: `${subscriptionIndex}` },
		searchParams: { M: searchParams },
	};

	const command = new PutItemCommand({
		TableName: SUBSCRIPTIONS_TABLE,
		Item: item,
	});

	await dbClient.send(command);
}
