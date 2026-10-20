import { describe, expect, it } from 'vitest';
import { restoreReplyMarkup, serializeReplyMarkup } from './reply-markup';

describe('reply markup form state', () => {
	it('round-trips normalized markup', () => {
		const markup = {
			inline_keyboard: [
				[
					{
						text: 'Copy',
						style: 'success',
						icon_custom_emoji_id: '5368324170671202286',
						copy_text: { text: 'value' }
					}
				]
			]
		} as const;

		expect(restoreReplyMarkup(serializeReplyMarkup(markup))).toEqual(markup);
	});

	it('preserves inline button appearance across row and action-shaped round trips', () => {
		const markup = {
			inline_keyboard: [
				[
					{ text: 'Run', style: 'primary', icon_custom_emoji_id: 'emoji-a', callback_data: 'run' },
					{ text: 'Open', style: 'danger', icon_custom_emoji_id: 'emoji-b', url: 'https://example.com' }
				]
			]
		} as const;

		const restored = restoreReplyMarkup(serializeReplyMarkup(markup));
		expect(restored).toEqual(markup);
		expect(restored && 'inline_keyboard' in restored && restored.inline_keyboard[0][1]).toEqual(
			markup.inline_keyboard[0][1]
		);
	});

	it('treats empty and malformed values as no markup', () => {
		expect(restoreReplyMarkup('')).toBeUndefined();
		expect(restoreReplyMarkup('{not json')).toBeUndefined();
		expect(serializeReplyMarkup(undefined)).toBe('');
	});
});
