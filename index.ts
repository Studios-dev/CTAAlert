import "jsr:@std/dotenv/load";

import { getCTAAlerts } from "./lib/cta.ts";
import { xPost } from "./lib/x.ts";
import { bskyPost } from "./lib/bsky.ts";
import { mastoPost } from "./lib/masto.ts";

import { Embed, Webhook } from "jsr:@harmony/harmony";

const db = await Deno.openKv(
	Deno.env.get("DENO_DEPLOYMENT_ID") != undefined
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

const postUpdatesCronAction = async () => {
	let isTwitterBlocked = await db.get<boolean>(["isTwitterBlocked"]);
	const activeAlerts = new Map<string, Alert>();

	for await (const entry of db.list<Alert>({ "prefix": ["alert"] })) {
		activeAlerts.set(entry.key[1] as string, entry.value);
	}

	const alerts = await getCTAAlerts();
	console.log(
		`Checking ${alerts.CTAAlerts.Alert.length} alerts for updates...`,
	);
	const deletedAlerts = new Set(
		activeAlerts.keys().filter((key) => activeAlerts.get(key) != undefined),
	);

	for (
		const alert of alerts.CTAAlerts.Alert.sort((a, b) =>
			parseInt(b.AlertId) - parseInt(a.AlertId)
		).slice(0, 1)
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

		let twitterID: string | undefined = existingAlert?.twitterId;
		let bskyID: string | undefined = existingAlert?.bskyId;
		let mastodonID: string | undefined = existingAlert?.mastodonId;

		if (
			isTwitterBlocked.value == undefined &&
			(twitterID == undefined ||
				existingAlert?.lastMessage != alertMessage)
		) {
			try {
				twitterID = await xPost(alertMessage);
			} catch (e) {
				console.error("An error occurred while posting to Twitter", e);
				isTwitterBlocked = {
					...isTwitterBlocked,
					versionstamp: "",
					value: true,
				};
				await db.set(["isTwitterBlocked"], true, {
					expireIn: 24 * 60 * 60 * 1000,
				});
				await hook.send({
					content: "<@!314166178144583682> Error occured",
					embeds: [
						new Embed({
							author: {
								name: "CTAAlert",
							},
							title:
								"Twitter error occured (Potentially blocked)",
							description: "```" + (e as Error).message + "```",
						}).setColor("random"),
					],
				});
			}
		}

		if (bskyID == undefined || existingAlert?.lastMessage != alertMessage) {
			try {
				bskyID = await bskyPost(alertMessage, alert.EventStart);
			} catch (e) {
				console.error("An error occurred while posting to Bsky", e);
				await hook.send({
					content: "<@!314166178144583682> Error occured",
					embeds: [
						new Embed({
							author: {
								name: "CTAAlert",
							},
							title: "Bsky error occured",
							description: "```" + (e as Error).message + "```",
						}).setColor("random"),
					],
				});
			}
		}

		if (
			mastodonID == undefined ||
			existingAlert?.lastMessage != alertMessage
		) {
			try {
				mastodonID = await mastoPost(alertMessage);
			} catch (e) {
				console.error("An error occurred while posting to Mastodon", e);
				await hook.send({
					content: "<@!314166178144583682> Error occured",
					embeds: [
						new Embed({
							author: {
								name: "CTAAlert",
							},
							title: "Mastodon error occured",
							description: "```" + (e as Error).message + "```",
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
		}
	}

	// We might want to potentially do something about these alerts but I think for now I'm just going to ignore them
	for (const deletedAlert of deletedAlerts) {
		console.log("Deleting alert", deletedAlert);
		await db.delete(["alert", deletedAlert]);
	}

	console.log("Done checking alerts");
};

if (Deno.env.get("DENO_DEPLOYMENT_ID") != undefined) {
	// The code doesn't work atm so don't make it run
	Deno.exit(0);
	Deno.cron("SendUpdates", { hour: { every: 5 } }, postUpdatesCronAction);
}
