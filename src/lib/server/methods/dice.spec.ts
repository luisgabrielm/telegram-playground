import { describe, expect, it } from 'vitest';
import type { TelegramReplyMarkup } from '$lib/reply-markup';
import {
	TELEGRAM_DICE_EMOJIS,
	prepareSendDice,
	validateSendDice,
	type TelegramDiceEmoji
} from './dice';

describe('validateSendDice', () => {
	it('requires a chat ID', () => {
		const result = validateSendDice({ chatId: '   ' });

		expect(result).toEqual({
			valid: false,
			errors: { chatId: 'Enter a chat ID or channel username.' }
		});
	});

	it.each(['🪙', 'dice', ' 🎲 ', ''])('rejects unsupported explicit emoji %j', (emoji) => {
		const result = validateSendDice({ chatId: '42', emoji });

		if (emoji === '') {
			expect(result).toEqual({ valid: true, errors: {} });
		} else {
			expect(result.valid).toBe(false);
			expect(result.errors.emoji).toBe('Choose a supported Telegram dice emoji.');
		}
	});

	it.each(TELEGRAM_DICE_EMOJIS)('accepts the Telegram dice emoji %s', (emoji) => {
		expect(validateSendDice({ chatId: '@playground', emoji })).toEqual({
			valid: true,
			errors: {}
		});
	});
});

describe('prepareSendDice', () => {
	it('defaults to the standard die and trims the chat ID', () => {
		expect(prepareSendDice({ chatId: '  -100123  ' })).toEqual({
			ok: true,
			request: {
				method: 'sendDice',
				body: { chat_id: '-100123', emoji: '🎲' }
			}
		});
	});

	it.each(TELEGRAM_DICE_EMOJIS)('prepares a request for %s', (emoji) => {
		const result = prepareSendDice({ chatId: '@channel', emoji });

		expect(result).toEqual({
			ok: true,
			request: {
				method: 'sendDice',
				body: { chat_id: '@channel', emoji }
			}
		});
	});

	it('includes reply markup without changing it', () => {
		const replyMarkup: TelegramReplyMarkup = {
			inline_keyboard: [[{ text: 'Open', url: 'https://example.com' }]]
		};
		const result = prepareSendDice({ chatId: '42', emoji: '🎯', replyMarkup });

		expect(result).toEqual({
			ok: true,
			request: {
				method: 'sendDice',
				body: { chat_id: '42', emoji: '🎯', reply_markup: replyMarkup }
			}
		});
	});

	it('returns only safe validation errors', () => {
		const secretLikeChatId = '123456:secret-token-like-chat';
		const result = prepareSendDice({ chatId: '', emoji: secretLikeChatId });

		expect(result).toEqual({
			ok: false,
			errors: {
				chatId: 'Enter a chat ID or channel username.',
				emoji: 'Choose a supported Telegram dice emoji.'
			}
		});
		expect(JSON.stringify(result)).not.toContain(secretLikeChatId);
	});

	it('supports the emoji union type', () => {
		const emoji: TelegramDiceEmoji = '🎰';
		expect(prepareSendDice({ chatId: '42', emoji }).ok).toBe(true);
	});
});
