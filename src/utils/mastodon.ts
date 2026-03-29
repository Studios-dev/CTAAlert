import { env } from "cloudflare:workers";
import { createRestAPIClient } from "masto";
import { tryOrFail } from "./misc.ts";

const client = createRestAPIClient({
	accessToken: env.MASTO_TOKEN,
	// TODO: (tbd) do we make this an env variable?
	url: "https://mastodon.social/api/v1/",
});

const mastoTimeout = 3 * 60 * 60 * 1000;

export const postMastodon = async (
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
	const post = await tryOrFail(
		client.v1.statuses.create({
			status: content,
			visibility: "public",
		})
	);

	if (!post.success) {
		console.error(post.error);

		return {
			success: false,
			error: post.error,
			ratelimitTimeout: mastoTimeout,
		};
	}

	return {
		success: true,
		postID: post.data.id,
	};
};
