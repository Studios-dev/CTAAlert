import "jsr:@std/dotenv/load";
import { getCTAAlerts } from "./lib/cta.ts";
import { toArray } from "./lib/utils.ts";

let alerts = "";

for (const alert of (await getCTAAlerts()).CTAAlerts.Alert) {
	alerts +=
		`Alert: ${alert.AlertId}; [${alert.Impact}]; ${alert.ShortDescription.trim()}; ${
			toArray(alert.ImpactedService.Service).map((s) => s.ServiceName)
				.join(", ")
		}; ${alert.EventStart} - ${alert.EventEnd}\n`;
}

await Deno.writeTextFile("alerts.txt", alerts);
