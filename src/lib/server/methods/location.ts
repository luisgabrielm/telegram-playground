import type { TelegramReplyMarkup } from '$lib/reply-markup';

export const TELEGRAM_LOCATION_ACCURACY_MIN = 0;
export const TELEGRAM_LOCATION_ACCURACY_MAX = 1500;
export const TELEGRAM_LOCATION_LIVE_PERIOD_MIN = 60;
export const TELEGRAM_LOCATION_LIVE_PERIOD_MAX = 86_400;
export const TELEGRAM_LOCATION_LIVE_PERIOD_INDEFINITE = 2_147_483_647;
export const TELEGRAM_LOCATION_HEADING_MIN = 1;
export const TELEGRAM_LOCATION_HEADING_MAX = 360;
export const TELEGRAM_LOCATION_PROXIMITY_MIN = 1;
export const TELEGRAM_LOCATION_PROXIMITY_MAX = 100_000;

export interface SendLocationInput {
	chatId: string;
	latitude: string | number;
	longitude: string | number;
	horizontalAccuracy?: string | number;
	livePeriod?: string | number;
	heading?: string | number;
	proximityAlertRadius?: string | number;
	replyMarkup?: TelegramReplyMarkup;
}

export interface SendLocationBody {
	chat_id: string;
	latitude: number;
	longitude: number;
	horizontal_accuracy?: number;
	live_period?: number;
	heading?: number;
	proximity_alert_radius?: number;
	reply_markup?: TelegramReplyMarkup;
}

export type PreparedSendLocation =
	| { ok: true; request: { method: 'sendLocation'; body: SendLocationBody } }
	| { ok: false; errors: Record<string, string> };

export function prepareSendLocation(input: SendLocationInput): PreparedSendLocation {
	const errors: Record<string, string> = {};
	if (!input.chatId.trim()) errors.chatId = 'Enter a chat ID or channel username.';

	const latitude = parseNumber(input.latitude, -90, 90);
	const longitude = parseNumber(input.longitude, -180, 180);
	if (latitude === null) errors.latitude = 'Latitude must be a number from -90 to 90.';
	if (longitude === null) errors.longitude = 'Longitude must be a number from -180 to 180.';

	const horizontalAccuracy = parseOptionalNumber(
		input.horizontalAccuracy,
		TELEGRAM_LOCATION_ACCURACY_MIN,
		TELEGRAM_LOCATION_ACCURACY_MAX
	);
	if (horizontalAccuracy === null) {
		errors.horizontalAccuracy = 'Horizontal accuracy must be a number from 0 to 1,500 meters.';
	}

	const livePeriod = parseLivePeriod(input.livePeriod);
	if (livePeriod === null) {
		errors.livePeriod = 'Live period must be 60–86,400 seconds or 2,147,483,647.';
	}

	const heading = parseOptionalInteger(
		input.heading,
		TELEGRAM_LOCATION_HEADING_MIN,
		TELEGRAM_LOCATION_HEADING_MAX
	);
	if (heading === null) errors.heading = 'Heading must be a whole number from 1 to 360.';

	const proximityAlertRadius = parseOptionalInteger(
		input.proximityAlertRadius,
		TELEGRAM_LOCATION_PROXIMITY_MIN,
		TELEGRAM_LOCATION_PROXIMITY_MAX
	);
	if (proximityAlertRadius === null) {
		errors.proximityAlertRadius = 'Proximity radius must be a whole number from 1 to 100,000 meters.';
	}

	if (livePeriod === undefined && (heading !== undefined || proximityAlertRadius !== undefined)) {
		errors.livePeriod = 'Set a live period to use heading or proximity alerts.';
	}

	if (Object.keys(errors).length > 0 || latitude === null || longitude === null) {
		return { ok: false, errors };
	}

	return {
		ok: true,
		request: {
			method: 'sendLocation',
			body: {
				chat_id: input.chatId.trim(),
				latitude,
				longitude,
				...(typeof horizontalAccuracy === 'number'
					? { horizontal_accuracy: horizontalAccuracy }
					: {}),
				...(typeof livePeriod === 'number' ? { live_period: livePeriod } : {}),
				...(typeof heading === 'number' ? { heading } : {}),
				...(typeof proximityAlertRadius === 'number'
					? { proximity_alert_radius: proximityAlertRadius }
					: {}),
				...(input.replyMarkup === undefined ? {} : { reply_markup: input.replyMarkup })
			}
		}
	};
}

function parseNumber(value: string | number, min: number, max: number): number | null {
	if (typeof value === 'string' && !value.trim()) return null;
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function parseOptionalNumber(
	value: string | number | undefined,
	min: number,
	max: number
): number | undefined | null {
	if (value === undefined || (typeof value === 'string' && !value.trim())) return undefined;
	return parseNumber(value, min, max);
}

function parseOptionalInteger(
	value: string | number | undefined,
	min: number,
	max: number
): number | undefined | null {
	const parsed = parseOptionalNumber(value, min, max);
	return parsed === undefined || (typeof parsed === 'number' && Number.isInteger(parsed))
		? parsed
		: null;
}

function parseLivePeriod(value: string | number | undefined): number | undefined | null {
	if (value === undefined || (typeof value === 'string' && !value.trim())) return undefined;
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isInteger(parsed) &&
		((parsed >= TELEGRAM_LOCATION_LIVE_PERIOD_MIN &&
			parsed <= TELEGRAM_LOCATION_LIVE_PERIOD_MAX) ||
			parsed === TELEGRAM_LOCATION_LIVE_PERIOD_INDEFINITE)
		? parsed
		: null;
}
