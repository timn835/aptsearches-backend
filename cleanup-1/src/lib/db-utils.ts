import {
	DynamoDBClient,
	DescribeTableCommand,
	QueryCommand,
	BatchWriteItemCommand,
	type QueryCommandInput,
	type QueryCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";
import { AptSource } from "./types";

const LISTINGS_TABLE = "aptsearches_listings";

const dbClient = new DynamoDBClient({
	region: process.env.AWS_REGION,
	credentials: fromEnv(),
});

export async function getTotalListingsCount() {
	const command = new DescribeTableCommand({
		TableName: LISTINGS_TABLE,
	});

	const response = await dbClient.send(command);

	return response.Table?.ItemCount ?? 0;
}

export async function deleteOldListings(
	aptSource: AptSource,
	LIMIT_DATE: string,
) {
	// Fetch ALL items by aptSource (could be inefficient, but whatever)
	let lastEvaluatedKey: QueryCommandOutput["LastEvaluatedKey"] = undefined;
	const listingsToDelete: {
		dateFound: { N: string };
		id: { S: string };
	}[] = [];

	do {
		const params: QueryCommandInput = {
			TableName: LISTINGS_TABLE,
			IndexName: "aptSource-dateFound-index",
			KeyConditionExpression:
				"aptSource = :aptSource AND dateFound < :limit",
			ExpressionAttributeValues: {
				":aptSource": { S: aptSource },
				":limit": { N: LIMIT_DATE },
			},
			ProjectionExpression: "id,dateFound",
			ScanIndexForward: false,
			Limit: 1000,
			ExclusiveStartKey: lastEvaluatedKey,
		};
		const command = new QueryCommand(params);
		const response = await dbClient.send(command);
		if (response.Items) {
			listingsToDelete.push(
				...(response.Items as {
					dateFound: { N: string };
					id: { S: string };
				}[]),
			);
		}
		lastEvaluatedKey = response.LastEvaluatedKey;
	} while (lastEvaluatedKey);

	console.log(
		"We have",
		listingsToDelete.length,
		aptSource,
		"listings to delete",
	);

	// // Batch delete by 25
	// let promises = [];
	// let count = 0;
	// while (count < listingsToDelete.length) {
	// 	promises.push(
	// 		dbClient.send(
	// 			new BatchWriteItemCommand({
	// 				RequestItems: {
	// 					[LISTINGS_TABLE]: listingsToDelete
	// 						.slice(count, count + 25)
	// 						.map((listingToDelete) => ({
	// 							DeleteRequest: {
	// 								Key: listingToDelete,
	// 							},
	// 						})),
	// 				},
	// 			}),
	// 		),
	// 	);
	// 	count += 25;

	// 	// Reset and delete if we have 250 listings to delete
	// 	if (promises.length >= 10) {
	// 		await Promise.allSettled(promises);
	// 		console.log(
	// 			"Successfully deleted",
	// 			promises.length * 25,
	// 			"listings",
	// 		);
	// 		promises = [];
	// 	}
	// }

	// if (promises.length) {
	// 	await Promise.allSettled(promises);
	// 	console.log("Successfully deleted some tailing listings");
	// }

	return listingsToDelete;
}
