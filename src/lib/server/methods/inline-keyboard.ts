import type { InlineKeyboardMarkup } from '$lib/reply-markup';

export type AnswerCallbackQueryInput = {
	callbackQueryId: string;
	text: string;
	showAlert: boolean;
	url: string;
	cacheTime: string;
};

export type AnswerCallbackQueryRequest = {
	callback_query_id: string;
	text?: string;
	show_alert?: true;
	url?: string;
	cache_time?: number;
};

export type EditMessageReplyMarkupInput = {
	chatId: string;
	messageId: string;
	inlineMessageId: string;
	replyMarkup?: InlineKeyboardMarkup;
};

export type EditMessageReplyMarkupRequest = {
	chat_id?: string;
	message_id?: number;
	inline_message_id?: string;
	reply_markup?: InlineKeyboardMarkup;
};

export type PreparedInlineKeyboardRequest<T> =
	| { ok: true; request: T }
	| { ok: false; errors: Record<string, string> };

export function prepareAnswerCallbackQuery(
	input: AnswerCallbackQueryInput
): PreparedInlineKeyboardRequest<AnswerCallbackQueryRequest> {
	const errors: Record<string, string> = {};
	const callbackQueryId = input.callbackQueryId.trim();
	const textLength = Array.from(input.text).length;
	const cacheTime = input.cacheTime.trim() ? Number(input.cacheTime) : undefined;

	if (!callbackQueryId) errors.callbackQueryId = 'Enter a callback query ID.';
	if (textLength > 200) errors.text = 'Must contain at most 200 characters.';
	if (input.url.trim()) {
		try {
			const url = new URL(input.url);
			if (!['http:', 'https:', 'tg:'].includes(url.protocol)) throw new Error();
		} catch {
			errors.url = 'Enter a valid HTTP, HTTPS, or tg:// URL.';
		}
	}
	if (
		cacheTime !== undefined &&
		(!Number.isSafeInteger(cacheTime) || cacheTime < 0)
	) {
		errors.cacheTime = 'Enter a non-negative whole number.';
	}

	if (Object.keys(errors).length) return { ok: false, errors };

	return {
		ok: true,
		request: {
			callback_query_id: callbackQueryId,
			...(input.text ? { text: input.text } : {}),
			...(input.showAlert ? { show_alert: true as const } : {}),
			...(input.url.trim() ? { url: input.url.trim() } : {}),
			...(cacheTime === undefined ? {} : { cache_time: cacheTime })
		}
	};
}

export function prepareEditMessageReplyMarkup(
	input: EditMessageReplyMarkupInput
): PreparedInlineKeyboardRequest<EditMessageReplyMarkupRequest> {
	const errors: Record<string, string> = {};
	const chatId = input.chatId.trim();
	const inlineMessageId = input.inlineMessageId.trim();
	const messageId = input.messageId.trim() ? Number(input.messageId) : undefined;
	const hasChatTarget = Boolean(chatId || input.messageId.trim());

	if (inlineMessageId && hasChatTarget) {
		errors.target = 'Use either an inline message ID or a chat ID and message ID.';
	} else if (!inlineMessageId) {
		if (!chatId) errors.chatId = 'Enter a chat ID.';
		if (messageId === undefined) errors.messageId = 'Enter a message ID.';
		else if (!Number.isSafeInteger(messageId) || messageId <= 0) {
			errors.messageId = 'Enter a positive whole number.';
		}
	}

	if (Object.keys(errors).length) return { ok: false, errors };

	return {
		ok: true,
		request: {
			...(inlineMessageId
				? { inline_message_id: inlineMessageId }
				: { chat_id: chatId, message_id: messageId as number }),
			...(input.replyMarkup ? { reply_markup: input.replyMarkup } : {})
		}
	};
}
