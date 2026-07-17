import { describe, expect, it } from 'vitest';
import {
	buildAnswerCallbackQueryPayload,
	buildEditMessageReplyMarkupPayload,
	buildAudioAnimationPayload,
	buildMediaGroupPayload,
	buildMediaPayload,
	buildSendDicePayload,
	buildSendContactPayload,
	buildSendLocationPayload,
	buildSendMessagePayload,
	buildSendPollPayload,
	buildSendRichMessagePayload,
	buildSendVenuePayload
} from './payload';

describe('request payload previews', () => {
	it('builds callback answer and keyboard edit payloads', () => {
		expect(
			buildAnswerCallbackQueryPayload({
				callbackQueryId: ' query-1 ',
				text: 'Done',
				showAlert: true,
				url: '',
				cacheTime: '10'
			})
		).toEqual({ callback_query_id: 'query-1', text: 'Done', show_alert: true, cache_time: 10 });

		expect(
			buildEditMessageReplyMarkupPayload({
				chatId: '123',
				messageId: '42',
				inlineMessageId: '',
				replyMarkup: { inline_keyboard: [[{ text: 'Done', callback_data: 'done' }]] }
			})
		).toEqual({
			chat_id: '123',
			message_id: 42,
			reply_markup: { inline_keyboard: [[{ text: 'Done', callback_data: 'done' }]] }
		});
	});

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

	it('builds safe multipart audio previews with metadata', () => {
		const audio = new File(['audio bytes'], 'track.mp3', { type: 'audio/mpeg' });
		const thumbnail = new File(['image bytes'], 'cover.jpg', { type: 'image/jpeg' });
		const preview = buildAudioAnimationPayload({
			chatId: '123',
			mediaName: 'audio',
			sourceType: 'upload',
			mediaReference: '',
			file: audio,
			caption: 'Listen',
			duration: '42',
			performer: 'Performer',
			title: 'Title',
			thumbnailFile: thumbnail
		});

		expect(preview.encoding).toBe('multipart');
		expect(preview.payload).toEqual({
			chat_id: '123',
			audio: { $file: expect.objectContaining({ name: 'track.mp3', type: 'audio/mpeg' }) },
			caption: 'Listen',
			duration: 42,
			performer: 'Performer',
			title: 'Title',
			thumbnail: { $file: expect.objectContaining({ name: 'cover.jpg', type: 'image/jpeg' }) }
		});
		expect(JSON.stringify(preview)).not.toContain('audio bytes');
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

	it('builds contact payloads with optional vCard data', () => {
		expect(
			buildSendContactPayload({
				chatId: ' 123 ',
				phoneNumber: ' +15551234567 ',
				firstName: 'Ada',
				lastName: 'Lovelace',
				vcard: 'BEGIN:VCARD\nEND:VCARD'
			})
		).toEqual({
			chat_id: '123',
			phone_number: '+15551234567',
			first_name: 'Ada',
			last_name: 'Lovelace',
			vcard: 'BEGIN:VCARD\nEND:VCARD'
		});
	});

	it('builds location payloads with numeric optional fields', () => {
		expect(
			buildSendLocationPayload({
				chatId: '123',
				latitude: '-23.55',
				longitude: '-46.63',
				horizontalAccuracy: '15.5',
				livePeriod: '3600',
				heading: '180',
				proximityAlertRadius: '250'
			})
		).toEqual({
			chat_id: '123',
			latitude: -23.55,
			longitude: -46.63,
			horizontal_accuracy: 15.5,
			live_period: 3600,
			heading: 180,
			proximity_alert_radius: 250
		});
	});

	it('keeps required blank coordinates visibly blank in previews', () => {
		expect(
			buildSendLocationPayload({
				chatId: '',
				latitude: '',
				longitude: '',
				horizontalAccuracy: '',
				livePeriod: '',
				heading: '',
				proximityAlertRadius: ''
			})
		).toEqual({ chat_id: '', latitude: '', longitude: '' });
	});

	it('omits empty venue provider identifiers', () => {
		expect(
			buildSendVenuePayload({
				chatId: '@place',
				latitude: '40.7',
				longitude: '-74',
				title: 'Example Hall',
				address: '1 Main St',
				foursquareId: '',
				foursquareType: '',
				googlePlaceId: 'google-id',
				googlePlaceType: 'museum'
			})
		).toEqual({
			chat_id: '@place',
			latitude: 40.7,
			longitude: -74,
			title: 'Example Hall',
			address: '1 Main St',
			google_place_id: 'google-id',
			google_place_type: 'museum'
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

	it('builds rich-message payloads with structured blocks', () => {
		expect(
			buildSendRichMessagePayload({
				chatId: ' 123 ',
				blocks: [
					{ type: 'heading', text: 'Title', size: 1 },
					{ type: 'paragraph', text: 'Body' }
				],
				isRtl: false,
				skipEntityDetection: true,
				replyMarkup: { remove_keyboard: true }
			})
		).toEqual({
			chat_id: '123',
			rich_message: {
				blocks: [
					{ type: 'heading', text: 'Title', size: 1 },
					{ type: 'paragraph', text: 'Body' }
				],
				skip_entity_detection: true
			},
			reply_markup: { remove_keyboard: true }
		});
	});
});
