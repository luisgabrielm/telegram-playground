import { describe, expect, it, vi } from 'vitest';
import type { TelegramReplyMarkup } from '$lib/reply-markup';
import { TELEGRAM_MESSAGE_MAX_LENGTH, validateMessage } from './message-validation';
import { prepareSendPhotoRequest } from './methods/photo';
import { prepareSendDice } from './methods/dice';
import { prepareSendMediaGroup } from './methods/media-group';
import { prepareSendPoll } from './methods/poll';
import { prepareSendRichMessage } from './methods/rich-message';
import { prepareSendMessage } from './methods/message';
import { prepareSetMessageReaction } from './methods/reaction';
import { TelegramClient, TelegramClientError, getPublicTelegramError } from './telegram';

const TOKEN = '123456789:test-token';

describe('TelegramClient', () => {
	it('answers callback queries with the exact Telegram payload', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ ok: true, result: true }));
		const client = new TelegramClient(TOKEN, fetcher);

		await client.answerCallbackQuery({ callback_query_id: 'query-1', text: 'Done' });

		expect(fetcher).toHaveBeenCalledWith(
			`https://api.telegram.org/bot${TOKEN}/answerCallbackQuery`,
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ callback_query_id: 'query-1', text: 'Done' })
			})
		);
	});

	it('edits an inline keyboard with the exact Telegram payload', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ ok: true, result: true }));
		const client = new TelegramClient(TOKEN, fetcher);
		const request = {
			chat_id: '123',
			message_id: 42,
			reply_markup: { inline_keyboard: [[{ text: 'Done', callback_data: 'done' }]] }
		};

		await client.editMessageReplyMarkup(request);

		expect(fetcher).toHaveBeenCalledWith(
			`https://api.telegram.org/bot${TOKEN}/editMessageReplyMarkup`,
			expect.objectContaining({ method: 'POST', body: JSON.stringify(request) })
		);
	});

	it('calls getMe and returns the bot identity', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
			jsonResponse({
				ok: true,
				result: { id: 42, is_bot: true, first_name: 'Playground', username: 'playground_bot' }
			})
		);
		const client = new TelegramClient(TOKEN, fetcher);

		const response = await client.getMe();

		expect(response.result.username).toBe('playground_bot');
		expect(fetcher).toHaveBeenCalledWith(
			`https://api.telegram.org/bot${TOKEN}/getMe`,
			expect.objectContaining({ method: 'POST' })
		);
	});

	it('sends the expected plain-text message payload', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
			jsonResponse({
				ok: true,
				result: {
					message_id: 7,
					date: 1_700_000_000,
					chat: { id: -100123, type: 'supergroup', title: 'Test chat' },
					text: 'Hello from the playground'
				}
			})
		);
		const client = new TelegramClient(TOKEN, fetcher);

		const prepared = prepareSendMessage({ chatId: '-100123', text: 'Hello from the playground' });
		if (!prepared.ok) throw new Error('Expected a prepared message request.');
		const response = await client.sendMessage(prepared.request);

		expect(response.result.message_id).toBe(7);
		expect(fetcher).toHaveBeenCalledWith(
			`https://api.telegram.org/bot${TOKEN}/sendMessage`,
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ chat_id: '-100123', text: 'Hello from the playground' })
			})
		);
	});

	it('includes reply markup in a text message payload', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
			jsonResponse({
				ok: true,
				result: { message_id: 8, date: 1, chat: { id: 123, type: 'private' }, text: 'Choose' }
			})
		);
		const client = new TelegramClient(TOKEN, fetcher);
		const replyMarkup: TelegramReplyMarkup = {
			inline_keyboard: [[{ text: 'Open', url: 'https://example.com' }]]
		};

		const prepared = prepareSendMessage({ chatId: '123', text: 'Choose', replyMarkup });
		if (!prepared.ok) throw new Error('Expected a prepared message request.');
		await client.sendMessage(prepared.request);

		expect(fetcher).toHaveBeenCalledWith(
			`https://api.telegram.org/bot${TOKEN}/sendMessage`,
			expect.objectContaining({
				body: JSON.stringify({ chat_id: '123', text: 'Choose', reply_markup: replyMarkup })
			})
		);
	});

	it('sends the exact prepared reaction body', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ ok: true, result: true }));
		const client = new TelegramClient(TOKEN, fetcher);
		const prepared = prepareSetMessageReaction({
			chatId: '123', messageId: '42', reactionKind: 'emoji', emoji: '👍', isBig: true
		});
		if (!prepared.ok) throw new Error('Expected a prepared reaction request.');

		await client.setMessageReaction(prepared.request);

		expect(fetcher).toHaveBeenCalledWith(
			`https://api.telegram.org/bot${TOKEN}/setMessageReaction`,
			expect.objectContaining({
				body: JSON.stringify({
					chat_id: '123', message_id: 42,
					reaction: [{ type: 'emoji', emoji: '👍' }], is_big: true
				})
			})
		);
	});

	it('sends prepared media as JSON without changing the payload', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
			jsonResponse({
				ok: true,
				result: { message_id: 8, date: 1, chat: { id: 123, type: 'private' }, photo: [] }
			})
		);
		const client = new TelegramClient(TOKEN, fetcher);
		const request = prepareSendPhotoRequest({
			chatId: '123',
			photo: { kind: 'reference', value: 'file-id' },
			hasSpoiler: true
		});

		await client.sendPhoto(request);

		expect(fetcher).toHaveBeenCalledWith(
			`https://api.telegram.org/bot${TOKEN}/sendPhoto`,
			expect.objectContaining({
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ chat_id: '123', photo: 'file-id', has_spoiler: true })
			})
		);
	});

	it('lets the runtime set the multipart boundary for uploads', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
			jsonResponse({
				ok: true,
				result: { message_id: 9, date: 1, chat: { id: 123, type: 'private' }, photo: [] }
			})
		);
		const client = new TelegramClient(TOKEN, fetcher);
		const request = prepareSendPhotoRequest({
			chatId: '123',
			photo: { kind: 'upload', file: new Blob(['image'], { type: 'image/jpeg' }) }
		});

		await client.sendPhoto(request);

		const options = fetcher.mock.calls[0]?.[1];
		expect(options?.body).toBeInstanceOf(FormData);
		expect(options?.headers).toBeUndefined();
	});

	it('sends prepared dice payloads', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
			jsonResponse({
				ok: true,
				result: { message_id: 10, date: 1, chat: { id: 123, type: 'private' } }
			})
		);
		const client = new TelegramClient(TOKEN, fetcher);
		const prepared = prepareSendDice({ chatId: '123', emoji: '🎯' });
		if (!prepared.ok) throw new Error('Expected a prepared request');

		await client.sendDice(prepared.request);

		expect(fetcher).toHaveBeenCalledWith(
			`https://api.telegram.org/bot${TOKEN}/sendDice`,
			expect.objectContaining({ body: JSON.stringify({ chat_id: '123', emoji: '🎯' }) })
		);
	});

	it('sends prepared quiz poll payloads', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
			jsonResponse({
				ok: true,
				result: { message_id: 12, date: 1, chat: { id: 123, type: 'private' } }
			})
		);
		const client = new TelegramClient(TOKEN, fetcher);
		const prepared = prepareSendPoll({
			chatId: '123',
			question: 'Pick one',
			options: ['A', 'B'],
			type: 'quiz',
			isAnonymous: true,
			allowsMultipleAnswers: false,
			correctOptionIds: [1]
		});
		if (!prepared.ok) throw new Error('Expected a prepared request');

		await client.sendPoll(prepared.request);

		expect(fetcher).toHaveBeenCalledWith(
			`https://api.telegram.org/bot${TOKEN}/sendPoll`,
			expect.objectContaining({
				body: JSON.stringify({
					chat_id: '123',
					question: 'Pick one',
					options: [{ text: 'A' }, { text: 'B' }],
					type: 'quiz',
					is_anonymous: true,
					correct_option_ids: [1]
				})
			})
		);
	});

	it('sends prepared media groups as multipart when an item is uploaded', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
			jsonResponse({
				ok: true,
				result: [{ message_id: 11, date: 1, chat: { id: 123, type: 'private' } }]
			})
		);
		const client = new TelegramClient(TOKEN, fetcher);
		const prepared = prepareSendMediaGroup({
			chatId: '123',
			items: [
				{ type: 'photo', source: { kind: 'reference', value: 'photo-id' } },
				{
					type: 'video',
					source: { kind: 'upload', file: new Blob(['video'], { type: 'video/mp4' }) }
				}
			]
		});
		if (!prepared.ok) throw new Error('Expected a prepared request');

		await client.sendMediaGroup(prepared.request);

		const options = fetcher.mock.calls[0]?.[1];
		expect(fetcher.mock.calls[0]?.[0]).toBe(
			`https://api.telegram.org/bot${TOKEN}/sendMediaGroup`
		);
		expect(options?.body).toBeInstanceOf(FormData);
		expect(options?.headers).toBeUndefined();
	});

	it('sends prepared rich-message block payloads', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
			jsonResponse({
				ok: true,
				result: { message_id: 13, date: 1, chat: { id: 123, type: 'private' } }
			})
		);
		const client = new TelegramClient(TOKEN, fetcher);
		const prepared = prepareSendRichMessage({
			chatId: '123',
			blocks: [{ type: 'paragraph', text: 'Structured hello' }]
		});
		if (!prepared.ok) throw new Error('Expected a prepared request');

		await client.sendRichMessage(prepared.request);

		expect(fetcher).toHaveBeenCalledWith(
			`https://api.telegram.org/bot${TOKEN}/sendRichMessage`,
			expect.objectContaining({
				body: JSON.stringify({
					chat_id: '123',
					rich_message: { blocks: [{ type: 'paragraph', text: 'Structured hello' }] }
				})
			})
		);
	});

	it('routes the added media and place methods to their matching Telegram endpoints', async () => {
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async () =>
			jsonResponse({
				ok: true,
				result: { message_id: 14, date: 1, chat: { id: 123, type: 'private' } }
			})
		);
		const client = new TelegramClient(TOKEN, fetcher);
		const calls = [
			{
				method: 'sendAudio',
				send: () =>
					client.sendAudio({
						method: 'sendAudio',
						encoding: 'json',
						body: { chat_id: '123', audio: 'audio-id' }
					})
			},
			{
				method: 'sendVideo',
				send: () =>
					client.sendVideo({
						method: 'sendVideo',
						encoding: 'json',
						body: { chat_id: '123', video: 'video-id' }
					})
			},
			{
				method: 'sendVideoNote',
				send: () =>
					client.sendVideoNote({
						method: 'sendVideoNote',
						encoding: 'json',
						body: { chat_id: '123', video_note: 'video-note-id' }
					})
			},
			{
				method: 'sendAnimation',
				send: () =>
					client.sendAnimation({
						method: 'sendAnimation',
						encoding: 'json',
						body: { chat_id: '123', animation: 'animation-id' }
					})
			},
			{
				method: 'sendContact',
				send: () =>
					client.sendContact({
						method: 'sendContact',
						body: { chat_id: '123', phone_number: '+1555', first_name: 'Ada' }
					})
			},
			{
				method: 'sendLocation',
				send: () =>
					client.sendLocation({
						method: 'sendLocation',
						body: { chat_id: '123', latitude: 1, longitude: 2 }
					})
			},
			{
				method: 'sendVenue',
				send: () =>
					client.sendVenue({
						method: 'sendVenue',
						body: {
							chat_id: '123',
							latitude: 1,
							longitude: 2,
							title: 'Hall',
							address: '1 Main St'
						}
					})
			}
		];

		for (const call of calls) await call.send();

		expect(fetcher.mock.calls.map(([url]) => String(url).split('/').at(-1))).toEqual(
			calls.map(({ method }) => method)
		);
	});

	it('surfaces Telegram API failures without leaking the token', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
			jsonResponse(
				{
					ok: false,
					error_code: 400,
					description: `Bad Request for ${TOKEN}`
				},
				400
			)
		);
		const client = new TelegramClient(TOKEN, fetcher);

		const error = await client.getMe().catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(TelegramClientError);
		expect(getPublicTelegramError(error).message).toContain('[redacted]');
		expect(getPublicTelegramError(error).message).not.toContain(TOKEN);
	});

	it('uses a safe error when the network request fails', async () => {
		const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error(`Failed ${TOKEN}`));
		const client = new TelegramClient(TOKEN, fetcher);

		const error = await client.getMe().catch((caught: unknown) => caught);

		expect(getPublicTelegramError(error).message).toBe(
			'Telegram could not be reached. Check your connection and try again.'
		);
		expect(getPublicTelegramError(error).message).not.toContain(TOKEN);
	});

	it('requires a configured token', () => {
		expect(() => new TelegramClient('')).toThrow(
			'Telegram is not configured. Add TELEGRAM_BOT_TOKEN to your .env file.'
		);
	});
});

describe('validateMessage', () => {
	it.each([
		[{ chatId: '', text: 'Hello' }, 'chatId'],
		[{ chatId: '123', text: '   ' }, 'text'],
		[{ chatId: '123', text: 'x'.repeat(TELEGRAM_MESSAGE_MAX_LENGTH + 1) }, 'text']
	] as const)('rejects invalid message fields', (fields, expectedField) => {
		const result = validateMessage(fields);

		expect(result.valid).toBe(false);
		expect(result.errors[expectedField]).toBeTruthy();
	});

	it('accepts a valid message', () => {
		const result = validateMessage({ chatId: '@playground_channel', text: 'Hello' });

		expect(result).toEqual({ valid: true, errors: {} });
	});
});

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}
