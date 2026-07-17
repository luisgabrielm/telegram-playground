import type { TelegramReplyMarkup } from '$lib/reply-markup';

export function restoreReplyMarkup(value: string | undefined): TelegramReplyMarkup | undefined {
	if (!value) return undefined;

	try {
		return JSON.parse(value) as TelegramReplyMarkup;
	} catch {
		return undefined;
	}
}

export function serializeReplyMarkup(value: TelegramReplyMarkup | undefined) {
	return value ? JSON.stringify(value) : '';
}
