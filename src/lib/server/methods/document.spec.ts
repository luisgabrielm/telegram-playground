import { describe, expect, it } from 'vitest';
import type { TelegramReplyMarkup } from '$lib/reply-markup';
import {
	TELEGRAM_DOCUMENT_CAPTION_MAX_LENGTH,
	TELEGRAM_DOCUMENT_MAX_BYTES,
	prepareSendDocument,
	validateSendDocument,
	type SendDocumentFields
} from './document';

describe('validateSendDocument', () => {
	it.each([
		[{ chatId: '', document: 'file-id', caption: '' }, 'chatId'],
		[{ chatId: '123', document: null, caption: '' }, 'document'],
		[{ chatId: '123', document: '   ', caption: '' }, 'document'],
		[{ chatId: '123', document: new File([], 'empty.pdf'), caption: '' }, 'document'],
		[
			{
				chatId: '123',
				document: fileWithReportedSize(TELEGRAM_DOCUMENT_MAX_BYTES + 1),
				caption: ''
			},
			'document'
		],
		[
			{
				chatId: '123',
				document: 'file-id',
				caption: 'x'.repeat(TELEGRAM_DOCUMENT_CAPTION_MAX_LENGTH + 1)
			},
			'caption'
		]
	] satisfies Array<[SendDocumentFields, keyof ReturnType<typeof validateSendDocument>['errors']]>)(
		'rejects invalid %s input',
		(fields, expectedField) => {
			const result = validateSendDocument(fields);

			expect(result.valid).toBe(false);
			expect(result.errors[expectedField]).toBeTruthy();
		}
	);

	it('accepts the documented caption boundary', () => {
		const result = validateSendDocument({
			chatId: '@playground_channel',
			document: 'telegram-file-id',
			caption: 'x'.repeat(TELEGRAM_DOCUMENT_CAPTION_MAX_LENGTH)
		});

		expect(result).toEqual({ valid: true, errors: {} });
	});
});

describe('prepareSendDocument', () => {
	it.each(['telegram-file-id', 'https://example.com/report.pdf'])(
		'prepares a JSON request for the document reference %s',
		(document) => {
			const result = prepareSendDocument({
				chatId: '  -100123  ',
				document: `  ${document}  `,
				caption: 'Quarterly report'
			});

			expect(result).toEqual({
				ok: true,
				request: {
					method: 'sendDocument',
					encoding: 'json',
					body: {
						chat_id: '-100123',
						document,
						caption: 'Quarterly report'
					}
				}
			});
		}
	);

	it('prepares multipart form data for a file upload', () => {
		const document = new File(['document body'], 'report.pdf', { type: 'application/pdf' });
		const result = prepareSendDocument({ chatId: '42', document, caption: 'Report' });

		expect(result.ok).toBe(true);

		if (!result.ok || result.request.encoding !== 'multipart') {
			throw new Error('Expected a multipart document request.');
		}

		expect(result.request.method).toBe('sendDocument');
		expect(result.request.body.get('chat_id')).toBe('42');
		expect(result.request.body.get('document')).toBe(document);
		expect(result.request.body.get('caption')).toBe('Report');
	});

	it('includes reply markup in JSON and multipart requests', () => {
		const replyMarkup: TelegramReplyMarkup = {
			keyboard: [[{ text: 'Yes' }, { text: 'No' }]],
			resize_keyboard: true
		};
		const jsonResult = prepareSendDocument({
			chatId: '42',
			document: 'file-id',
			caption: '',
			replyMarkup
		});
		const multipartResult = prepareSendDocument({
			chatId: '42',
			document: new File(['document'], 'report.pdf'),
			caption: '',
			replyMarkup
		});

		expect(jsonResult.ok).toBe(true);
		if (!jsonResult.ok || jsonResult.request.encoding !== 'json') throw new Error('Expected JSON');
		expect(jsonResult.request.body.reply_markup).toBe(replyMarkup);

		expect(multipartResult.ok).toBe(true);
		if (!multipartResult.ok || multipartResult.request.encoding !== 'multipart') {
			throw new Error('Expected multipart');
		}
		expect(multipartResult.request.body.get('reply_markup')).toBe(JSON.stringify(replyMarkup));
	});

	it('omits a whitespace-only optional caption', () => {
		const result = prepareSendDocument({
			chatId: '42',
			document: 'telegram-file-id',
			caption: '   '
		});

		expect(result).toEqual({
			ok: true,
			request: {
				method: 'sendDocument',
				encoding: 'json',
				body: { chat_id: '42', document: 'telegram-file-id' }
			}
		});
	});

	it('returns field errors instead of creating an invalid request', () => {
		const result = prepareSendDocument({ chatId: '', document: null, caption: '' });

		expect(result).toEqual({
			ok: false,
			errors: {
				chatId: 'Enter a chat ID or channel username.',
				document: 'Enter a Telegram file ID or HTTP URL, or choose a document.'
			}
		});
	});
});

function fileWithReportedSize(size: number) {
	const file = new File(['x'], 'large.pdf', { type: 'application/pdf' });
	Object.defineProperty(file, 'size', { value: size });
	return file;
}
