import { API } from "npm:tsl-mastodon-api";

const client = new API({
	access_token: Deno.env.get("MASTO_TOKEN")!,
	api_url: "https://mastodon.social/api/v1/",
});

export const mastoPost = async (
	status: string,
	replyTo: string | undefined = undefined,
) => {
	return (await client.postStatus({
		status,
		visibility: "public",
		in_reply_to_id: replyTo,
	})).json.id;
};
