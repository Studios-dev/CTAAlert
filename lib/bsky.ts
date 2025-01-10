import { AtpAgent, RichText } from "npm:@atproto/api";

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
	const text = new RichText({
		text: msg,
	});

	await text.detectFacets(agent);

	return (await agent.post({
		text: msg,
		createdAt: new Date(postedAt).toISOString(),
		facets: text.facets,
	})).cid;
};
