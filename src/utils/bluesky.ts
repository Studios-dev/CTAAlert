import { env } from "cloudflare:workers";
import { AtpAgent, RichText } from "@atproto/api";
import { tryOrFail } from "./misc.ts";

const agent = new AtpAgent({
	service: "https://bsky.social",
});

// It doesn't look like bsky returns a timeout on rate limit, so we'll just default to 24h - Bloxs
const bskyTimeout = 24 * 60 * 60 * 1000;

export const postBluesky = async (
	content: string,
	postedAt?: Date,
): Promise<
	| { success: true; postID: string }
	| {
			success: false;
			error: Error;
			/** Timeout in MS */
			ratelimitTimeout: number;
	  }
> => {
	if (!agent.hasSession) {
		await agent.login({
			identifier: env.BSKY_EMAIL,
			password: env.BSKY_PASSWORD,
		});
	}

	const text = new RichText({ text: content });

	text.detectFacets(agent);

	const post = await tryOrFail(
		agent.post({
			text: content,
			facets: text.facets,
			createdAt: postedAt?.toISOString(),
		}),
	);

	if (!post.success) {
		console.error(post.error);

		return {
			success: false,
			error: post.error,
			ratelimitTimeout: bskyTimeout,
		};
	}

	return {
		success: true,
		postID: post.data.cid,
	};
};
