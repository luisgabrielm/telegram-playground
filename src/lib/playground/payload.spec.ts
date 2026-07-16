import { describe, expect, it } from 'vitest';
import { buildMediaPayload, buildSendMessagePayload } from './payload';

describe('request payload previews', () => {
	it('uses Telegram field names for text messages', () => {
		expect(buildSendMessagePayload(' 123 ', 'Hello')).toEqual({
			chat_id: '123',
			text: 'Hello'
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
});
