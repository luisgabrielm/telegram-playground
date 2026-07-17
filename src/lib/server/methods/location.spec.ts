import { describe, expect, it } from 'vitest';
import type { TelegramReplyMarkup } from '$lib/reply-markup';
import { prepareSendLocation, TELEGRAM_LOCATION_LIVE_PERIOD_INDEFINITE } from './location';

describe('prepareSendLocation', () => {
	it('prepares a static location', () => {
		expect(prepareSendLocation({ chatId: ' 42 ', latitude: '-23.5505', longitude: '-46.6333' })).toEqual({
			ok: true,
			request: {
				method: 'sendLocation',
				body: { chat_id: '42', latitude: -23.5505, longitude: -46.6333 }
			}
		});
	});

	it('includes all live location options and reply markup', () => {
		const replyMarkup: TelegramReplyMarkup = { remove_keyboard: true };
		expect(
			prepareSendLocation({
				chatId: '@map', latitude: 10, longitude: 20, horizontalAccuracy: '12.5',
				livePeriod: '3600', heading: '270', proximityAlertRadius: '500', replyMarkup
			})
		).toEqual({
			ok: true,
			request: {
				method: 'sendLocation',
				body: {
					chat_id: '@map', latitude: 10, longitude: 20, horizontal_accuracy: 12.5,
					live_period: 3600, heading: 270, proximity_alert_radius: 500,
					reply_markup: replyMarkup
				}
			}
		});
	});

	it('accepts an indefinite live period', () => {
		const result = prepareSendLocation({
			chatId: '42', latitude: 0, longitude: 0, livePeriod: TELEGRAM_LOCATION_LIVE_PERIOD_INDEFINITE
		});
		expect(result.ok && result.request.body.live_period).toBe(TELEGRAM_LOCATION_LIVE_PERIOD_INDEFINITE);
	});

	it('validates coordinates and Telegram option ranges', () => {
		const result = prepareSendLocation({
			chatId: '', latitude: -91, longitude: 181, horizontalAccuracy: 1501,
			livePeriod: 59, heading: 0, proximityAlertRadius: 100001
		});
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(Object.keys(result.errors).sort()).toEqual([
			'chatId', 'heading', 'horizontalAccuracy', 'latitude', 'livePeriod', 'longitude',
			'proximityAlertRadius'
		].sort());
	});

	it('requires a live period for heading and proximity alerts', () => {
		const result = prepareSendLocation({
			chatId: '42', latitude: 0, longitude: 0, heading: 90, proximityAlertRadius: 100
		});
		expect(result).toEqual({
			ok: false,
			errors: { livePeriod: 'Set a live period to use heading or proximity alerts.' }
		});
	});
});
