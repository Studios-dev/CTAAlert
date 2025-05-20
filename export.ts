// Run this script occasionally to check for any new route status types or station abbreviations that are not in the codebase.

import { RouteStatusToColor } from "./lib/colors.ts";
import { stationToAbbreviation, getCTAAlerts } from "./lib/cta.ts";

const alert = await getCTAAlerts();

const types = new Set<string>();
const stations = new Set<string>();

const html: string[] = [];

for (const a of alert.CTAAlerts.Alert) {
	types.add(a.Impact);
	const impactedServices = Array.isArray(a.ImpactedService.Service) ? a.ImpactedService.Service : [a.ImpactedService.Service];
	for (const service of impactedServices) {
		if (service.ServiceType == "T") {
			stations.add(service.ServiceName.toUpperCase());
		}
	}

	html.push(a.FullDescription["#cdata-section"]);
}

for (const station of stations) {
	if (stationToAbbreviation[station as keyof typeof stationToAbbreviation] == undefined) {
		console.error("No abbreviation for station", station);
	}
}

for (const type of types) {
	if (RouteStatusToColor[type as keyof typeof RouteStatusToColor] == undefined) {
		console.error("No color for type", type);
	}
}

await Deno.writeTextFile(
	"./alerts.html",
	html.join("\n<!-- --- -->\n"),
);