import { describe, expect, it } from 'vitest';
import type { TelegramReplyMarkup } from '$lib/reply-markup';
import {
	TELEGRAM_VIDEO_CAPTION_MAX_LENGTH,
	TELEGRAM_VIDEO_MAX_BYTES,
	prepareSendVideo,
	validateSendVideo
} from './video';

describe('validateSendVideo', () => {
	it('rejects missing required fields and invalid optional values', () => {
		const result = validateSendVideo({
			chatId: ' ',
			video: { kind: 'reference', value: ' ' },
			caption: 'x'.repeat(TELEGRAM_VIDEO_CAPTION_MAX_LENGTH + 1),
			duration: -1,
			width: 1.5,
			height: -2
		});

		expect(result.errors).toMatchObject({
			chatId: expect.any(String),
			video: expect.any(String),
			caption: expect.any(String),
			duration: expect.any(String),
			width: expect.any(String),
			height: expect.any(String)
		});
	});

	it('rejects empty, oversized, and non-MPEG-4 uploads', () => {
		const files = [
			new File([], 'empty.mp4', { type: 'video/mp4' }),
			new File([new Uint8Array(TELEGRAM_VIDEO_MAX_BYTES + 1)], 'large.mp4', {
				type: 'video/mp4'
			}),
			new File(['video'], 'clip.webm', { type: 'video/webm' })
		];

		for (const file of files) {
			expect(validateSendVideo({ chatId: '123', video: { kind: 'upload', file } }).errors.video).toBeTruthy();
		}
	});

	it('validates upload-only JPEG thumbnails', () => {
		const thumbnail = new File(['jpeg'], 'thumb.jpg', { type: 'image/jpeg' });
		expect(
			validateSendVideo({
				chatId: '123',
				video: { kind: 'reference', value: 'file-id' },
				thumbnail
			}).errors.thumbnail
		).toBeTruthy();
		expect(
			validateSendVideo({
				chatId: '123',
				video: { kind: 'upload', file: new File(['video'], 'clip.mp4', { type: 'video/mp4' }) },
				thumbnail
			})
		).toEqual({ valid: true, errors: {} });
	});

	it('leaves formatted caption length validation to Telegram', () => {
		expect(validateSendVideo({
			chatId: '1',
			video: { kind: 'reference', value: 'file-id' },
			caption: `<b>${'x'.repeat(TELEGRAM_VIDEO_CAPTION_MAX_LENGTH)}</b>`,
			messageOptions: { parseMode: 'HTML' }
		})).toEqual({ valid: true, errors: {} });
	});
});

describe('prepareSendVideo', () => {
	it('builds a complete JSON request for a file ID or URL', () => {
		const replyMarkup: TelegramReplyMarkup = { force_reply: true };
		const result = prepareSendVideo({
			chatId: ' -100123 ',
			video: { kind: 'reference', value: ' https://example.com/video.mp4 ' },
			caption: 'Sample video',
			duration: 8,
			width: 1280,
			height: 720,
			supportsStreaming: true,
			hasSpoiler: true,
			replyMarkup
		});

		expect(result).toEqual({
			ok: true,
			request: {
				method: 'sendVideo',
				encoding: 'json',
				body: {
					chat_id: '-100123',
					video: 'https://example.com/video.mp4',
					caption: 'Sample video',
					duration: 8,
					width: 1280,
					height: 720,
					supports_streaming: true,
					has_spoiler: true,
					reply_markup: replyMarkup
				}
			}
		});
	});

	it('builds multipart data with an upload and thumbnail', () => {
		const video = new File(['video'], 'clip.mp4', { type: 'video/mp4' });
		const thumbnail = new File(['jpeg'], 'thumb.jpg', { type: 'image/jpeg' });
		const result = prepareSendVideo({
			chatId: '123',
			video: { kind: 'upload', file: video },
			thumbnail,
			supportsStreaming: true,
			replyMarkup: { remove_keyboard: true }
		});

		expect(result.ok).toBe(true);
		if (!result.ok || result.request.encoding !== 'multipart') throw new Error('Expected multipart');
		expect(result.request.body.get('video')).toBe(video);
		expect(result.request.body.get('thumbnail')).toBe(thumbnail);
		expect(result.request.body.get('supports_streaming')).toBe('true');
		expect(result.request.body.get('reply_markup')).toBe('{"remove_keyboard":true}');
	});

	it('serializes parse mode and delivery options for JSON and multipart requests', () => {
		const messageOptions = {
			parseMode: 'HTML' as const,
			replyParameters: { messageId: 4 },
			disableNotification: true as const
		};
		const json = prepareSendVideo({
			chatId: '1', video: { kind: 'reference', value: 'file-id' }, messageOptions
		});
		expect(json.ok && json.request.encoding === 'json' ? json.request.body : null).toMatchObject({
			parse_mode: 'HTML', reply_parameters: { message_id: 4 }, disable_notification: true
		});
		const multipart = prepareSendVideo({
			chatId: '1',
			video: { kind: 'upload', file: new File(['video'], 'clip.mp4', { type: 'video/mp4' }) },
			messageOptions
		});
		expect(multipart.ok && multipart.request.encoding === 'multipart'
			? Object.fromEntries(multipart.request.body.entries()) : null).toMatchObject({
			parse_mode: 'HTML', reply_parameters: '{"message_id":4}', disable_notification: 'true'
		});
	});
});
