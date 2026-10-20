import { describe, expect, it } from 'vitest';
import {
	MEDIA_GROUP_CAPTION_MAX_LENGTH,
	MEDIA_GROUP_MAX_ITEMS,
	prepareSendMediaGroup,
	validateSendMediaGroup,
	type SendMediaGroupInput,
	type SendMediaGroupItem
} from './media-group';

const photo = (value = 'photo-id'): SendMediaGroupItem => ({
	type: 'photo',
	source: { kind: 'reference', value }
});

describe('validateSendMediaGroup', () => {
	it('requires a chat identifier', () => {
		const errors = validateSendMediaGroup({ chatId: ' ', items: [photo(), photo()] });
		expect(errors.chatId).toBeTruthy();
	});

	it('requires between two and ten items', () => {
		expect(validateSendMediaGroup({ chatId: '123', items: [photo()] }).items).toBeTruthy();
		expect(
			validateSendMediaGroup({
				chatId: '123',
				items: Array.from({ length: MEDIA_GROUP_MAX_ITEMS + 1 }, (_, index) => photo(`${index}`))
			}).items
		).toBeTruthy();
	});

	it('validates every reference, upload, type, and caption with indexed errors', () => {
		const input = {
			chatId: '123',
			items: [
				{ type: 'animation', source: { kind: 'reference', value: ' ' } },
				{
					type: 'video',
					source: { kind: 'upload', file: new Blob([], { type: 'video/mp4' }) },
					caption: 'x'.repeat(MEDIA_GROUP_CAPTION_MAX_LENGTH + 1)
				}
			]
		} as unknown as SendMediaGroupInput;
		const errors = validateSendMediaGroup(input);

		expect(errors['itemType.0']).toBeTruthy();
		expect(errors['itemReference.0']).toBeTruthy();
		expect(errors['itemFile.1']).toBeTruthy();
		expect(errors['itemCaption.1']).toBeTruthy();
	});

	it.each([
		['photo', 'video/mp4'],
		['video', 'image/jpeg'],
		['audio', 'video/mp4']
	] as const)('rejects a mismatched %s upload MIME type', (type, mime) => {
		const errors = validateSendMediaGroup({
			chatId: '123',
			items: [
				{ type, source: { kind: 'upload', file: new Blob(['bytes'], { type: mime }) } },
				{ type, source: { kind: 'reference', value: 'file-id' } }
			]
		});
		expect(errors['itemFile.0']).toBeTruthy();
	});

	it('allows generic MIME types and any non-empty document upload', () => {
		const inputs: SendMediaGroupInput[] = [
			{
				chatId: '123',
				items: [
					{ type: 'photo', source: { kind: 'upload', file: new Blob(['a']) } },
					photo()
				]
			},
			{
				chatId: '123',
				items: [
					{
						type: 'document',
						source: { kind: 'upload', file: new Blob(['a'], { type: 'text/plain' }) }
					},
					{ type: 'document', source: { kind: 'reference', value: 'document-id' } }
				]
			}
		];
		for (const input of inputs) expect(validateSendMediaGroup(input)).toEqual({});
	});

	it('allows photo and video to mix', () => {
		expect(
			validateSendMediaGroup({
				chatId: '123',
				items: [photo(), { type: 'video', source: { kind: 'reference', value: 'video-id' } }]
			})
		).toEqual({});
	});

	it.each([
		['audio', 'photo'],
		['document', 'photo']
	] as const)('rejects an album mixing %s with %s', (first, second) => {
		const errors = validateSendMediaGroup({
			chatId: '123',
			items: [
				{ type: first, source: { kind: 'reference', value: 'first' } },
				{ type: second, source: { kind: 'reference', value: 'second' } }
			]
		});
		expect(errors.items).toBeTruthy();
	});
});

