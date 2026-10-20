import type { TelegramReplyMarkup } from '$lib/reply-markup';
import type { NormalizedMessageOptions } from '$lib/message-options';
import { appendMessageOptionsToJson } from '$lib/server/message-options';

export const TELEGRAM_DICE_EMOJIS = ['🎲', '🎯', '🏀', '⚽', '🎳', '🎰'] as const;

export type TelegramDiceEmoji = (typeof TELEGRAM_DICE_EMOJIS)[number];

export interface SendDiceInput {
	chatId: string;
	emoji?: TelegramDiceEmoji | string;
	replyMarkup?: TelegramReplyMarkup;
	messageOptions?: NormalizedMessageOptions;
}

export interface SendDiceFieldErrors {
	chatId?: string;
	emoji?: string;
}

export interface SendDiceJsonBody {
	chat_id: string;
	emoji: TelegramDiceEmoji;
	reply_markup?: TelegramReplyMarkup;
}

export interface PreparedSendDiceRequest {
	method: 'sendDice';
	body: SendDiceJsonBody;
}

export type SendDicePreparation =
	| { ok: false; errors: Record<string, string> }
	| { ok: true; request: PreparedSendDiceRequest };

export function validateSendDice(input: SendDiceInput) {
	const errors: SendDiceFieldErrors = {};
	const emoji = input.emoji || '🎲';

	if (!input.chatId.trim()) {
		errors.chatId = 'Enter a chat ID or channel username.';
	}

	if (!isTelegramDiceEmoji(emoji)) {
		errors.emoji = 'Choose a supported Telegram dice emoji.';
	}

	return {
		valid: Object.keys(errors).length === 0,
		errors
	};
}

export function prepareSendDice(input: SendDiceInput): SendDicePreparation {
	const validation = validateSendDice(input);

	if (!validation.valid) {
		return { ok: false, errors: { ...validation.errors } };
	}

	const emoji = input.emoji || '🎲';
	if (!isTelegramDiceEmoji(emoji)) {
		return { ok: false, errors: { emoji: 'Choose a supported Telegram dice emoji.' } };
	}

	return {
		ok: true,
		request: {
			method: 'sendDice',
			body: appendMessageOptionsToJson({
				chat_id: input.chatId.trim(),
				emoji,
				...(input.replyMarkup === undefined ? {} : { reply_markup: input.replyMarkup })
			}, input.messageOptions ?? {}, false)
		}
	};
}

function isTelegramDiceEmoji(value: string): value is TelegramDiceEmoji {
	return TELEGRAM_DICE_EMOJIS.some((emoji) => emoji === value);
}
