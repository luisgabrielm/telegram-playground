import type { NormalizedMessageOptions, TelegramMessageOptionsPayload } from '$lib/message-options';
import type { TelegramReplyMarkup } from '$lib/reply-markup';
import { appendMessageOptionsToJson } from '$lib/server/message-options';
import { TELEGRAM_MESSAGE_MAX_LENGTH, type MessageFieldErrors } from '$lib/server/message-validation';

export interface SendMessageInput {
	chatId: string;
	text: string;
	replyMarkup?: TelegramReplyMarkup;
	messageOptions?: NormalizedMessageOptions;
}

export type PreparedSendMessageRequest = {
	method: 'sendMessage';
	encoding: 'json';
	body: {
		chat_id: string;
		text: string;
		reply_markup?: TelegramReplyMarkup;
	} & TelegramMessageOptionsPayload;
};

export type SendMessagePreparation =
	| { ok: false; errors: MessageFieldErrors }
	| { ok: true; request: PreparedSendMessageRequest };

export function prepareSendMessage(input: SendMessageInput): SendMessagePreparation {
	const errors: MessageFieldErrors = {};
	if (!input.chatId.trim()) errors.chatId = 'Enter a chat ID or channel username.';
	if (!input.text.trim()) {
		errors.text = 'Enter a message to send.';
	} else if (!input.messageOptions?.parseMode && input.text.length > TELEGRAM_MESSAGE_MAX_LENGTH) {
		errors.text = `Messages can contain at most ${TELEGRAM_MESSAGE_MAX_LENGTH.toLocaleString()} characters.`;
	}

	if (Object.keys(errors).length) return { ok: false, errors };

	return {
		ok: true,
		request: {
			method: 'sendMessage',
			encoding: 'json',
			body: appendMessageOptionsToJson(
				{
					chat_id: input.chatId.trim(),
					text: input.text,
					...(input.replyMarkup === undefined ? {} : { reply_markup: input.replyMarkup })
				},
				input.messageOptions ?? {}
			)
		}
	};
}
