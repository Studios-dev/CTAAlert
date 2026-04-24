import { env } from "cloudflare:workers";
import { inArray, gte } from "drizzle-orm";
import { postBluesky } from "./utils/bluesky.ts";
import { getCTAAlerts } from "./utils/cta/index.ts";
import { Embed } from "./utils/discord/embed.ts";
import { Webhook } from "./utils/discord/webhook.ts";
import { getDrizzle, schema } from "./utils/drizzle.ts";
import { postMastodon } from "./utils/mastodon.ts";
import { titleCase, tryOrFail } from "./utils/misc.ts";
import { postTwitter } from "./utils/twitter.ts";

let webhook: Webhook | undefined;

export const initializeWebhook = async (): Promise<Webhook> => {
	if (webhook !== undefined) return webhook;
	webhook = await Webhook.fromURL(env.DISCORD_WEBHOOK_URL);
	return webhook;
};

const postErrorMessage = async (
	platform: string,
	alertID: string,
	alertMessage: string,
	error: Error,
	ratelimitTimeout: number,
) => {
	const timestampValue = ((Date.now() + ratelimitTimeout) / 1000).toFixed(0);
	const webhook = await initializeWebhook();

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

		let {
			CTAAlerts: { Alert: alerts },
		} = await getCTAAlerts();

		// Sorting will absolutely break if the API starts returning non-numeric alert IDs, but for now this is fine - Bloxs
		alerts = alerts.sort(
			(a, b) => parseInt(b.AlertId, 10) - parseInt(a.AlertId, 10),
		);

		const alertIDs = alerts.map((alert) => alert.AlertId);

		console.log(
			`Fetched ${alerts.length} alerts from CTA API. Checking for updates...`,
		);

		const ratelimitedPlatforms = await drizzle.query.ratelimit.findMany({
			where: () => gte(schema.ratelimit.resetTime, new Date()),
		});

		let [twitterBlocked, mastodonBlocked, blueskyBlocked] = [
			ratelimitedPlatforms.some((r) => r.platform === "twitter"),
			ratelimitedPlatforms.some((r) => r.platform === "mastodon"),
			ratelimitedPlatforms.some((r) => r.platform === "bluesky"),
		];

		if ([twitterBlocked, mastodonBlocked, blueskyBlocked].some((r) => r)) {
			console.log(
				`Currently ratelimited: Twitter: ${twitterBlocked ? "Y" : "N"}, Mastodon: ${mastodonBlocked ? "Y" : "N"}, Bluesky: ${blueskyBlocked ? "Y" : "N"}`,
			);
		}

		const existingAlerts = await drizzle.query.alert.findMany({
			where: () => inArray(schema.alert.id, alertIDs),
		});

		const alertInfo: {
			content: string;
			alertID: string;
			updateType: "created" | "updated" | "deleted";
			link: string;
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
					}).onConflictDoUpdate({
						target: schema.ratelimit.platform,
						set: {
							resetTime: new Date(Date.now() + post.ratelimitTimeout),
						},
					});

					await tryOrFail(
						postErrorMessage(
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
					link: alert.AlertURL["#cdata-section"],
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

		if (alertInfo.length > 0) {
			const webhook = await initializeWebhook();
			await tryOrFail(
				webhook.send({
					embeds: [
						new Embed({
							author: {
								name: "CTAAlert",
							},
							title: "Alerts updated",
							description: [
								twitterBlocked,
								mastodonBlocked,
								blueskyBlocked,
							].some((r) => r)
								? `Currently ratelimited: Twitter: ${twitterBlocked ? "Y" : "N"}, Mastodon: ${mastodonBlocked ? "Y" : "N"}, Bluesky: ${blueskyBlocked ? "Y" : "N"}`
								: undefined,

							fields: alertInfo.slice(0, 25).map((info) => ({
								name: `${titleCase(info.updateType)}: ${info.alertID}`,
								value: `${info.link}\n\`\`\`\n${info.content.substring(0, info.content.lastIndexOf(info.link)).trim()}\n\`\`\``,
							})),
							footer: {
								text: `Total alerts updated: ${alertInfo.length}`,
							},
						}).setColor("random"),
					],
					name: "CTAAlert",
				}),
			);
		}

		// TODO (tbd): Do we do cleanup of existing alerts that are no longer returned by the API? - Bloxs

		console.log(
			`CTA Alert check completed. ${alertInfo.length} alerts created/updated.`,
		);
	},
};
