import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const alert = sqliteTable("alert", {
	// TODO (tbd): Do I want to add smth like status to this? 
	id: text().notNull().primaryKey(),
	lastAlertContent: text().notNull(),
	twitterID: text(),
	blueskyID: text(),
	mastodonID: text(),
});