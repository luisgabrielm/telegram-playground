import { describe, expect, it } from 'vitest';
import {
	TELEGRAM_VOICE_CAPTION_MAX_LENGTH,
	TELEGRAM_VOICE_MAX_BYTES,
	prepareSendVoice,
	validateSendVoice,
	type SendVoiceInput
} from './voice';

describe('validateSendVoice', () => {
	it.each([
		[
			{ chatId: ' ', voice: { kind: 'reference', value: 'telegram-file-id' } },
			'chatId'
		],
		[{ chatId: '123', voice: { kind: 'reference', value: ' ' } }, 'voice'],
		[
			{
				chatId: '123',
				voice: { kind: 'reference', value: 'telegram-file-id' },
				caption: 'x'.repeat(TELEGRAM_VOICE_CAPTION_MAX_LENGTH + 1)
			},
			'caption'
		],
		[
			{
				chatId: '123',
				voice: { kind: 'reference', value: 'telegram-file-id' },
				duration: -1
			},
			'duration'
		],
		[
			{
				chatId: '123',
				voice: { kind: 'reference', value: 'telegram-file-id' },
				duration: 1.5
			},
			'duration'
		]
	] satisfies Array<[SendVoiceInput, keyof ReturnType<typeof validateSendVoice>['errors']]>) (
		'rejects invalid input for %s',
		(input, expectedField) => {
			const result = validateSendVoice(input);

			expect(result.valid).toBe(false);
			expect(result.errors[expectedField]).toBeTruthy();
		}
	);

	it('rejects empty and oversized local uploads', () => {
		const uploads = [
			new File([], 'empty.ogg', { type: 'audio/ogg' }),
			fileWithReportedSize(TELEGRAM_VOICE_MAX_BYTES + 1)
		];

		for (const file of uploads) {
			const result = validateSendVoice({
				chatId: '123',
				voice: { kind: 'upload', file }
			});

			expect(result.errors.voice).toBeTruthy();
		}
	});

	it('accepts a file ID, HTTP URL, or local voice file', () => {
		const inputs: SendVoiceInput[] = [
			{ chatId: '123', voice: { kind: 'reference', value: 'telegram-file-id' } },
			{ chatId: '123', voice: { kind: 'reference', value: 'https://example.com/voice.ogg' } },
			{
				chatId: '123',
				voice: {
					kind: 'upload',
					file: new File(['voice'], 'voice.ogg', { type: 'audio/ogg' })
				}
			}
		];

		for (const input of inputs) {
			expect(validateSendVoice(input)).toEqual({ valid: true, errors: {} });
		}
	});
});

describe('prepareSendVoice', () => {
	it.each(['telegram-file-id', 'https://example.com/voice.ogg'])(
		'prepares JSON for the voice reference %s',
		(voice) => {
			const result = prepareSendVoice({
				chatId: '  -100123  ',
				voice: { kind: 'reference', value: `  ${voice}  ` },
				caption: 'Voice memo',
				duration: 17
			});

			expect(result).toEqual({
				ok: true,
				request: {
					method: 'sendVoice',
					encoding: 'json',
					body: {
						chat_id: '-100123',
						voice,
						caption: 'Voice memo',
						duration: 17
					}
				}
			});
		}
	);

	it('preserves local file metadata in multipart form data', () => {
		const voice = new File(['voice bytes'], 'field-note.m4a', {
			type: 'audio/mp4',
			lastModified: 1_700_000_000_000
		});
		const result = prepareSendVoice({
			chatId: '@playground_channel',
			voice: { kind: 'upload', file: voice },
			caption: 'Uploaded voice',
			duration: 8
		});

		expect(result.ok).toBe(true);
		if (!result.ok || result.request.encoding !== 'multipart') {
			throw new Error('Expected a multipart voice request.');
		}

		expect(result.request.body.get('chat_id')).toBe('@playground_channel');
		expect(result.request.body.get('caption')).toBe('Uploaded voice');
		expect(result.request.body.get('duration')).toBe('8');

		const uploaded = result.request.body.get('voice');
		expect(uploaded).toBe(voice);
		expect(uploaded).toBeInstanceOf(File);
		expect((uploaded as File).name).toBe('field-note.m4a');
		expect((uploaded as File).type).toBe('audio/mp4');
		expect((uploaded as File).lastModified).toBe(1_700_000_000_000);
	});

	it('omits blank optional values while preserving an explicit zero duration', () => {
		const result = prepareSendVoice({
			chatId: '42',
			voice: { kind: 'reference', value: 'telegram-file-id' },
			caption: '   ',
			duration: 0
		});

		expect(result).toEqual({
			ok: true,
			request: {
				method: 'sendVoice',
				encoding: 'json',
				body: { chat_id: '42', voice: 'telegram-file-id', duration: 0 }
			}
		});
	});

	it('returns field errors without echoing reference input', () => {
		const secretLikeReference = '123456:secret-token-like-reference';
		const result = prepareSendVoice({
			chatId: '',
			voice: { kind: 'reference', value: secretLikeReference }
		});

		expect(result).toEqual({
			ok: false,
			errors: { chatId: 'Enter a chat ID or channel username.' }
		});
		expect(JSON.stringify(result)).not.toContain(secretLikeReference);
	});
});

function fileWithReportedSize(size: number) {
	const file = new File(['voice'], 'large.ogg', { type: 'audio/ogg' });
	Object.defineProperty(file, 'size', { value: size });
	return file;
}
