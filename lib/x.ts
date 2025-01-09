import { TwitterApi } from "npm:twitter-api-v2";

const client = new TwitterApi({
	// these two values come from your app's API keys
	appKey: Deno.env.get("TWITTER_APP_KEY")!,
	appSecret: Deno.env.get("TWITTER_APP_SECRET")!,

	// these two values come from the user's access tokens
	accessToken: Deno.env.get("TWITTER_ACCESS_TOKEN")!,
	accessSecret: Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")!,
});

export const xPost = async (
	status: string,
	replyTo: string | undefined = undefined,
) => {
	return (await client.v2.tweet(status, {
		reply: replyTo
			? {
				in_reply_to_tweet_id: replyTo,
			}
			: undefined,
	})).data.id;
};