describe('prepareSendMediaGroup', () => {
	it('serializes per-item parse modes and top-level delivery options in JSON', () => {
		const result = prepareSendMediaGroup({
			chatId: '123',
			items: [
				{ ...photo(), caption: '<b>First</b>', parseMode: 'HTML' },
				{ ...photo('other'), parseMode: 'MarkdownV2' }
			],
			messageOptions: { disableNotification: true, replyParameters: { messageId: 8 } }
		});
		expect(result.ok && result.request.encoding === 'json' && result.request.body).toMatchObject({
			disable_notification: true,
			reply_parameters: { message_id: 8 },
			media: [
				{ caption: '<b>First</b>', parse_mode: 'HTML' },
				{ media: 'other' }
			]
		});
	});

	it('serializes delivery options in multipart data', () => {
		const result = prepareSendMediaGroup({
			chatId: '123',
			items: [
				{ type: 'photo', source: { kind: 'upload', file: new Blob(['a']) } },
				photo('other')
			],
			messageOptions: { protectContent: true, messageEffectId: 'effect' }
		});
		expect(result.ok && result.request.encoding === 'multipart').toBe(true);
		if (!result.ok || result.request.encoding !== 'multipart') return;
		expect(result.request.body.get('protect_content')).toBe('true');
		expect(result.request.body.get('message_effect_id')).toBe('effect');
	});

	it('rejects an unsupported per-item parse mode', () => {
		const result = prepareSendMediaGroup({
			chatId: '123', items: [{ ...photo(), parseMode: 'Markdown' }, photo('other')]
		});
		expect(result).toMatchObject({ ok: false, errors: { 'itemParseMode.0': 'Choose HTML or MarkdownV2.' } });
	});

	it('leaves post-formatting caption length validation to Telegram', () => {
		const result = prepareSendMediaGroup({
			chatId: '123',
			items: [{ ...photo(), caption: `<b>${'a'.repeat(1025)}</b>`, parseMode: 'HTML' }, photo('other')]
		});
		expect(result.ok).toBe(true);
	});

	it('builds JSON when every item is a URL or Telegram file ID', () => {
		const result = prepareSendMediaGroup({
			chatId: '  -100123  ',
			items: [
				{ ...photo('  photo-id  '), caption: 'First photo' },
				{ type: 'video', source: { kind: 'reference', value: ' https://example.com/a.mp4 ' } }
			]
		});

		expect(result).toEqual({
			ok: true,
			request: {
				method: 'sendMediaGroup',
				encoding: 'json',
				body: {
					chat_id: '-100123',
					media: [
						{ type: 'photo', media: 'photo-id', caption: 'First photo' },
						{ type: 'video', media: 'https://example.com/a.mp4' }
					]
				}
			}
		});
	});

	it('builds multipart data with deterministic attachment names when any item uploads', () => {
		const firstFile = new Blob(['photo'], { type: 'image/jpeg' });
		const thirdFile = new Blob(['video'], { type: 'video/mp4' });
		const result = prepareSendMediaGroup({
			chatId: '@channel',
			items: [
				{ type: 'photo', source: { kind: 'upload', file: firstFile, filename: 'first.jpg' } },
				photo('existing-photo'),
				{ type: 'video', source: { kind: 'upload', file: thirdFile, filename: 'clip.mp4' } }
			]
		});

		expect(result.ok).toBe(true);
		if (!result.ok || result.request.encoding !== 'multipart') throw new Error('Expected multipart');
		expect(result.request.body.get('chat_id')).toBe('@channel');
		expect(JSON.parse(String(result.request.body.get('media')))).toEqual([
			{ type: 'photo', media: 'attach://media_0' },
			{ type: 'photo', media: 'existing-photo' },
			{ type: 'video', media: 'attach://media_2' }
		]);
		expect((result.request.body.get('media_0') as File).name).toBe('first.jpg');
		expect(result.request.body.get('media_1')).toBeNull();
		expect((result.request.body.get('media_2') as File).name).toBe('clip.mp4');
	});

	it('omits blank captions', () => {
		const result = prepareSendMediaGroup({
			chatId: '123',
			items: [{ ...photo(), caption: '   ' }, photo('other')]
		});
		expect(result.ok).toBe(true);
		if (!result.ok || result.request.encoding !== 'json') throw new Error('Expected JSON');
		expect(result.request.body.media[0]).not.toHaveProperty('caption');
	});

	it('returns safe validation errors without echoing source values', () => {
		const secretLikeValue = '123456:secret-token-like-value';
		const result = prepareSendMediaGroup({
			chatId: '',
			items: [photo(secretLikeValue)]
		});
		expect(result.ok).toBe(false);
		expect(JSON.stringify(result)).not.toContain(secretLikeValue);
	});
});
