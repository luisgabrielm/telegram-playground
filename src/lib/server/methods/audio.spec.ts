import { describe, expect, it } from 'vitest';
import {
	TELEGRAM_AUDIO_CAPTION_MAX_LENGTH,
	TELEGRAM_AUDIO_MAX_BYTES,
	TELEGRAM_THUMBNAIL_MAX_BYTES,
	prepareSendAudio,
	validateSendAudio
} from './audio';

describe('validateSendAudio', () => {
	it('validates required fields, caption, duration, and upload size', () => {
		expect(validateSendAudio({ chatId: '', audio: { kind: 'reference', value: '' } }).errors).toEqual({
			chatId: 'Enter a chat ID or channel username.',
			audio: 'Enter a Telegram file ID or HTTP URL.'
		});
		expect(
			validateSendAudio({
				chatId: '1',
				audio: { kind: 'reference', value: 'file-id' },
				caption: 'x'.repeat(TELEGRAM_AUDIO_CAPTION_MAX_LENGTH + 1),
				duration: 1.5
			}).errors
		).toMatchObject({ caption: expect.any(String), duration: expect.any(String) });
		expect(
			validateSendAudio({
				chatId: '1',
				audio: { kind: 'upload', file: sizedFile(TELEGRAM_AUDIO_MAX_BYTES + 1) }
			}).errors.audio
		).toBeTruthy();
	});

	it('validates Telegram thumbnail constraints', () => {
		const thumbnail = sizedFile(TELEGRAM_THUMBNAIL_MAX_BYTES + 1, 'cover.jpg', 'image/jpeg');
		expect(
			validateSendAudio({
				chatId: '1',
				audio: { kind: 'reference', value: 'file-id' },
				thumbnail
			}).errors.thumbnail
		).toContain('local audio upload');
		expect(
			validateSendAudio({
				chatId: '1',
				audio: { kind: 'upload', file: new File(['audio'], 'song.mp3') },
				thumbnail
			}).errors.thumbnail
		).toContain('200 kB');
	});

	it('leaves formatted caption length validation to Telegram', () => {
		expect(validateSendAudio({
			chatId: '1',
			audio: { kind: 'reference', value: 'file-id' },
			caption: `<b>${'x'.repeat(TELEGRAM_AUDIO_CAPTION_MAX_LENGTH)}</b>`,
			messageOptions: { parseMode: 'HTML' }
		})).toEqual({ valid: true, errors: {} });
	});
});

describe('prepareSendAudio', () => {
	it('prepares a complete JSON request for a reference', () => {
		expect(
			prepareSendAudio({
				chatId: ' 42 ',
				audio: { kind: 'reference', value: ' file-id ' },
				caption: 'A track',
				duration: 0,
				performer: 'Artist',
				title: 'Title',
				replyMarkup: { force_reply: true }
			})
		).toEqual({
			ok: true,
			request: {
				method: 'sendAudio',
				encoding: 'json',
				body: {
					chat_id: '42',
					audio: 'file-id',
					caption: 'A track',
					duration: 0,
					performer: 'Artist',
					title: 'Title',
					reply_markup: { force_reply: true }
				}
			}
		});
	});

	it('prepares multipart audio and thumbnail uploads', () => {
		const audio = new File(['audio'], 'song.mp3', { type: 'audio/mpeg' });
		const thumbnail = new File(['jpeg'], 'cover.jpg', { type: 'image/jpeg' });
		const result = prepareSendAudio({
			chatId: '@music',
			audio: { kind: 'upload', file: audio },
			thumbnail,
			title: 'Track'
		});

		expect(result.ok).toBe(true);
		if (!result.ok || result.request.encoding !== 'multipart') throw new Error('Expected multipart');
		expect(result.request.body.get('audio')).toBe(audio);
		expect(result.request.body.get('thumbnail')).toBe(thumbnail);
		expect(result.request.body.get('title')).toBe('Track');
	});

	it('serializes formatting and delivery options for JSON and multipart requests', () => {
		const options = {
			parseMode: 'HTML' as const,
			replyParameters: {
				messageId: 7,
				allowSendingWithoutReply: true as const,
				quote: '<b>line</b>',
				quoteParseMode: 'HTML' as const,
				quotePosition: 0
			},
			protectContent: true as const,
			disableNotification: true as const,
			messageEffectId: 'effect-1'
		};
		const json = prepareSendAudio({
			chatId: '1',
			audio: { kind: 'reference', value: 'file-id' },
			caption: '<b>Track</b>',
			messageOptions: options
		});
		expect(json.ok && json.request.encoding === 'json' ? json.request.body : null).toMatchObject({
			parse_mode: 'HTML',
			reply_parameters: {
				message_id: 7,
				allow_sending_without_reply: true,
				quote: '<b>line</b>',
				quote_parse_mode: 'HTML',
				quote_position: 0
			},
			protect_content: true,
			disable_notification: true,
			message_effect_id: 'effect-1'
		});

		const multipart = prepareSendAudio({
			chatId: '1',
			audio: { kind: 'upload', file: new File(['audio'], 'song.mp3') },
			messageOptions: options
		});
		expect(multipart.ok && multipart.request.encoding === 'multipart'
			? Object.fromEntries(multipart.request.body.entries())
			: null).toMatchObject({
			parse_mode: 'HTML',
			reply_parameters: JSON.stringify({
				message_id: 7,
				allow_sending_without_reply: true,
				quote: '<b>line</b>',
				quote_parse_mode: 'HTML',
				quote_position: 0
			}),
			protect_content: 'true',
			disable_notification: 'true',
			message_effect_id: 'effect-1'
		});
	});
});

function sizedFile(size: number, name = 'audio.mp3', type = 'audio/mpeg') {
	const file = new File(['x'], name, { type });
	Object.defineProperty(file, 'size', { value: size });
	return file;
}
