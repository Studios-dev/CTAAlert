import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const ratelimit = sqliteTable("ratelimit", {
	platform: text()
		.$type<"twitter" | "bluesky" | "mastodon">()
		.notNull()
		.primaryKey(),
	resetTime: integer({
		mode: "timestamp",
	}).notNull(),
});
