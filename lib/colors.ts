export enum COLORS {
	RED = "#C60C30",
	BLUE = "#00A1DE",
	BROWN = "#62361B",
	GREEN = "#009B3A",
	ORANGE = "#F9461C",
	PURPLE = "#522398",
	PINK = "#E27EA6",
	YELLOW = "#F9E300",
	GREY = "#565A5C",
}

export enum RouteStatusToColor {
	"Normal Service" = COLORS.GREEN,
	"Service Disruption" = COLORS.RED,
	"Planned Reroute" = COLORS.BLUE,
	"Planned Work w/Station(s) Bypassed" = COLORS.BLUE,
	"Bus Stop Note" = COLORS.GREY,
	"Minor Delays / Reroute" = COLORS.ORANGE,
	"Service Change" = COLORS.BLUE,
	"Bus Stop Relocation" = "",
	"Added Service" = COLORS.GREEN,
	"Significant Delays" = COLORS.RED,
	"Minor Delays" = COLORS.ORANGE,
}
