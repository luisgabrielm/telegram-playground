import { describe, expect, it } from 'vitest';
import { serializeMessageOptions } from '$lib/message-options';
import {
	appendMessageOptionsToFormData,
	appendMessageOptionsToJson,
	parseMessageOptions
} from './message-options';

function form(fields: Record<string, string> = {}) {
	const data = new FormData();
	for (const [name, value] of Object.entries(fields)) data.set(name, value);
	return data;
}

describe('parseMessageOptions', () => {
	it('omits every default', () => {
		const result = parseMessageOptions(form());
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error('Expected valid options');
		expect(result.value).toEqual({});
	});

	it.each(['HTML', 'MarkdownV2'])('accepts the %s parse mode', (parseMode) => {
		const result = parseMessageOptions(form({ parseMode }));
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error('Expected valid options');
		expect(result.value.parseMode).toBe(parseMode);
	});

	it('rejects unsupported parse modes', () => {
		const result = parseMessageOptions(form({ parseMode: 'Markdown' }));
		expect(result).toMatchObject({ ok: false, errors: { parseMode: expect.any(String) } });
	});

	it('normalizes a complete same-chat reply', () => {
		const result = parseMessageOptions(
			form({
				replyEnabled: 'true',
				replyMessageId: ' 42 ',
				allowSendingWithoutReply: 'true',
				quote: '<b>exact quote</b>',
				quoteParseMode: 'HTML',
				quotePosition: '3'
			})
		);

		expect(result).toMatchObject({
			ok: true,
			value: {
				replyParameters: {
					messageId: 42,
					allowSendingWithoutReply: true,
					quote: '<b>exact quote</b>',
					quoteParseMode: 'HTML',
					quotePosition: 3
				}
			}
		});
	});

	it.each(['', '0', '-1', '1.5', 'not-a-number'])('rejects reply message ID %j', (replyMessageId) => {
		const result = parseMessageOptions(form({ replyEnabled: 'true', replyMessageId }));
		expect(result).toMatchObject({ ok: false, errors: { replyMessageId: expect.any(String) } });
	});

	it.each(['-1', '1.5', 'not-a-number'])('rejects quote position %j', (quotePosition) => {
		const result = parseMessageOptions(
			form({ replyEnabled: 'true', replyMessageId: '1', quote: 'quote', quotePosition })
		);
		expect(result).toMatchObject({ ok: false, errors: { quotePosition: expect.any(String) } });
	});

	it('requires quote text for quote formatting and position', () => {
		const result = parseMessageOptions(
			form({
				replyEnabled: 'true',
				replyMessageId: '1',
				quoteParseMode: 'MarkdownV2',
				quotePosition: '0'
			})
		);
		expect(result).toMatchObject({
			ok: false,
			errors: { quoteParseMode: expect.any(String), quotePosition: expect.any(String) }
		});
	});

	it('trims the effect ID and emits true-only booleans', () => {
		const result = parseMessageOptions(
			form({
				protectContent: 'true',
				disableNotification: 'true',
				messageEffectId: '  effect-id  '
			})
		);
		expect(result).toMatchObject({
			ok: true,
			value: { protectContent: true, disableNotification: true, messageEffectId: 'effect-id' }
		});
	});

	it('preserves all raw fields for validation feedback', () => {
		const result = parseMessageOptions(form({ replyEnabled: 'true', replyMessageId: '-9' }));
		expect(result.fields.replyEnabled).toBe('true');
		expect(result.fields.replyMessageId).toBe('-9');
	});
});

describe('message option serializers', () => {
	const options = {
		parseMode: 'MarkdownV2' as const,
		replyParameters: {
			messageId: 7,
			allowSendingWithoutReply: true as const,
			quote: '*hello*',
			quoteParseMode: 'MarkdownV2' as const,
			quotePosition: 0
		},
		protectContent: true as const,
		disableNotification: true as const,
		messageEffectId: 'effect'
	};
	const expected = {
		parse_mode: 'MarkdownV2',
		reply_parameters: {
			message_id: 7,
			allow_sending_without_reply: true,
			quote: '*hello*',
			quote_parse_mode: 'MarkdownV2',
			quote_position: 0
		},
		protect_content: true,
		disable_notification: true,
		message_effect_id: 'effect'
	};

	it('produces the exact normalized Telegram wire shape', () => {
		expect(serializeMessageOptions(options)).toEqual(expected);
		expect(appendMessageOptionsToJson({ chat_id: '1' }, options)).toEqual({
			chat_id: '1',
			...expected
		});
	});

	it('embeds reply parameters as JSON and booleans as true strings in multipart', () => {
		const data = appendMessageOptionsToFormData(new FormData(), options);
		expect(data.get('parse_mode')).toBe('MarkdownV2');
		expect(JSON.parse(String(data.get('reply_parameters')))).toEqual(expected.reply_parameters);
		expect(data.get('protect_content')).toBe('true');
		expect(data.get('disable_notification')).toBe('true');
		expect(data.get('message_effect_id')).toBe('effect');
	});

	it('can omit parse mode for methods without formatted content', () => {
		expect(serializeMessageOptions(options, false)).not.toHaveProperty('parse_mode');
		const data = appendMessageOptionsToFormData(new FormData(), options, false);
		expect(data.has('parse_mode')).toBe(false);
	});
});
