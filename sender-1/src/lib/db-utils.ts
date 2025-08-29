import {
	// BatchWriteItemCommand,
	DynamoDBClient,
	QueryCommand,
	type QueryCommandInput,
	type QueryCommandOutput,
	ScanCommand,
	GetItemCommand,
	ScanCommandOutput,
	ScanCommandInput,
	// UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";
import { AptSource, Listing, type Subscription } from "./types";

const SUBSCRIPTIONS_TABLE = "aptsearches_subscriptions";
const BOOKMARKS_TABLE = "aptsearches_bookmarks";
const LISTINGS_TABLE = "aptsearches_listings";

const dbClient = new DynamoDBClient({
	region: process.env.AWS_REGION,
	credentials: fromEnv(),
});

export async function fetchSubscriptions(): Promise<Subscription[]> {
	const command = new ScanCommand({
		TableName: SUBSCRIPTIONS_TABLE,
	});

	const response = await dbClient.send(command);
	if (!response.Items) return [];
	return response.Items.map((item) => ({
		email: item.email.S!,
		subscriptionIndex: parseInt(item.subscriptionIndex.N!),
		dateStarted: parseInt(item.dateStarted.N!),
		searchParams: Object.fromEntries(
			Object.entries(item.searchParams.M!).map(
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
	}));
}

export async function fetchBookmark(bookmarkType: string): Promise<string> {
	const command = new GetItemCommand({
		TableName: BOOKMARKS_TABLE,
		Key: {
			bookmarkType: { S: bookmarkType },
		},
	});
	const response = await dbClient.send(command);
	if (!response.Item || !response.Item.bookmark?.S)
		throw Error(`Unable to fetch bookmark of type "${bookmarkType}"`);
	return response.Item.bookmark.S;
}

export async function fetchListings(
	bookmark: string,
	aptSource?: AptSource
): Promise<Listing[]> {
	if (!aptSource) {
		const results = await Promise.allSettled(
			Object.values(AptSource).map((aptSource) =>
				fetchListings(bookmark, aptSource)
			)
		);
		return results
			.filter((result) => result.status === "fulfilled")
			.map((result) => result.value)
			.flat(1);
	}

	let lastEvaluatedKey: ScanCommandOutput["LastEvaluatedKey"] = undefined;
	const allItems: any[] = [];

	do {
		const params: QueryCommandInput = {
			TableName: LISTINGS_TABLE,
			IndexName: "aptSource-dateFound-index",
			KeyConditionExpression: `aptSource = :aptSource${
				!lastEvaluatedKey ? " AND dateFound > :bookmark" : ""
			}`,
			ExpressionAttributeValues: {
				":aptSource": { S: aptSource },
				":bookmark": { N: bookmark },
			},
			ScanIndexForward: false,
			Limit: 1000,
			ExclusiveStartKey: lastEvaluatedKey,
		};
		const command = new QueryCommand(params);
		const response = await dbClient.send(command);
		if (!response?.Items)
			throw Error(`Unable to fetch listings from ${aptSource} source`);
		allItems.push(
			...(response.Items.map((item) =>
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
			) as Listing[])
		);
		lastEvaluatedKey = response.LastEvaluatedKey;
	} while (lastEvaluatedKey);
	return allItems;
}
