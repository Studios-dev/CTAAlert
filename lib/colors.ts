import { CTARouteStatus } from "./cta.ts";

export enum COLORS {
	// Official CTA colors
	RED = "#C60C30",
	BLUE = "#00A1DE",
	BROWN = "#62361B",
	GREEN = "#009B3A",
	ORANGE = "#F9461C",
	PURPLE = "#522398",
	PINK = "#E27EA6",
	YELLOW = "#F9E300",
	GREY = "#565A5C",

	// Custom colors
}

export const RouteStatusToColor: Record<CTARouteStatus, string> = {
	"Normal Service": COLORS.GREEN,
	"Service Disruption": COLORS.RED,
	"Planned Reroute": COLORS.BLUE,
	"Planned Work w/Station(s) Bypassed": COLORS.BLUE,
	"Bus Stop Note": COLORS.GREY,
	"Minor Delays / Reroute": COLORS.ORANGE,
	"Service Change": COLORS.BLUE,
	"Bus Stop Relocation": COLORS.GREY,
	"Added Service": COLORS.GREEN,
	"Significant Delays": COLORS.RED,
	"Minor Delays": COLORS.ORANGE,
	"Elevator Status": COLORS.GREY,
	"Special Note": COLORS.GREY,
	"Service Suspended": COLORS.RED,
};
