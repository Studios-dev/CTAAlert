import { env } from "cloudflare:workers";
import { inArray, lte } from "drizzle-orm";
import { postBluesky } from "./utils/bluesky.ts";
import { getCTAAlerts } from "./utils/cta/index.ts";
import { Embed } from "./utils/discord/embed.ts";
import { Webhook } from "./utils/discord/webhook.ts";
import { getDrizzle, schema } from "./utils/drizzle.ts";
import { postMastodon } from "./utils/mastodon.ts";
import { tryOrFail } from "./utils/misc.ts";
import { postTwitter } from "./utils/twitter.ts";

const postErrorMessage = async (
	webhook: Webhook,
	platform: string,
	alertID: string,
	alertMessage: string,
	error: Error,
	ratelimitTimeout: number,
) => {
	const timestampValue = (Date.now() / 1000 + ratelimitTimeout).toFixed(0);

	const webhookSend = await tryOrFail(
		webhook.send({
			content: "<@!314166178144583682> Error occured",
			embeds: [
				new Embed({
					author: {
						name: "CTAAlert",
					},
					title: `${platform} error occured (Potentially blocked) ${alertID}`,
					description:
						"Account will be unblocked <t:" +
						timestampValue +
						":R>\n```" +
						(error as Error).message +
						"```",
					fields: [
						{
							name: "Original Message",
							value: alertMessage,
						},
					],
				}).setColor("random"),
			],
		}),
	);

	if (!webhookSend.success) {
		console.error(
			"Failed to send error message to Discord webhook:",
			webhookSend.error,
		);
	}
};

