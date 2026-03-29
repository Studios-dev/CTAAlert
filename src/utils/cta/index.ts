import { CTA_ALERT_URL, CTA_STATUS_URL, type CTAAlertStatusResponse, type CTAStatusResponse } from "./consts.ts";

export const getCTAAlerts = async (): Promise<CTAAlertStatusResponse> => {
	const req = await fetch(CTA_ALERT_URL);
	const res = await req.json() as CTAAlertStatusResponse;

	return res;
};

export const getCTAStatus = async (): Promise<CTAStatusResponse> => {
	const req = await fetch(CTA_STATUS_URL);
	const res = await req.json() as CTAStatusResponse;

	return res;
};
