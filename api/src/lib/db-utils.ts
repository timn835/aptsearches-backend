import {
	DynamoDBClient,
	GetItemCommand,
	PutItemCommand,
	QueryCommand,
	DeleteItemCommand,
	type QueryCommandInput,
} from "@aws-sdk/client-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";
import { type Subscription, type AptSource, type Listing } from "./types";
import { encrypt } from "./utils";

const LISTINGS_TABLE = "aptsearches_listings";
const SUBSCRIPTIONS_TABLE = "aptsearches_subscriptions";
const SUGGESTIONS_TABLE = "aptsearches_suggestions";

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
): Promise<Subscription | undefined> {
	const params = {
		TableName: SUBSCRIPTIONS_TABLE,
		Key: {
			email: { S: email },
			subscriptionIndex: { N: `${subscriptionIndex}` },
		},
	};

	const command = new GetItemCommand(params);
	const response = await dbClient.send(command);

	if (response.Item) {
		return {
			email: response.Item.email.S!,
			unsubscribeSecret: response.Item.unsubscribeSecret.S!,
			subscriptionIndex: parseInt(response.Item.subscriptionIndex.N!),
			dateStarted: parseInt(response.Item.dateStarted.N!),
			searchParams: Object.fromEntries(
				Object.entries(response.Item.searchParams.M!).map(
					([paramKey, paramValue]) => [
						paramKey,
						paramKey === "bedrooms"
							? parseInt(paramValue.N!)
							: paramKey === "minPrice" || paramKey === "maxPrice"
							? parseFloat(paramValue.N!)
							: paramValue.S,
					]
				)
			),
		};
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

	// Get the date for timestamp
	const now = new Date();

	// Get the unsubscribe secret as encrypted email
	const unsubscribeSecret = encrypt(`${email}:${subscriptionIndex}`);

	const item = {
		email: { S: email },
		unsubscribeSecret: { S: unsubscribeSecret },
		subscriptionIndex: { N: `${subscriptionIndex}` },
		dateStarted: { N: `${now.getTime()}` },
		searchParams: { M: searchParams },
	};

	const command = new PutItemCommand({
		TableName: SUBSCRIPTIONS_TABLE,
		Item: item,
	});

	await dbClient.send(command);
}

export async function removeSubscription(
	email: string,
	subscriptionIndex: string
) {
	const command = new DeleteItemCommand({
		TableName: SUBSCRIPTIONS_TABLE,
		Key: {
			email: { S: email },
			subscriptionIndex: { N: subscriptionIndex },
		},
	});
	await dbClient.send(command);
}

export async function storeSuggestion(email: string, suggestion: string) {
	const item = {
		email: { S: email },
		suggestion: { S: suggestion },
	};

	const command = new PutItemCommand({
		TableName: SUGGESTIONS_TABLE,
		Item: item,
	});

	await dbClient.send(command);
}
