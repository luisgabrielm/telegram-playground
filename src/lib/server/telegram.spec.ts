import { describe, expect, it, vi } from 'vitest';
import { TELEGRAM_MESSAGE_MAX_LENGTH, validateMessage } from './message-validation';
import { prepareSendPhotoRequest } from './methods/photo';
import { TelegramClient, TelegramClientError, getPublicTelegramError } from './telegram';

const TOKEN = '123456789:test-token';

describe('TelegramClient', () => {
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

		const response = await client.sendMessage('-100123', 'Hello from the playground');

		expect(response.result.message_id).toBe(7);
		expect(fetcher).toHaveBeenCalledWith(
			`https://api.telegram.org/bot${TOKEN}/sendMessage`,
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ chat_id: '-100123', text: 'Hello from the playground' })
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
