import { describe, expect, it } from 'vitest';
import {
	TELEGRAM_VIDEO_NOTE_MAX_BYTES,
	prepareSendVideoNote,
	validateSendVideoNote
} from './video-note';

describe('validateSendVideoNote', () => {
	it('rejects missing fields, HTTP URLs, and invalid dimensions', () => {
		expect(
			validateSendVideoNote({ chatId: '', videoNote: { kind: 'reference', value: '' } }).errors
		).toMatchObject({ chatId: expect.any(String), videoNote: expect.any(String) });
		expect(
			validateSendVideoNote({
				chatId: '123',
				videoNote: { kind: 'reference', value: 'https://example.com/note.mp4' },
				duration: 61,
				length: 0
			}).errors
		).toMatchObject({
			videoNote: expect.stringContaining('does not support'),
			duration: expect.any(String),
			length: expect.any(String)
		});
	});

	it('rejects invalid uploads', () => {
		const files = [
			new File([], 'empty.mp4', { type: 'video/mp4' }),
			new File([new Uint8Array(TELEGRAM_VIDEO_NOTE_MAX_BYTES + 1)], 'large.mp4', {
				type: 'video/mp4'
			}),
			new File(['video'], 'note.webm', { type: 'video/webm' })
		];
		for (const file of files) {
			expect(
				validateSendVideoNote({ chatId: '123', videoNote: { kind: 'upload', file } }).errors.videoNote
			).toBeTruthy();
		}
	});
});

describe('prepareSendVideoNote', () => {
	it('serializes delivery options but omits parse mode', () => {
		const messageOptions = {
			parseMode: 'HTML' as const,
			replyParameters: { messageId: 11 },
			protectContent: true as const,
			disableNotification: true as const,
			messageEffectId: 'effect'
		};
		const json = prepareSendVideoNote({
			chatId: '1', videoNote: { kind: 'reference', value: 'file-id' }, messageOptions
		});
		expect(json.ok && json.request.encoding === 'json' ? json.request.body : null).toMatchObject({
			reply_parameters: { message_id: 11 }, protect_content: true,
			disable_notification: true, message_effect_id: 'effect'
		});
		if (json.ok && json.request.encoding === 'json') {
			expect(json.request.body).not.toHaveProperty('parse_mode');
		}

		const multipart = prepareSendVideoNote({
			chatId: '1',
			videoNote: { kind: 'upload', file: new File(['video'], 'note.mp4', { type: 'video/mp4' }) },
			messageOptions
		});
		expect(multipart.ok && multipart.request.encoding === 'multipart'
			? Object.fromEntries(multipart.request.body.entries()) : null).toMatchObject({
			reply_parameters: '{"message_id":11}', protect_content: 'true',
			disable_notification: 'true', message_effect_id: 'effect'
		});
		if (multipart.ok && multipart.request.encoding === 'multipart') {
			expect(multipart.request.body.has('parse_mode')).toBe(false);
		}
	});
	it('builds a JSON request for a reusable Telegram file ID', () => {
		expect(
			prepareSendVideoNote({
				chatId: ' 123 ',
				videoNote: { kind: 'reference', value: ' note-file-id ' },
				duration: 30,
				length: 360,
				replyMarkup: { force_reply: true }
			})
		).toEqual({
			ok: true,
			request: {
				method: 'sendVideoNote',
				encoding: 'json',
				body: {
					chat_id: '123',
					video_note: 'note-file-id',
					duration: 30,
					length: 360,
					reply_markup: { force_reply: true }
				}
			}
		});
	});

	it('builds multipart data for a local video note and thumbnail', () => {
		const videoNote = new File(['video'], 'note.mp4', { type: 'video/mp4' });
		const thumbnail = new File(['jpeg'], 'thumb.jpg', { type: 'image/jpeg' });
		const result = prepareSendVideoNote({
			chatId: '123',
			videoNote: { kind: 'upload', file: videoNote },
			thumbnail,
			duration: 10,
			length: 240
		});

		expect(result.ok).toBe(true);
		if (!result.ok || result.request.encoding !== 'multipart') throw new Error('Expected multipart');
		expect(result.request.body.get('video_note')).toBe(videoNote);
		expect(result.request.body.get('thumbnail')).toBe(thumbnail);
		expect(result.request.body.get('duration')).toBe('10');
		expect(result.request.body.get('length')).toBe('240');
	});
});
