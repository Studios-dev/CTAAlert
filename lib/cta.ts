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
	| "Special Note"
	| "Minor Delays"
	| "Elevator Status"
	| "Service Suspended";

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
	"35TH-BRONZEVILLE-IIT": "IIT",
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
	ADDISON: "ADD",
	ARGYLE: "ARG",
	ARMITAGE: "ARM",
	ASHLAND: "ASH",
	"ASHLAND/63RD": "A63",
	AUSTIN: "AUS",
	BELMONT: "BEL",
	BERWYN: "BYN",
	"BRYN MAWR": "BMR",
	CALIFORNIA: "CAL",
	CENTRAL: "CEN",
	"CENTRAL PARK": "CPK",
	"CERMAK-CHINATOWN": "CCT",
	"CERMAK-MCCORMICK PLACE": "CMP",
	CHICAGO: "CHI",
	CICERO: "CIC",
	"CLARK/DIVISION": "CDV",
	"CLARK/LAKE": "CLK",
	CLINTON: "CLN",
	"CONSERVATORY-CENTRAL PARK DRIVE": "CPD",
	"COTTAGE GROVE": "CTG",
	CUMBERLAND: "CML",
	DAMEN: "DAM",
	DAVIS: "DAV",
	DEMPSTER: "DMP",
	"DEMPSTER-SKOKIE": "DMS",
	DIVERSEY: "DSY",
	DIVISION: "DVN",
	"FOREST PARK": "FOP",
	FOSTER: "FOS",
	FRANCISCO: "FRA",
	FULLERTON: "FUL",
	GARFIELD: "GAR",
	GRAND: "GND",
	GRANVILLE: "GVL",
	HALSTED: "HAL",
	HARLEM: "HAR",
	"HARLEM/LAKE": "HAL",
	"HAROLD WASHINGTON LIBRARY-STATE/VAN BUREN": "HWL",
	HARRISON: "HAR",
	HOWARD: "HOW",
	"ILLINOIS MEDICAL DISTRICT": "IMD",
	INDIANA: "IN",
	"IRVING PARK": "IRP",
	JACKSON: "JCK",
	JARVIS: "JAR",
	"JEFFERSON PARK": "JFP",
	KEDZIE: "KDZ",
	"KEDZIE-HOMAN": "KZH",
	KIMBALL: "KMB",
	"KING DRIVE": "KDR",
	KOSTNER: "KOS",
	LAKE: "LK",
	LARAMIE: "LAR",
	LASALLE: "LAS",
	LAWRENCE: "LAW",
	LINDEN: "LIN",
	"LOGAN SQUARE": "LSQ",
	LOYOLA: "LOY",
	MAIN: "MN",
	"MERCHANDISE MART": "MM",
	MICHIGAN: "MI",
	MIDWAY: "MDW",
	MONROE: "MON",
	MONTROSE: "MON",
	MORGAN: "MOR",
	MORSE: "MSE",
	"NORTH/CLYBOURN": "NC",
	NOYES: "NOY",
	"O'HARE": "ORD",
	"OAK PARK": "OP",
	"OAKTON-SKOKIE": "OSK",
	PAULINA: "PAU",
	POLK: "POL",
	PULASKI: "PUL",
	QUINCY: "QCY",
	RACINE: "RAC",
	RIDGELAND: "RIL",
	ROCKWELL: "RKW",
	ROOSEVELT: "ROO",
	ROSEMONT: "RMT",
	SEDGWICK: "SDW",
	SHERIDAN: "SHD",
	"SOUTH BOULEVARD": "SBD",
	SOUTHPORT: "SPT",
	"SOX-35TH": "S35",
	"STATE/LAKE": "SLK",
	THORNDALE: "TRN",
	"UIC-HALSTED": "UIC",
	WASHINGTON: "WSH",
	"WASHINGTON/WABASH": "WWA",
	"WASHINGTON/WELLS": "WWL",
	WELLINGTON: "WEL",
	WESTERN: "WES",
	WILSON: "WIL",
};
