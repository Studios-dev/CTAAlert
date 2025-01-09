import { AtpAgent } from "npm:@atproto/api";

const agent = new AtpAgent({
	service: "https://bsky.social",
});

await agent.login({
	identifier: Deno.env.get("BSKY_EMAIL")!,
	password: Deno.env.get("BSKY_PASSWORD")!,
});

export const bskyPost = async (
	msg: string,
	postedAt: string,
) => {
	return (await agent.post({
		text: msg,
		createdAt: new Date(postedAt).toISOString(),
	})).cid;
};
