import { describe, expect, it } from 'vitest';
import { TELEGRAM_MESSAGE_MAX_LENGTH } from '$lib/server/message-validation';
import { prepareSendMessage } from './message';

describe('prepareSendMessage', () => {
	it('prepares the normalized JSON request including all options', () => {
		const result = prepareSendMessage({
			chatId: '  @channel ',
			text: '<b>Hello</b>',
			replyMarkup: { remove_keyboard: true },
			messageOptions: {
				parseMode: 'HTML',
				replyParameters: {
					messageId: 4,
					allowSendingWithoutReply: true,
					quote: '<i>Hello</i>',
					quoteParseMode: 'HTML',
					quotePosition: 0
				},
				protectContent: true,
				disableNotification: true,
				messageEffectId: 'effect'
			}
		});

		expect(result).toEqual({
			ok: true,
			request: {
				method: 'sendMessage',
				encoding: 'json',
				body: {
					chat_id: '@channel',
					text: '<b>Hello</b>',
					reply_markup: { remove_keyboard: true },
					parse_mode: 'HTML',
					reply_parameters: {
						message_id: 4,
						allow_sending_without_reply: true,
						quote: '<i>Hello</i>',
						quote_parse_mode: 'HTML',
						quote_position: 0
					},
					protect_content: true,
					disable_notification: true,
					message_effect_id: 'effect'
				}
			}
		});
	});

	it('leaves raw formatted length validation to Telegram', () => {
		const result = prepareSendMessage({
			chatId: '1', text: `<b>${'x'.repeat(TELEGRAM_MESSAGE_MAX_LENGTH)}</b>`,
			messageOptions: { parseMode: 'HTML' }
		});
		expect(result.ok).toBe(true);
	});

	it('retains the plain-text local limit and required fields', () => {
		expect(prepareSendMessage({ chatId: '', text: '' })).toEqual({
			ok: false,
			errors: {
				chatId: 'Enter a chat ID or channel username.',
				text: 'Enter a message to send.'
			}
		});
		expect(prepareSendMessage({ chatId: '1', text: 'x'.repeat(TELEGRAM_MESSAGE_MAX_LENGTH + 1) }).ok).toBe(false);
	});
});
