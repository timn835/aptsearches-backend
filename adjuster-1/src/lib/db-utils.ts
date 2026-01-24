import {
	BatchWriteItemCommand,
	DynamoDBClient,
	GetItemCommand,
	QueryCommand,
	type QueryCommandInput,
	ScanCommand,
	type ScanCommandOutput,
	UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";
import { AptSource, Listing } from "./types";

const BOOKMARKS_TABLE = "aptsearches_bookmarks";
const LISTINGS_TABLE = "aptsearches_listings";

const dbClient = new DynamoDBClient({
	region: process.env.AWS_REGION,
	credentials: fromEnv(),
});

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
	return allItems.sort(
		(listingA, listingB) => listingB.dateFound - listingA.dateFound
	);
}

export async function deleteAllListings() {
	let ExclusiveStartKey: Record<string, any> | undefined;

	do {
		// 1. Scan up to 1000 items
		const scanResult = await dbClient.send(
			new ScanCommand({
				TableName: LISTINGS_TABLE,
				Limit: 1000,
				ExclusiveStartKey,
			})
		);

		if (scanResult.Items && scanResult.Items.length > 0) {
			// 2. Split into chunks of 25 (BatchWrite limit)
			for (let i = 0; i < scanResult.Items.length; i += 25) {
				const chunk = scanResult.Items.slice(i, i + 25);

				await dbClient.send(
					new BatchWriteItemCommand({
						RequestItems: {
							[LISTINGS_TABLE]: chunk.map((item) => ({
								DeleteRequest: {
									Key: {
										id: item.id,
										dateFound: item.dateFound,
									},
								},
							})),
						},
					})
				);
			}
		}

		ExclusiveStartKey = scanResult.LastEvaluatedKey;
	} while (ExclusiveStartKey);
}

export async function storeListings(listings: Listing[]) {
	// Batch create by 25
	const promises = [];
	let count = 0;
	while (count < listings.length) {
		const slicedListings = listings.slice(count, count + 25);
		count += 25;
		promises.push(
			dbClient.send(
				new BatchWriteItemCommand({
					RequestItems: {
						[LISTINGS_TABLE]: slicedListings.map(
							(listingToCreate) => ({
								PutRequest: {
									Item: Object.fromEntries(
										Object.entries(listingToCreate)
											.filter(
												([_, propValue]) =>
													propValue !== undefined
											)
											.map(([propKey, propValue]) => [
												propKey,
												typeof propValue === "string"
													? { S: propValue }
													: typeof propValue ===
													  "number"
													? { N: `${propValue}` }
													: typeof propValue ===
													  "boolean"
													? { BOOL: propValue }
													: { S: "" }, // default to an empty string
											])
									),
								},
							})
						),
					},
				})
			)
		);
	}
	await Promise.allSettled(promises);
}

export async function fetchBookmark(bookmarkType: string): Promise<string> {
	const command = new GetItemCommand({
		TableName: BOOKMARKS_TABLE,
		Key: {
			bookmarkType: { S: bookmarkType },
		},
	});
	const response = await dbClient.send(command);
	if (!response.Item || !response.Item.bookmark?.N)
		throw Error(`Unable to fetch bookmark of type "${bookmarkType}"`);
	return response.Item.bookmark.N;
}

export async function updateBookmark(bookmarkType: string, bookmark: number) {
	const command = new UpdateItemCommand({
		TableName: BOOKMARKS_TABLE,
		Key: {
			bookmarkType: { S: bookmarkType },
		},
		UpdateExpression: "SET #bookmark = :bookmark",
		ExpressionAttributeNames: {
			"#bookmark": "bookmark",
		},
		ExpressionAttributeValues: {
			":bookmark": { N: `${bookmark}` },
		},
	});
	await dbClient.send(command);
}
