import { describe, expect, it } from 'vitest';
import { restoreReplyMarkup, serializeReplyMarkup } from './reply-markup';

describe('reply markup form state', () => {
	it('round-trips normalized markup', () => {
		const markup = {
			inline_keyboard: [[{ text: 'Copy', copy_text: { text: 'value' } }]]
		} as const;

		expect(restoreReplyMarkup(serializeReplyMarkup(markup))).toEqual(markup);
	});

	it('treats empty and malformed values as no markup', () => {
		expect(restoreReplyMarkup('')).toBeUndefined();
		expect(restoreReplyMarkup('{not json')).toBeUndefined();
		expect(serializeReplyMarkup(undefined)).toBe('');
	});
});
