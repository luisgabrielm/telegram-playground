import { describe, expect, it } from 'vitest';
import { parseReplyMarkup } from './reply-markup';

function parse(value: unknown) {
	return parseReplyMarkup(JSON.stringify(value));
}

describe('parseReplyMarkup', () => {
	it('accepts an empty field as no reply markup', () => {
		expect(parseReplyMarkup('')).toEqual({ ok: true });
		expect(parseReplyMarkup('   ')).toEqual({ ok: true });
	});

	it('accepts inline keyboards with multiple rows and supported actions', () => {
		const markup = {
			inline_keyboard: [
				[
					{ text: 'Open', url: 'https://example.com/path' },
					{ text: 'Copy', copy_text: { text: 'ABC-123' } }
				],
				[{ text: 'Run', callback_data: 'action:run' }, { text: 'Telegram', url: 'tg://resolve?domain=test' }]
			]
		};

		expect(parse(markup)).toEqual({ ok: true, value: markup });
	});

	it('accepts a configured plain-text reply keyboard', () => {
		const markup = {
			keyboard: [[{ text: 'Yes' }, { text: 'No' }], [{ text: 'Later' }]],
			is_persistent: true,
			resize_keyboard: false,
			one_time_keyboard: true,
			input_field_placeholder: 'Choose an answer'
		};

		expect(parse(markup)).toEqual({ ok: true, value: markup });
	});

	it('accepts keyboard removal and forced replies', () => {
		expect(parse({ remove_keyboard: true })).toEqual({
			ok: true,
			value: { remove_keyboard: true }
		});
		expect(parse({ force_reply: true, input_field_placeholder: 'Your answer' })).toEqual({
			ok: true,
			value: { force_reply: true, input_field_placeholder: 'Your answer' }
		});
	});

	it('rejects malformed JSON and non-object values', () => {
		expect(parseReplyMarkup('{')).toMatchObject({ ok: false });
		expect(parse(null)).toMatchObject({ ok: false });
		expect(parse([])).toMatchObject({ ok: false });
	});

	it('requires exactly one supported mode', () => {
		expect(parse({})).toMatchObject({ ok: false });
		expect(parse({ inline_keyboard: [[{ text: 'A', callback_data: 'a' }]], force_reply: true })).toMatchObject({
			ok: false
		});
		expect(parse({ selective: true })).toMatchObject({ ok: false });
	});

	it('rejects unknown top-level and nested properties, including selective', () => {
		expect(parse({ remove_keyboard: true, selective: false })).toMatchObject({ ok: false });
		expect(parse({ force_reply: true, extra: true })).toMatchObject({ ok: false });
		expect(
			parse({ inline_keyboard: [[{ text: 'Copy', copy_text: { text: 'value', extra: true } }]] })
		).toMatchObject({ ok: false });
		expect(parse({ keyboard: [[{ text: 'Yes', request_contact: true }]] })).toMatchObject({ ok: false });
	});

	it('rejects empty keyboards, rows, and button labels', () => {
		expect(parse({ inline_keyboard: [] })).toMatchObject({ ok: false });
		expect(parse({ inline_keyboard: [[]] })).toMatchObject({ ok: false });
		expect(parse({ inline_keyboard: [[{ text: '  ', callback_data: 'a' }]] })).toMatchObject({
			ok: false
		});
		expect(parse({ keyboard: [[]] })).toMatchObject({ ok: false });
		expect(parse({ keyboard: [[{ text: '' }]] })).toMatchObject({ ok: false });
	});

	it('requires exactly one inline button action', () => {
		expect(parse({ inline_keyboard: [[{ text: 'Nothing' }]] })).toMatchObject({ ok: false });
		expect(
			parse({ inline_keyboard: [[{ text: 'Both', url: 'https://example.com', callback_data: 'both' }]] })
		).toMatchObject({ ok: false });
	});

	it('accepts only HTTP, HTTPS, and tg URLs', () => {
		expect(parse({ inline_keyboard: [[{ text: 'HTTP', url: 'http://example.com' }]] })).toMatchObject({
			ok: true
		});
		expect(parse({ inline_keyboard: [[{ text: 'FTP', url: 'ftp://example.com' }]] })).toMatchObject({
			ok: false
		});
		expect(parse({ inline_keyboard: [[{ text: 'Bad', url: 'not a url' }]] })).toMatchObject({
			ok: false
		});
	});

	it('validates copy text using Unicode character length', () => {
		expect(parse({ inline_keyboard: [[{ text: 'Copy', copy_text: { text: '' } }]] })).toMatchObject({
			ok: false
		});
		expect(
			parse({ inline_keyboard: [[{ text: 'Copy', copy_text: { text: '😀'.repeat(256) } }]] })
		).toMatchObject({ ok: true });
		expect(
			parse({ inline_keyboard: [[{ text: 'Copy', copy_text: { text: 'a'.repeat(257) } }]] })
		).toMatchObject({ ok: false });
	});

	it('validates callback data using UTF-8 byte length', () => {
		expect(parse({ inline_keyboard: [[{ text: 'Run', callback_data: '' }]] })).toMatchObject({
			ok: false
		});
		expect(parse({ inline_keyboard: [[{ text: 'Run', callback_data: '😀'.repeat(16) }]] })).toMatchObject({
			ok: true
		});
		expect(parse({ inline_keyboard: [[{ text: 'Run', callback_data: `a${'😀'.repeat(16)}` }]] })).toMatchObject({
			ok: false
		});
	});

	it('validates option types and placeholders', () => {
		expect(parse({ keyboard: [[{ text: 'Yes' }]], resize_keyboard: 'true' })).toMatchObject({
			ok: false
		});
		expect(parse({ force_reply: false })).toMatchObject({ ok: false });
		expect(parse({ remove_keyboard: false })).toMatchObject({ ok: false });
		expect(parse({ force_reply: true, input_field_placeholder: '' })).toMatchObject({ ok: false });
		expect(
			parse({ keyboard: [[{ text: 'Yes' }]], input_field_placeholder: '😀'.repeat(64) })
		).toMatchObject({ ok: true });
		expect(
			parse({ keyboard: [[{ text: 'Yes' }]], input_field_placeholder: 'a'.repeat(65) })
		).toMatchObject({ ok: false });
	});

	it('returns the failing field path for editor integration', () => {
		const result = parse({ inline_keyboard: [[{ text: 'Open', url: 'javascript:alert(1)' }]] });

		expect(result).toEqual({
			ok: false,
			errors: {
				replyMarkup: 'Use an HTTP, HTTPS, or tg:// URL.',
				'reply_markup.inline_keyboard[0][0].url': 'Use an HTTP, HTTPS, or tg:// URL.'
			}
		});
	});
});
