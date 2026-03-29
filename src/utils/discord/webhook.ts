// Adapted from @harmonyland/harmony for use in cf workers

import type {
	AllWebhookMessageOptions,
	WebhookMessageOptions,
	WebhookPayload,
} from "@harmony/harmony";
import { Constants } from "./constants.ts";
import { Embed } from "./embed.ts";
import { tryOrFail } from "../misc.ts";

export class Webhook {
	get url(): string {
		return `${Constants.DISCORD_API_URL}/v${
			Constants.DISCORD_API_VERSION
		}/webhooks/${this.id}/${this.token}`;
	}

	get id(): string {
		return this.payload.id;
	}

	get token(): string {
		// biome-ignore lint/style/noNonNullAssertion: Token is required here
		return this.payload.token!;
	}

	constructor(private payload: WebhookPayload) {}

	async send(
		text?: string | AllWebhookMessageOptions,
		option?: AllWebhookMessageOptions,
	): Promise<void> {
		if (typeof text === "object") {
			option = text;
			text = option.content;
		}

		if (text === undefined && option === undefined) {
			throw new Error("Either text or option is necessary.");
		}

		if (option instanceof Embed)
			option = {
				embeds: [option],
			};

		const payload = {
			content: text,
			embeds:
				(option as WebhookMessageOptions)?.embed !== undefined
					? [(option as WebhookMessageOptions).embed]
					: (option as WebhookMessageOptions)?.embeds !== undefined
						? (option as WebhookMessageOptions).embeds
						: undefined,
			file: (option as WebhookMessageOptions)?.file,
			files: (option as WebhookMessageOptions)?.files,
			tts: (option as WebhookMessageOptions)?.tts,
			allowed_mentions: (option as WebhookMessageOptions)?.allowedMentions,
			username: undefined as undefined | string,
			avatar_url: undefined as undefined | string,
			components: (option as WebhookMessageOptions)?.components,
		};

		if ((option as WebhookMessageOptions)?.name !== undefined) {
			payload.username = (option as WebhookMessageOptions)?.name;
		}

		if ((option as WebhookMessageOptions)?.avatar !== undefined) {
			payload.avatar_url = (option as WebhookMessageOptions)?.avatar;
		}

		if (
			payload.embeds !== undefined &&
			Array.isArray(payload.embeds) &&
			payload.embeds.length > 10
		)
			throw new Error(`Cannot send more than 10 embeds through Webhook`);

		await fetch(`${this.url}?wait=true`, {
			method: "POST",
			body: JSON.stringify(payload),
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	static async fromURL(url: string | URL): Promise<Webhook> {
		const raw = await (
			await fetch(typeof url === "string" ? url : url.toString())
		).json();

		return new Webhook(raw as WebhookPayload);
	}
}
