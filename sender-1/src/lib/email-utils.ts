import { SESClient, SendBulkTemplatedEmailCommand } from "@aws-sdk/client-ses";
import { fromEnv } from "@aws-sdk/credential-providers";
import { type Listing } from "./types";
import { formatNumber } from "./utils";

const emailClient = new SESClient({
	region: process.env.AWS_REGION,
	credentials: fromEnv(),
});

export async function sendBulkEmails(
	emailListings: Record<
		string,
		{ listings: Listing[]; unsubscribeSecret: string }
	>
) {
	const destinations = Object.entries(emailListings)
		.filter(([_, { listings }]) => listings.length)
		.map(([email, { listings, unsubscribeSecret }]) => ({
			Destination: { ToAddresses: [email] },
			ReplacementTemplateData: JSON.stringify({
				listings: listings
					.map(
						(l) => `
        <tr>
          <td style="width:160px;padding:8px;border-bottom:1px solid #ddd;">
  <a href="${l.url}" target="_blank" style="text-decoration:none;">
    <!--[if mso]>
    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:150px;height:150px;">
      <v:fill type="frame" src="${l.imageUrl}" color="#cccccc" />
      <v:textbox inset="0,0,0,0">
    <![endif]-->
    <div
      style="
        width:150px;
        height:150px;
        border-radius:6px;
        overflow:hidden;
        background-image:url('${l.imageUrl}');
        background-size:cover;
        background-position:center;
        background-repeat:no-repeat;
        display:block;
      ">
    </div>
    <!--[if mso]>
      </v:textbox>
    </v:rect>
    <![endif]-->
  </a>
          </td>
          <td style="width:90px;padding:8px;border-bottom:1px solid #ddd;font-weight:bold;color:#333;">
            $${formatNumber(l.price)}
          </td>
          <td style="width:100px;padding:8px;border-bottom:1px solid #ddd;">
            ${l.aptSource}
          </td>
          <td style="width:180px;padding:8px;border-bottom:1px solid #ddd;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${l.address}
          </td>
          <td style="width:180px;padding:8px;border-bottom:1px solid #ddd;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${l.name}
          </td>
          <td style="width:90px;padding:8px;border-bottom:1px solid #ddd;text-align:center;">
            <a href="${l.url}" target="_blank"
               style="display:inline-block;background-color:#3B82F6;color:#ffffff;
                      padding:4px 8px;border-radius:4px;text-decoration:none;
                      font-weight:bold;font-size:12px;white-space:nowrap;">
              View
            </a>
          </td>
        </tr>
      `
					)
					.join(""),
				unsubscribeLink: `${process.env.BACKEND_URL}/unsubscribe?secret=${unsubscribeSecret}`,
			}),
		}));

	if (!destinations.length) return;

	await emailClient.send(
		new SendBulkTemplatedEmailCommand({
			Source: "no-reply@aptsearches.com",
			Template: "SendListingsTemplate",
			DefaultTemplateData: "{}",
			Destinations: destinations,
		})
	);
}
