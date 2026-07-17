import { describe, expect, it } from 'vitest';
import {
	TELEGRAM_ANIMATION_CAPTION_MAX_LENGTH,
	TELEGRAM_ANIMATION_MAX_BYTES,
	prepareSendAnimation,
	validateSendAnimation
} from './animation';

describe('validateSendAnimation', () => {
	it('validates required, text, numeric, and file inputs', () => {
		expect(
			validateSendAnimation({ chatId: '', animation: { kind: 'reference', value: '' } }).errors
		).toMatchObject({ chatId: expect.any(String), animation: expect.any(String) });
		expect(
			validateSendAnimation({
				chatId: '1',
				animation: { kind: 'reference', value: 'file-id' },
				caption: 'x'.repeat(TELEGRAM_ANIMATION_CAPTION_MAX_LENGTH + 1),
				duration: -1,
				width: 0,
				height: 2.5
			}).errors
		).toMatchObject({
			caption: expect.any(String),
			duration: expect.any(String),
			width: expect.any(String),
			height: expect.any(String)
		});
		expect(
			validateSendAnimation({
				chatId: '1',
				animation: { kind: 'upload', file: sizedFile(TELEGRAM_ANIMATION_MAX_BYTES + 1) }
			}).errors.animation
		).toBeTruthy();
	});
});

describe('prepareSendAnimation', () => {
	it('prepares a complete JSON request for a reference', () => {
		expect(
			prepareSendAnimation({
				chatId: ' 42 ',
				animation: { kind: 'reference', value: ' animation-id ' },
				caption: 'Loop',
				duration: 0,
				width: 640,
				height: 360,
				hasSpoiler: true
			})
		).toEqual({
			ok: true,
			request: {
				method: 'sendAnimation',
				encoding: 'json',
				body: {
					chat_id: '42',
					animation: 'animation-id',
					caption: 'Loop',
					duration: 0,
					width: 640,
					height: 360,
					has_spoiler: true
				}
			}
		});
	});

	it('prepares multipart media, thumbnail, spoiler, and markup fields', () => {
		const animation = new File(['gif'], 'loop.gif', { type: 'image/gif' });
		const thumbnail = new File(['jpeg'], 'cover.jpg', { type: 'image/jpeg' });
		const result = prepareSendAnimation({
			chatId: '42',
			animation: { kind: 'upload', file: animation },
			thumbnail,
			hasSpoiler: true,
			replyMarkup: { keyboard: [[{ text: 'Again' }]] }
		});

		expect(result.ok).toBe(true);
		if (!result.ok || result.request.encoding !== 'multipart') throw new Error('Expected multipart');
		expect(result.request.body.get('animation')).toBe(animation);
		expect(result.request.body.get('thumbnail')).toBe(thumbnail);
		expect(result.request.body.get('has_spoiler')).toBe('true');
		expect(result.request.body.get('reply_markup')).toBe(JSON.stringify({ keyboard: [[{ text: 'Again' }]] }));
	});
});

function sizedFile(size: number) {
	const file = new File(['x'], 'loop.gif', { type: 'image/gif' });
	Object.defineProperty(file, 'size', { value: size });
	return file;
}
