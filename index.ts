import "jsr:@std/dotenv/load";

import { getCTAAlerts } from "./lib/cta.ts";
import { xPost } from "./lib/x.ts";
import { bskyPost } from "./lib/bsky.ts";
import { mastoPost } from "./lib/masto.ts";

import { Embed, Webhook } from "jsr:@harmony/harmony";

const db = await Deno.openKv(
	Deno.env.get("DENO_DEPLOYMENT_ID") == undefined
		? Deno.env.get("DENO_DEPLOY_DB_URL")
		: undefined,
);
const hook = await Webhook.fromURL(Deno.env.get("DISCORD_WEBHOOK_URL")!);

interface Alert {
	lastMessage: string;
	twitterId?: string;
	mastodonId?: string;
	bskyId?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const bskyTimeout = 24 * 60 * 60 * 1000;
const mastoTimeout = 3 * 60 * 60 * 1000;

const postUpdatesCronAction = async () => {
	const updatedAlerts = new Set<string>();
	let [isTwitterBlocked, isMastoBlocked, isBskyBlocked] = await db.getMany<
		[boolean, boolean, boolean]
	>([["isTwitterBlocked"], ["isMastoBlocked"], ["isBskyBlocked"]]);
	const activeAlerts = new Map<string, Alert>();

	for await (const entry of db.list<Alert>({ "prefix": ["alert"] })) {
		activeAlerts.set(entry.key[1] as string, entry.value);
	}

	const alerts = await getCTAAlerts();
	console.log(
		`Checking ${alerts.CTAAlerts.Alert.length} alerts for updates...`,
	);
	const deletedAlerts = new Set(
		activeAlerts.keys().filter((key) =>
			alerts.CTAAlerts.Alert.find((a) => a.AlertId == key) == undefined
		),
	);

	for (
		const alert of alerts.CTAAlerts.Alert.sort((a, b) =>
			parseInt(b.AlertId) - parseInt(a.AlertId)
		)
	) {
		const alertMessage = [
			`[${alert.Impact}] ${alert.ShortDescription.trim()}`,
			"",
			`https://www.transitchicago.com/travel-information/alert-detail/?AlertId=${alert.AlertId}`,
		].join("\n");

		const existingAlert = activeAlerts.get(alert.AlertId);

		if (
			existingAlert != undefined &&
			existingAlert.lastMessage == alertMessage &&
			existingAlert.twitterId != undefined
		) {
			continue;
		}

		if (
			existingAlert != undefined &&
			existingAlert.lastMessage != alertMessage
		) {
			delete existingAlert.twitterId;
			delete existingAlert.mastodonId;
			delete existingAlert.bskyId;
		}

		let twitterID: string | undefined = existingAlert?.twitterId;
		let bskyID: string | undefined = existingAlert?.bskyId;
		let mastodonID: string | undefined = existingAlert?.mastodonId;

		// Twitter is broken on deploy currently
		const allowTwitter = Deno.env.get("DENO_DEPLOYMENT_ID") != undefined;

		if (
			allowTwitter &&
			isTwitterBlocked.value == undefined &&
			(twitterID == undefined ||
				existingAlert?.lastMessage != alertMessage)
		) {
			try {
				twitterID = await xPost(alertMessage);
			} catch (e) {
				console.error(
					"An error occurred while posting to Twitter",
					e,
					JSON.stringify(e),
					typeof e,
				);

				const timeoutReset =
					(e as { rateLimit: { day: { reset: number } } }).rateLimit
						.day.reset;
				const timeLeft = timeoutReset - (new Date().valueOf() / 1000);

				//if (JSON.parse(JSON.stringify(e))?.type != "request") {
				isTwitterBlocked = {
					...isTwitterBlocked,
					versionstamp: "",
					value: true,
				};
				await db.set(["isTwitterBlocked"], true, {
					// Add 1 minute for any potential inaccuracies
					expireIn: (timeLeft + 60) * 1000,
				});
				//}

				await hook.send({
					content: "<@!314166178144583682> Error occured",
					embeds: [
						new Embed({
							author: {
								name: "CTAAlert",
							},
							title:
								`Twitter error occured (Potentially blocked) ${alert.AlertId}`,
							description: "```" + (e as Error).message +
								"```",
							fields: [
								{
									name: "Original Message",
									value: alertMessage,
								},
							],
						}).setColor("random"),
					],
				});
			}
		}

		if (
			isBskyBlocked.value == undefined &&
			(bskyID == undefined || existingAlert?.lastMessage != alertMessage)
		) {
			try {
				bskyID = await bskyPost(alertMessage, alert.EventStart);
			} catch (e) {
				console.error("An error occurred while posting to Bsky", e);
				isBskyBlocked = {
					...isBskyBlocked,
					versionstamp: "",
					value: true,
				};
				await db.set(["isBskyBlocked"], true, {
					expireIn: bskyTimeout,
				});
				await hook.send({
					content: "<@!314166178144583682> Error occured",
					embeds: [
						new Embed({
							author: {
								name: "CTAAlert",
							},
							title:
								`Bsky error occured (Potentially blocked) ${alert.AlertId}`,
							description: "```" + (e as Error).message + "```",
							fields: [
								{
									name: "Original Message",
									value: alertMessage,
								},
							],
						}).setColor("random"),
					],
				});
			}
		}

		if (
			isMastoBlocked.value == undefined && (
				mastodonID == undefined ||
				existingAlert?.lastMessage != alertMessage
			)
		) {
			try {
				mastodonID = await mastoPost(alertMessage);
			} catch (e) {
				console.error("An error occurred while posting to Mastodon", e);
				isMastoBlocked = {
					...isMastoBlocked,
					versionstamp: "",
					value: true,
				};
				await db.set(["isMastoBlocked"], true, {
					expireIn: mastoTimeout,
				});
				await hook.send({
					content: "<@!314166178144583682> Error occured",
					embeds: [
						new Embed({
							author: {
								name: "CTAAlert",
							},
							title:
								`Mastodon error occured (Potentially blocked) ${alert.AlertId}`,
							description: "```" + (e as Error) + "```",
							fields: [
								{
									name: "Original Message",
									value: alertMessage,
								},
							],
						}).setColor("random"),
					],
				});
			}
		}

		const newEntry: Alert = {
			lastMessage: alertMessage,
			twitterId: twitterID,
			mastodonId: mastodonID,
			bskyId: bskyID,
		};

		if (
			JSON.stringify(existingAlert) != JSON.stringify(newEntry)
		) {
			console.log("Updating alert", alert.AlertId);
			await db.set(["alert", alert.AlertId], newEntry);
			updatedAlerts.add(alert.AlertId);
			await sleep(2000 - 1000 * Math.random());
		}
	}

	// We might want to potentially do something about these alerts but I think for now I'm just going to ignore them
	for (const deletedAlert of deletedAlerts) {
		console.log("Deleting alert", deletedAlert);
		await db.delete(["alert", deletedAlert]);
	}

	if (updatedAlerts.size > 0 || deletedAlerts.size > 0) {
		await hook.send({
			embeds: [
				new Embed({
					author: {
						name: "CTAAlert",
					},
					title: "Alerts updated",
					fields: [
						{
							name: "Updated/Added",
							value: `\`\`\`\n\t${
								updatedAlerts.keys().toArray().map((e) =>
									`- ${e}`
								).join("\n\t")
							}\n\`\`\``,
							inline: true,
						},
						{
							name: "Cleared",
							value: `\`\`\`\n\t${
								deletedAlerts.keys().toArray().map((e) =>
									`- ${e}`
								).join("\n\t")
							}\n\`\`\``,
							inline: true,
						},
					],
				}).setColor("random"),
			],
			name: "CTAAlert",
		});
	}

	console.log("Done checking alerts");
};

const somethingsBroken = false;
// Update every 5 minutes
// Do nothing if something's broken
Deno.cron(
	"SendUpdates",
	{ minute: { every: 5 } },
	somethingsBroken
		? () => {}
		: Deno.env.get("DENO_DEPLOYMENT_ID") != undefined
		? postUpdatesCronAction
		: () => {},
);

if (Deno.env.get("DENO_DEPLOYMENT_ID") == undefined) {
	postUpdatesCronAction();
}

// const alert = "105396";
// const value = await db.get<Alert>(["alert", alert]);
// console.log(value, value.value?.lastMessage);

// value.value!.twitterId = "1891354533978050775"
// await db.set(["alert", alert], value.value!);