export default {
	async fetch() {
		return Response.json({
			ok: true,
			...(process.env.NODE_ENV === "development"
				? {
						// Add a url to trigger the cron in dev - Bloxs
						url: `http://localhost:8787/__scheduled?cron=*/5+*+*+*+*`,
					}
				: {}),
		});
	},

	async scheduled() {
		console.log("Performing CTA Alert check...");
		const drizzle = getDrizzle();
		const webhook = await Webhook.fromURL(env.DISCORD_WEBHOOK_URL);

		let {
			CTAAlerts: { Alert: alerts },
		} = await getCTAAlerts();

		// Sorting will absolutely break if the API starts returning non-numeric alert IDs, but for now this is fine - Bloxs
		alerts = alerts.sort(
			(a, b) => parseInt(b.AlertId, 10) - parseInt(a.AlertId, 10),
		);

		const alertIDs = alerts.map((alert) => alert.AlertId);

		console.log(`Fetched ${alerts.length} alerts from CTA API. Checking for updates...`);

		const ratelimitedPlatforms = await drizzle.query.ratelimit.findMany({
			where: () => lte(schema.ratelimit.resetTime, new Date()),
		});

		let [twitterBlocked, mastodonBlocked, blueskyBlocked] = [
			ratelimitedPlatforms.some((r) => r.platform === "twitter"),
			ratelimitedPlatforms.some((r) => r.platform === "mastodon"),
			ratelimitedPlatforms.some((r) => r.platform === "bluesky"),
		];

		const existingAlerts = await drizzle.query.alert.findMany({
			where: () => inArray(schema.alert.id, alertIDs),
		});

		const alertInfo: {
			content: string;
			alertID: string;
			updateType: "created" | "updated" | "deleted";
		}[] = [];

		for (const alert of alerts) {
			const id = alert.AlertId;
			let existingAlert = existingAlerts.find((a) => a.id === id) ?? {
				id,
				blueskyID: null,
				mastodonID: null,
				twitterID: null,
				lastAlertContent: "",
			};

			const previousAlert = structuredClone(existingAlert);

			const alertMessage = [
				`[${alert.Impact}] ${alert.ShortDescription.trim()}`,
				alert.AlertURL["#cdata-section"],
			].join("\n\n");

			if (existingAlert.lastAlertContent !== alertMessage) {
				existingAlert = {
					...existingAlert,
					blueskyID: null,
					mastodonID: null,
					twitterID: null,
				};
			} else {
				if (
					[
						existingAlert.twitterID,
						existingAlert.mastodonID,
						existingAlert.blueskyID,
					].every((id) => id !== null)
				) {
					continue;
				}
			}

			// Twitter
			if (!twitterBlocked && existingAlert?.twitterID === null) {
				const post = await postTwitter(alertMessage);

				if (post.success) {
					existingAlert.twitterID = post.postID;
				} else {
					twitterBlocked = true;

					await drizzle.insert(schema.ratelimit).values({
						platform: "twitter",
						resetTime: new Date(Date.now() + post.ratelimitTimeout),
					});

					await tryOrFail(
						postErrorMessage(
							webhook,
							"Twitter",
							alert.AlertId,
							alertMessage,
							post.error,
							post.ratelimitTimeout,
						),
					);
				}
			}

			// Bluesky
			if (!blueskyBlocked && existingAlert?.blueskyID === null) {
				const post = await postBluesky(alertMessage);

				if (post.success) {
					existingAlert.blueskyID = post.postID;
				} else {
					blueskyBlocked = true;

					await drizzle.insert(schema.ratelimit).values({
						platform: "bluesky",
						resetTime: new Date(Date.now() + post.ratelimitTimeout),
					});

					await tryOrFail(
						postErrorMessage(
							webhook,
							"Bluesky",
							alert.AlertId,
							alertMessage,
							post.error,
							post.ratelimitTimeout,
						),
					);
				}
			}

			// Mastodon
			if (!mastodonBlocked && existingAlert?.mastodonID === null) {
				const post = await postMastodon(alertMessage);

				if (post.success) {
					existingAlert.mastodonID = post.postID;
				} else {
					mastodonBlocked = true;

					await drizzle.insert(schema.ratelimit).values({
						platform: "mastodon",
						resetTime: new Date(Date.now() + post.ratelimitTimeout),
					});

					await tryOrFail(
						postErrorMessage(
							webhook,
							"Mastodon",
							alert.AlertId,
							alertMessage,
							post.error,
							post.ratelimitTimeout,
						),
					);
				}
			}

			if (JSON.stringify(previousAlert) !== JSON.stringify(existingAlert)) {
				const createdOrUpdated =
					previousAlert.lastAlertContent === "" ? "created" : "updated";

				alertInfo.push({
					content: alertMessage,
					alertID: alert.AlertId,
					updateType: createdOrUpdated,
				});

				console.log(
					`${createdOrUpdated === "created" ? "Creating" : "Updating"} alert ${existingAlert.id} in database`,
				);
				await drizzle
					.insert(schema.alert)
					.values({
						id: existingAlert.id,
						blueskyID: existingAlert.blueskyID,
						mastodonID: existingAlert.mastodonID,
						twitterID: existingAlert.twitterID,
						lastAlertContent: alertMessage,
					})
					.onConflictDoUpdate({
						target: schema.alert.id,
						set: {
							blueskyID: existingAlert.blueskyID,
							mastodonID: existingAlert.mastodonID,
							twitterID: existingAlert.twitterID,
							lastAlertContent: alertMessage,
						},
					});

				await new Promise((resolve) =>
					setTimeout(resolve, 500 + Math.random() * 1000),
				);
			}
		}

		await tryOrFail(
			webhook.send({
				embeds: [
					new Embed({
						author: {
							name: "CTAAlert",
						},
						title: "Alerts updated",
						fields: alertInfo.slice(0, 25).map((info) => ({
							name: `${info.updateType.toUpperCase()}: ${info.alertID}`,
							value: `\`\`\`\n\t${info.content}\n\`\`\``,
							inline: true,
						})),
						footer: {
							text: `Total alerts updated: ${alertInfo.length}`,
						},
					}).setColor("random"),
				],
				name: "CTAAlert",
			}),
		);

		// TODO (tbd): Do we do cleanup of existing alerts that are no longer returned by the API? - Bloxs

		console.log(`CTA Alert check completed. ${alertInfo.length} alerts created/updated.`);
	},
};
