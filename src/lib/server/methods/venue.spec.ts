import { describe, expect, it } from 'vitest';
import type { TelegramReplyMarkup } from '$lib/reply-markup';
import { prepareSendVenue } from './venue';

describe('prepareSendVenue', () => {
	it('prepares required venue fields', () => {
		expect(prepareSendVenue({
			chatId: ' 42 ', latitude: '-23.5614', longitude: '-46.6559',
			title: ' MASP ', address: ' Av. Paulista, 1578 '
		})).toEqual({
			ok: true,
			request: {
				method: 'sendVenue',
				body: {
					chat_id: '42', latitude: -23.5614, longitude: -46.6559,
					title: 'MASP', address: 'Av. Paulista, 1578'
				}
			}
		});
	});

	it('includes provider metadata and reply markup', () => {
		const replyMarkup: TelegramReplyMarkup = { force_reply: true };
		const result = prepareSendVenue({
			chatId: '@places', latitude: 1, longitude: 2, title: 'Cafe', address: 'Main St',
			foursquareId: 'fs-id', foursquareType: 'food/coffee', googlePlaceId: 'gp-id',
			googlePlaceType: 'cafe', replyMarkup
		});
		expect(result.ok && result.request.body).toEqual({
			chat_id: '@places', latitude: 1, longitude: 2, title: 'Cafe', address: 'Main St',
			foursquare_id: 'fs-id', foursquare_type: 'food/coffee', google_place_id: 'gp-id',
			google_place_type: 'cafe', reply_markup: replyMarkup
		});
	});

	it('validates required fields and coordinate ranges', () => {
		const result = prepareSendVenue({ chatId: '', latitude: 'north', longitude: 200, title: '', address: ' ' });
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.errors).toEqual({
			chatId: 'Enter a chat ID or channel username.',
			latitude: 'Latitude must be a number from -90 to 90.',
			longitude: 'Longitude must be a number from -180 to 180.',
			title: 'Enter a venue name.',
			address: 'Enter a venue address.'
		});
	});
});
