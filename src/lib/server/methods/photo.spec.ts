import { describe, expect, it } from 'vitest';
import {
	SendPhotoValidationError,
	TELEGRAM_PHOTO_CAPTION_MAX_LENGTH,
	TELEGRAM_PHOTO_MAX_BYTES,
	prepareSendPhotoRequest,
	validateSendPhoto,
	type SendPhotoInput
} from './photo';

describe('validateSendPhoto', () => {
	it.each([
		[
			{
				chatId: ' ',
				photo: { kind: 'reference', value: 'telegram-file-id' }
			},
			'chatId'
		],
		[
			{
				chatId: '123',
				photo: { kind: 'reference', value: ' ' }
			},
			'photo'
		],
		[
			{
				chatId: '123',
				photo: { kind: 'reference', value: 'telegram-file-id' },
				caption: 'x'.repeat(TELEGRAM_PHOTO_CAPTION_MAX_LENGTH + 1)
			},
			'caption'
		]
	] satisfies [SendPhotoInput, 'chatId' | 'photo' | 'caption'][])('rejects invalid %s input', (input, field) => {
		const result = validateSendPhoto(input);

		expect(result.valid).toBe(false);
		expect(result.errors[field]).toBeTruthy();
	});

	it('rejects empty, oversized, and non-image uploads', () => {
		const files = [
			new Blob([], { type: 'image/jpeg' }),
			new Blob([new Uint8Array(TELEGRAM_PHOTO_MAX_BYTES + 1)], { type: 'image/jpeg' }),
			new Blob(['not an image'], { type: 'text/plain' })
		];

		for (const file of files) {
			const result = validateSendPhoto({
				chatId: '123',
				photo: { kind: 'upload', file }
			});

			expect(result.errors.photo).toBeTruthy();
		}
	});

	it('accepts a valid file reference, HTTP URL, or image upload', () => {
		const inputs: SendPhotoInput[] = [
			{ chatId: '123', photo: { kind: 'reference', value: 'telegram-file-id' } },
			{ chatId: '123', photo: { kind: 'reference', value: 'https://example.com/photo.jpg' } },
			{
				chatId: '123',
				photo: { kind: 'upload', file: new Blob(['image'], { type: 'image/jpeg' }) }
			}
		];

		for (const input of inputs) {
			expect(validateSendPhoto(input)).toEqual({ valid: true, errors: {} });
		}
	});
});

describe('prepareSendPhotoRequest', () => {
	it('builds a JSON request for a Telegram file ID or HTTP URL', () => {
		const request = prepareSendPhotoRequest({
			chatId: '  -100123  ',
			photo: { kind: 'reference', value: '  telegram-file-id  ' },
			caption: 'A sample caption',
			hasSpoiler: true
		});

		expect(request).toEqual({
			method: 'sendPhoto',
			encoding: 'json',
			body: {
				chat_id: '-100123',
				photo: 'telegram-file-id',
				caption: 'A sample caption',
				has_spoiler: true
			}
		});
	});

	it('builds multipart form data for a local upload', () => {
		const file = new Blob(['image bytes'], { type: 'image/png' });
		const request = prepareSendPhotoRequest({
			chatId: '@playground_channel',
			photo: { kind: 'upload', file, filename: 'sample.png' },
			caption: 'Uploaded photo',
			hasSpoiler: true
		});

		expect(request.encoding).toBe('multipart');
		if (request.encoding !== 'multipart') throw new Error('Expected a multipart request');

		expect(request.body.get('chat_id')).toBe('@playground_channel');
		expect(request.body.get('caption')).toBe('Uploaded photo');
		expect(request.body.get('has_spoiler')).toBe('true');
		const uploaded = request.body.get('photo');
		expect(uploaded).toBeInstanceOf(File);
		expect((uploaded as File).name).toBe('sample.png');
		expect((uploaded as File).type).toBe('image/png');
	});

	it('omits a blank optional caption', () => {
		const request = prepareSendPhotoRequest({
			chatId: '123',
			photo: { kind: 'reference', value: 'telegram-file-id' },
			caption: '   '
		});

		expect(request.encoding).toBe('json');
		if (request.encoding !== 'json') throw new Error('Expected a JSON request');
		expect(request.body).not.toHaveProperty('caption');
	});

	it('throws a safe validation error without echoing sensitive input', () => {
		const secretLikeValue = '123456:secret-token-like-value';

		expect(() =>
			prepareSendPhotoRequest({
				chatId: '',
				photo: { kind: 'reference', value: secretLikeValue }
			})
		).toThrowError(SendPhotoValidationError);

		try {
			prepareSendPhotoRequest({
				chatId: '',
				photo: { kind: 'reference', value: secretLikeValue }
			});
		} catch (error) {
			expect(String(error)).not.toContain(secretLikeValue);
		}
	});
});
