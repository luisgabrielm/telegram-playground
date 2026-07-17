import type { TelegramReplyMarkup } from '$lib/reply-markup';

export interface SendVenueInput {
	chatId: string;
	latitude: string | number;
	longitude: string | number;
	title: string;
	address: string;
	foursquareId?: string;
	foursquareType?: string;
	googlePlaceId?: string;
	googlePlaceType?: string;
	replyMarkup?: TelegramReplyMarkup;
}

export interface SendVenueBody {
	chat_id: string;
	latitude: number;
	longitude: number;
	title: string;
	address: string;
	foursquare_id?: string;
	foursquare_type?: string;
	google_place_id?: string;
	google_place_type?: string;
	reply_markup?: TelegramReplyMarkup;
}

export type PreparedSendVenue =
	| { ok: true; request: { method: 'sendVenue'; body: SendVenueBody } }
	| { ok: false; errors: Record<string, string> };

export function prepareSendVenue(input: SendVenueInput): PreparedSendVenue {
	const errors: Record<string, string> = {};
	if (!input.chatId.trim()) errors.chatId = 'Enter a chat ID or channel username.';

	const latitude = parseCoordinate(input.latitude, -90, 90);
	const longitude = parseCoordinate(input.longitude, -180, 180);
	if (latitude === null) errors.latitude = 'Latitude must be a number from -90 to 90.';
	if (longitude === null) errors.longitude = 'Longitude must be a number from -180 to 180.';
	if (!input.title.trim()) errors.title = 'Enter a venue name.';
	if (!input.address.trim()) errors.address = 'Enter a venue address.';

	if (Object.keys(errors).length > 0 || latitude === null || longitude === null) {
		return { ok: false, errors };
	}

	return {
		ok: true,
		request: {
			method: 'sendVenue',
			body: {
				chat_id: input.chatId.trim(),
				latitude,
				longitude,
				title: input.title.trim(),
				address: input.address.trim(),
				...(input.foursquareId?.trim() ? { foursquare_id: input.foursquareId.trim() } : {}),
				...(input.foursquareType?.trim()
					? { foursquare_type: input.foursquareType.trim() }
					: {}),
				...(input.googlePlaceId?.trim()
					? { google_place_id: input.googlePlaceId.trim() }
					: {}),
				...(input.googlePlaceType?.trim()
					? { google_place_type: input.googlePlaceType.trim() }
					: {}),
				...(input.replyMarkup === undefined ? {} : { reply_markup: input.replyMarkup })
			}
		}
	};
}

function parseCoordinate(value: string | number, min: number, max: number): number | null {
	if (typeof value === 'string' && !value.trim()) return null;
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}
