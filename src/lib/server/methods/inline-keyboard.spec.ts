import { describe, expect, it } from 'vitest';
import { prepareAnswerCallbackQuery, prepareEditMessageReplyMarkup } from './inline-keyboard';

describe('prepareAnswerCallbackQuery', () => {
	it('prepares an acknowledgement with optional user feedback', () => {
		expect(
			prepareAnswerCallbackQuery({
				callbackQueryId: ' callback-1 ',
				text: 'Saved',
				showAlert: true,
				url: '',
				cacheTime: '30'
			})
		).toEqual({
			ok: true,
			request: {
				callback_query_id: 'callback-1',
				text: 'Saved',
				show_alert: true,
				cache_time: 30
			}
		});
	});

	it('allows an acknowledgement without a notification', () => {
		expect(
			prepareAnswerCallbackQuery({
				callbackQueryId: 'id',
				text: '',
				showAlert: false,
				url: '',
				cacheTime: ''
			})
		).toEqual({ ok: true, request: { callback_query_id: 'id' } });
	});

	it('enforces Telegram limits and safe numeric values', () => {
		const result = prepareAnswerCallbackQuery({
			callbackQueryId: '',
			text: '😀'.repeat(201),
			showAlert: false,
			url: 'javascript:alert(1)',
			cacheTime: '-1'
		});

		expect(result).toMatchObject({
			ok: false,
			errors: {
				callbackQueryId: 'Enter a callback query ID.',
				text: 'Must contain at most 200 characters.',
				url: 'Enter a valid HTTP, HTTPS, or tg:// URL.',
				cacheTime: 'Enter a non-negative whole number.'
			}
		});
	});
});

describe('prepareEditMessageReplyMarkup', () => {
	const replyMarkup = {
		inline_keyboard: [[{ text: 'Done', callback_data: 'done' }]]
	} as const;

	it('targets a normal message and replaces its keyboard', () => {
		expect(
			prepareEditMessageReplyMarkup({
				chatId: ' 123 ',
				messageId: '42',
				inlineMessageId: '',
				replyMarkup
			})
		).toEqual({
			ok: true,
			request: { chat_id: '123', message_id: 42, reply_markup: replyMarkup }
		});
	});

	it('targets inline-mode messages and can remove the keyboard', () => {
		expect(
			prepareEditMessageReplyMarkup({
				chatId: '',
				messageId: '',
				inlineMessageId: ' inline-1 '
			})
		).toEqual({ ok: true, request: { inline_message_id: 'inline-1' } });
	});

	it('requires exactly one complete target', () => {
		expect(
			prepareEditMessageReplyMarkup({
				chatId: '123',
				messageId: '',
				inlineMessageId: ''
			})
		).toMatchObject({ ok: false, errors: { messageId: 'Enter a message ID.' } });

		expect(
			prepareEditMessageReplyMarkup({
				chatId: '123',
				messageId: '42',
				inlineMessageId: 'inline-1'
			})
		).toMatchObject({
			ok: false,
			errors: { target: 'Use either an inline message ID or a chat ID and message ID.' }
		});
	});
});
