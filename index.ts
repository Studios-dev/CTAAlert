import "jsr:@std/dotenv/load";

import { getCTAAlerts } from "./lib/cta.ts";
import { xPost } from "./lib/x.ts";
import { bskyPost } from "./lib/bsky.ts";
import { mastoPost } from "./lib/masto.ts";

const db = await Deno.openKv(
	Deno.env.get("DENO_DEPLOYMENT_ID") == undefined ? "./db.sqlite" : undefined,
);

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
	const deletedAlerts = new Set(
		alerts.CTAAlerts.Alert.filter((alert) =>
			!activeAlerts.has(alert.AlertId)
		)
			.map((alert) => alert.AlertId),
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
			}
		}

		if (bskyID == undefined || existingAlert?.lastMessage != alertMessage) {
			try {
				bskyID = await bskyPost(alertMessage, alert.EventStart);
			} catch (e) {
				console.error("An error occurred while posting to Bsky", e);
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
			await db.set(["alert", alert.AlertId], newEntry);
		}
	}

	// We might want to potentially do something about these alerts but I think for now I'm just going to ignore them
	for (const deletedAlert of deletedAlerts) {
		await db.delete(["alert", deletedAlert]);
	}
};
