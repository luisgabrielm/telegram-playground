import { describe, expect, it } from 'vitest';
import {
	buildMediaGroupPayload,
	buildMediaPayload,
	buildSendDicePayload,
	buildSendMessagePayload,
	buildSendPollPayload
} from './payload';

describe('request payload previews', () => {
	it('uses Telegram field names for text messages', () => {
		expect(buildSendMessagePayload(' 123 ', 'Hello')).toEqual({
			chat_id: '123',
			text: 'Hello'
		});
	});

	it('includes normalized reply markup in text payloads', () => {
		expect(
			buildSendMessagePayload('123', 'Choose', {
				inline_keyboard: [[{ text: 'Open', url: 'https://example.com' }]]
			})
		).toEqual({
			chat_id: '123',
			text: 'Choose',
			reply_markup: {
				inline_keyboard: [[{ text: 'Open', url: 'https://example.com' }]]
			}
		});
	});

	it('builds the same optional JSON fields used by sendPhoto', () => {
		expect(
			buildMediaPayload({
				chatId: ' 123 ',
				mediaName: 'photo',
				sourceType: 'reference',
				mediaReference: ' file-id ',
				file: null,
				caption: 'A caption',
				hasSpoiler: true
			})
		).toEqual({
			encoding: 'json',
			payload: {
				chat_id: '123',
				photo: 'file-id',
				caption: 'A caption',
				has_spoiler: true
			}
		});
	});

	it('represents multipart files with metadata and no contents', () => {
		const file = new File(['secret contents'], 'voice.ogg', {
			type: 'audio/ogg',
			lastModified: Date.UTC(2026, 0, 2)
		});
		const preview = buildMediaPayload({
			chatId: '@test',
			mediaName: 'voice',
			sourceType: 'upload',
			mediaReference: '',
			file,
			caption: '',
			duration: '12'
		});

		expect(preview).toEqual({
			encoding: 'multipart',
			payload: {
				chat_id: '@test',
				voice: {
					$file: {
						name: 'voice.ogg',
						type: 'audio/ogg',
						size: file.size,
						last_modified: '2026-01-02T00:00:00.000Z'
					}
				},
				duration: 12
			}
		});
		expect(JSON.stringify(preview)).not.toContain('secret contents');
	});

	it('shows an empty upload placeholder before a file is selected', () => {
		const preview = buildMediaPayload({
			chatId: '',
			mediaName: 'document',
			sourceType: 'upload',
			mediaReference: '',
			file: null,
			caption: ''
		});

		expect(preview.payload.document).toEqual({ $file: null });
	});

	it('includes reply markup in multipart previews', () => {
		const preview = buildMediaPayload({
			chatId: '123',
			mediaName: 'document',
			sourceType: 'upload',
			mediaReference: '',
			file: null,
			caption: '',
			replyMarkup: { force_reply: true, input_field_placeholder: 'Your answer' }
		});

		expect(preview.payload.reply_markup).toEqual({
			force_reply: true,
			input_field_placeholder: 'Your answer'
		});
	});

	it('builds regular and quiz poll payloads', () => {
		expect(
			buildSendPollPayload({
				chatId: ' 123 ',
				question: 'Pick one',
				options: ['A', 'B'],
				type: 'quiz',
				isAnonymous: false,
				allowsMultipleAnswers: false,
				correctOptionIds: [1],
				explanation: 'B is correct',
				openPeriod: '30'
			})
		).toEqual({
			chat_id: '123',
			question: 'Pick one',
			options: [{ text: 'A' }, { text: 'B' }],
			type: 'quiz',
			is_anonymous: false,
			correct_option_ids: [1],
			explanation: 'B is correct',
			open_period: 30
		});
	});

	it('builds dice payloads with reply markup', () => {
		expect(buildSendDicePayload(' @test ', '🎯', { force_reply: true })).toEqual({
			chat_id: '@test',
			emoji: '🎯',
			reply_markup: { force_reply: true }
		});
	});

	it('builds safe multipart media-group previews', () => {
		const file = new File(['private bytes'], 'photo.jpg', { type: 'image/jpeg' });
		const preview = buildMediaGroupPayload({
			chatId: '123',
			items: [
				{
					type: 'photo',
					sourceType: 'upload',
					reference: '',
					file,
					caption: 'Uploaded'
				},
				{
					type: 'video',
					sourceType: 'reference',
					reference: 'video-file-id',
					file: null,
					caption: ''
				}
			]
		});

		expect(preview.encoding).toBe('multipart');
		expect(preview.payload.media).toEqual([
			{ type: 'photo', media: 'attach://media_0', caption: 'Uploaded' },
			{ type: 'video', media: 'video-file-id' }
		]);
		expect(preview.payload.media_0).toEqual({
			$file: expect.objectContaining({ name: 'photo.jpg', type: 'image/jpeg', size: file.size })
		});
		expect(JSON.stringify(preview)).not.toContain('private bytes');
	});
});
