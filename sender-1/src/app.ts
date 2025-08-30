import {
	fetchBookmark,
	fetchListings,
	fetchSubscriptions,
	updateBookmark,
} from "./lib/db-utils";
import { sendBulkEmails } from "./lib/email-utils";
import { type Listing } from "./lib/types";

export const send1Handler = async () => {
	if (process.env.ENV !== "PROD") {
		const dotenv = await import("dotenv");
		dotenv.config();
	}

	try {
		// Get all subscriptions from database
		const subscriptions = await fetchSubscriptions();

		// Get the send listings bookmark
		const bookmark = await fetchBookmark("sendingEmails");

		// Fetch all listings from bookmark
		const listings = await fetchListings(bookmark);

		// Add listings to each email
		const emailListings: Record<
			string,
			{ listings: Listing[]; unsubscribeSecret: string }
		> = {};

		for (const {
			email,
			unsubscribeSecret,
			searchParams,
		} of subscriptions) {
			emailListings[email] = { listings: [], unsubscribeSecret };
			for (const listing of listings) {
				if (
					searchParams.bedrooms &&
					searchParams.bedrooms < listing.size
				)
					continue;
				if (
					searchParams.minPrice &&
					searchParams.minPrice > listing.price
				)
					continue;
				if (
					searchParams.maxPrice &&
					searchParams.maxPrice < listing.price
				)
					continue;
				if (
					searchParams.neighborhood &&
					searchParams.neighborhood !== listing.neighborhood
				)
					continue;
				emailListings[email].listings.push(listing);
			}
		}

		// Send out emails
		await sendBulkEmails(emailListings);

		// TODO: Update the bookmark
		await updateBookmark(
			"sendingEmails",
			listings.length ? listings[0]?.dateFound : new Date().getTime()
		);

		return {
			emailListings,
		};
	} catch (error) {
		console.error(error);
		return {
			statusCode: 500,
			message: "Unable to complete send1Handler",
		};
	}
};
