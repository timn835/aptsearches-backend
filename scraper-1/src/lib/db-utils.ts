import {
	BatchWriteItemCommand,
	DynamoDBClient,
	QueryCommand,
	type QueryCommandInput,
	type QueryCommandOutput,
	// ScanCommand,
	// UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";
import { v4 as uuidv4 } from "uuid";
import { AptSource, type Listing } from "./types";

const LISTINGS_TABLE = "aptsearches_listings";

const dbClient = new DynamoDBClient({
	region: process.env.AWS_REGION,
	credentials: fromEnv(),
});

export async function storeListings(listings: Listing[], aptSource: AptSource) {
	// Fetch ALL items by aptSource (could be inefficient, but whatever)
	let lastEvaluatedKey: QueryCommandOutput["LastEvaluatedKey"] | undefined =
		undefined;
	const allItems: string[] = [];

	do {
		const params: QueryCommandInput = {
			TableName: LISTINGS_TABLE,
			IndexName: "aptSource-dateFound-index",
			KeyConditionExpression: "aptSource = :aptSource",
			ExpressionAttributeValues: {
				":aptSource": { S: aptSource },
			},
			ProjectionExpression: "id",
			ScanIndexForward: false,
			Limit: 1000,
			ExclusiveStartKey: lastEvaluatedKey,
		};
		const command = new QueryCommand(params);
		const response = await dbClient.send(command);
		if (response.Items) {
			allItems.push(
				...response.Items.map((item) => item.id.S?.split(":")[0] || "")
			);
		}

		lastEvaluatedKey = response.LastEvaluatedKey;
	} while (lastEvaluatedKey);
	// console.log("all existing items length:", allItems.length);

	const existingIdsSet = new Set<string>(allItems);
	// console.log("existing items ids set size:", existingIdsSet.size);

	// Batch create by 25
	const promises = [];
	let count = 0;
	const finalListings = [];
	while (count < listings.length) {
		const slicedListings = [];
		for (let i = count; i < Math.min(count + 25, listings.length); i++) {
			if (existingIdsSet.has(listings[i].id)) continue;
			// Adjust the listing's id for dynamodb
			listings[i].id = `${listings[i].id}:${uuidv4()}`;

			slicedListings.push(listings[i]);
			finalListings.push(listings[i]);
		}
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
	return finalListings;
}
