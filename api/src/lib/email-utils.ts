import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { fromEnv } from "@aws-sdk/credential-providers";
import { encrypt } from "./utils";

const emailClient = new SESClient({
	region: process.env.AWS_REGION,
	credentials: fromEnv(),
});

export async function sendVerificationEmail(
	email: string,
	searchParams: string,
	emailText: string
) {
	// Encrypt the search params as a secret
	const encryptedSecret = encrypt(searchParams);
	const url = `${process.env.BACKEND_URL}/verify?secret=${encryptedSecret}`;
	const params = {
		Destination: {
			ToAddresses: [email],
		},
		Message: {
			Body: {
				Html: {
					Charset: "UTF-8",
					Data: `
						<html>
  <body style="font-family: Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0;">
    <div style="max-width: 400px; margin: 40px auto; padding: 20px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center;">
      <h1 style="color: #1e3a8a; font-size: 20px; margin-bottom: 20px;">Confirm your subscription</h1>
	  <p>${emailText}</p>
      <a href="${url}" target="_blank" 
         style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px;">
        Confirm
      </a>
    </div>
  </body>
</html>

  `,
				},
				Text: {
					Charset: "UTF-8",
					Data: `Confirm your email by going to this url: ${url}`,
				},
			},
			Subject: {
				Charset: "UTF-8",
				Data: "APTSearches Subscription Confirmation",
			},
		},
		Source: "no-reply@aptsearches.com",
	};

	await emailClient.send(new SendEmailCommand(params));
}
