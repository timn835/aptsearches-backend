import { scrapeKijiji } from "./lib/scrape-utils";

export const scrape1Handler = async () => {
    try {
        const listings = await scrapeKijiji("https://www.kijiji.ca/b-location-court-terme/ville-de-montreal/bachelor+studio/c42l1700281a227?price=1000__1500&sort=dateDesc&view=list");
        return {
            statusCode: 200,
            listings,
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
                message: "Unable to complete scrape1Handler",
        };
    }
};
