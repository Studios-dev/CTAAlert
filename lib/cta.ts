import { CTA_ALERT_URL } from "./consts.ts";

export type CTARouteStatus =
    | "Normal Service"
    | "Service Disruption"
    | "Planned Reroute"
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
