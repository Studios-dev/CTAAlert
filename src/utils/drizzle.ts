import { env } from "cloudflare:workers";
import { drizzle as drizzleClient } from "drizzle-orm/d1";
import * as schema from "../db/schema.ts";

export { schema };

let drizzleInstance: ReturnType<typeof drizzleClient<typeof schema, D1Database>> | null = null;

export const getDrizzle = () => {
	if (drizzleInstance !== null) return drizzleInstance;

	drizzleInstance ??= drizzleClient(env.ctaalert, {
		casing: "snake_case",
		schema,
	});

	return drizzleInstance;
};
