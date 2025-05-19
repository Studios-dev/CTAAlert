import { CTA_ALERT_URL } from "./consts.ts";

export type CTARouteStatus =
	| "Normal Service"
	| "Service Disruption"
	| "Planned Reroute"
	| "Planned Work w/Station(s) Bypassed"
	| "Bus Stop Note"
	| "Minor Delays / Reroute"
	| "Service Change"
	| "Bus Stop Relocation"
	| "Added Service"
	| "Significant Delays"
	| "Minor Delays";

export type CTASeverity = "normal" | "major" | "minor" | "planned";
/** B = Bus, T = Train Station, R = Train Route, X = Systemwide */
export type CTAServiceType = "T" | "R" | "X" | "B";

export interface CTAImpactedService {
	ServiceType: CTAServiceType;
	ServiceTypeDescription: string;
	/** Affected service */
	ServiceName: string;
	ServiceId: string;
	ServiceBackColor: string;
	ServiceTextColor: string;
	ServiceURL: {
		"#cdata-section": string;
	};
}

export interface CTAAlertStatusResponse {
	CTAAlerts: {
		TimeStamp: string;
		ErrorCode: string;
		ErrorMessage: null;
		Alert: {
			AlertId: string;
			/** Alert title */
			Headline: string;
			ShortDescription: string;
			FullDescription: {
				/** HTML of alert */
				"#cdata-section": string;
			};
			SeverityScore: string;
			SeverityColor: string;
			SeverityCSS: CTASeverity;
			Impact: CTARouteStatus;
			EventStart: string;
			EventEnd: string | null;
			/** If there's an defined end time, 1 = no, 2 = yes */
			TBD: "0" | "1";
			/** 1 = severe, 0 = "minor" */
			MajorAlert: "0" | "1";
			AlertURL: {
				"#cdata-section": string;
			};
			ImpactedService: {
				Service: CTAImpactedService[] | CTAImpactedService;
			};
			ttim: "0";
			GUID: string;
		}[];
	};
}

export const getCTAAlerts = async (): Promise<CTAAlertStatusResponse> => {
	const req = await fetch(CTA_ALERT_URL);
	const res = await req.json();

	return res;
};

export interface CTAStatusResponse {
	CTARoutes: {
		TimeStamp: string;
		ErrorCode: string[];
		ErrorMessage: unknown[];
		RouteInfo: {
			Route: string;
			RouteColorCode: string;
			RouteTextColor: string;
			ServiceId: string;
			RouteURL: {
				"#cdata-section": string;
			};
			RouteStatus: CTARouteStatus;
			RouteStatusColor: string;
		}[];
	};
}

export const getCTAStatus = async (): Promise<CTAStatusResponse> => {
	const req = await fetch(CTA_ALERT_URL);
	const res = await req.json();

	return res;
};

// Need to figure out how the API returns FP and ORD branch stations for Harlem & Western
export const stationToAbbreviation = {
	"103RD": "103",
	"111TH": "111",
	"130TH": "130",
	"18TH": "18",
	"35TH-BRONZEVILLE-IIT": "3BI",
	"35TH/ARCHER": "35",
	"43RD": "43",
	"47TH": "47",
	"51ST": "51",
	"54TH/CERMAK": "5C",
	"63RD": "63",
	"69TH": "69",
	"79TH": "79",
	"87TH": "87",
	"95TH/DAN RYAN": "95",
	"ADAMS/WABASH": "AW",
	ADDISON: "AD",
	ARGYLE: "AR",
	ARMITAGE: "AM",
	ASHLAND: "AS",
	"ASHLAND/63RD": "A63",
	AUSTIN: "AU",
	BELMONT: "BL",
	BERWYN: "BY",
	"BRYN MAWR": "BM",
	CALIFORNIA: "CA",
	CENTRAL: "CN",
	"CENTRAL PARK": "CP",
	"CERMAK-CHINATOWN": "CC",
	"CERMAK-MCORMICK PLACE": "CMP",
	CHICAGO: "CHI",
	CICERO: "CI",
	"CLARK/DIVISION": "CD",
	"CLARK/LAKE": "CL",
	CLINTON: "CLN",
	"CONSERVATORY-CENTRAL PARK DRIVE": "CPD",
	"COTTAGE GROVE": "CG",
	CUMBERLAND: "CU",
	DAMEN: "DM",
	DAVIS: "DA",
	DEMPSTER: "DE",
	"DEMPSTER-SKOKIE": "DS",
	DIVERSEY: "DSY",
	DIVISION: "DVN",
	"FOREST PARK": "FP",
	FOSTER: "FO",
	FRANCISCO: "FR",
	FULLERTON: "FL",
	GARFIELD: "GAR",
	GRAND: "GND",
	GRANVILLE: "GVL",
	HALSTED: "HAL",
	HARLEM: "HAR",
	"HARLEM/LAKE": "HL",
	"HAROLD WASHINGTON LIBRARY-STATE/VAN BUREN": "HW",
	HARRISON: "HR",
	HOWARD: "HWD",
	"ILLINOIS MEDICAL DISTRICT": "IMD",
	INDIANA: "IN",
	"IRVING PARK": "IP",
	JACKSON: "JK",
	JARVIS: "JR",
	"JEFFERSON PARK": "JP",
	KEDZIE: "KZ",
	"KEDZIE-HOMAN": "KH",
	KIMBALL: "KB",
	"KING DRIVE": "KD",
	KOSTNER: "KO",
	LAKE: "LK",
	LARAMIE: "LA",
	LASALLE: "LA",
	LAWRENCE: "LW",
	LINDEN: "LN",
	"LOGAN SQUARE": "LS",
	LOYOLA: "LOY",
	MAIN: "MN",
	"MERCHANDISE MART": "MM",
	MICHIGAN: "MI",
	MIDWAY: "MDW",
	MONROE: "MON",
	MONTROSE: "MT",
	MORGAN: "MO",
	MORSE: "MSE",
	"NORTH/CLYBOURN": "NC",
	NOYES: "NOY",
	"O'HARE": "ORD",
	"OAK PARK": "OP",
	"OAKTON-SKOKIE": "OS",
	PAULINA: "PA",
	POLK: "PO",
	PULASKI: "PU",
	QUINCY: "QCY",
	RACINE: "RA",
	RIDGELAND: "RI",
	ROCKWELL: "RW",
	ROOSEVELT: "RO",
	ROSEMONT: "RM",
	SEDGWICK: "SDW",
	SHERIDAN: "SHD",
	"SOUTH BOULEVARD": "SB",
	SOUTHPORT: "SP",
	"SOX-35TH": "35",
	"STATE/LAKE": "SL",
	THORNDALE: "TRN",
	"UIC-HALSTED": "UIC",
	WASHINGTON: "WSH",
	"WASHINGTON/WABASH": "WWA",
	"WASHINGTON/WELLS": "WWL",
	WELLINGTON: "WL",
	WESTERN: "WN",
	WILSON: "WS",
};
