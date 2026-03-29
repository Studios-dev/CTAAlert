import { env } from "cloudflare:workers";
import { ApiResponseError, TwitterApi } from "twitter-api-v2";
import { tryOrFail } from "./misc.ts";

const client = new TwitterApi({
	appKey: env.TWITTER_APP_KEY,
	appSecret: env.TWITTER_APP_SECRET,
	accessToken: env.TWITTER_ACCESS_TOKEN,
	accessSecret: env.TWITTER_ACCESS_TOKEN_SECRET,
});

export const postTwitter = async (
	content: string,
): Promise<
	| { success: true; postID: string }
	| {
			success: false;
			error: Error;
			/** Timeout in MS */
			ratelimitTimeout: number;
	  }
> => {
	const request = await tryOrFail(
		client.v2.tweet(content, {
			// TODO: Media and other stuff potentially
		}),
	);

	if (!request.success) {
		console.error(request.error);

		let timeLeft = 24 * 60 * 60 * 1000; // Default to 24h

		if (request.error instanceof ApiResponseError) {
			const resetTime = request.error.rateLimit?.day?.reset;

			if (resetTime) {
				timeLeft = resetTime - Date.now() / 1000;
			}
		}

		return { success: false, error: request.error, ratelimitTimeout: timeLeft };
	}

	return {
		success: true,
		postID: request.data.data.id,
	};
};
