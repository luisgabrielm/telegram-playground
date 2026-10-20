import type { TelegramReplyMarkup } from '$lib/reply-markup';
import type { NormalizedMessageOptions } from '$lib/message-options';
import { appendMessageOptionsToJson } from '$lib/server/message-options';

export const TELEGRAM_CONTACT_VCARD_MAX_BYTES = 2048;

export interface SendContactInput {
	chatId: string;
	phoneNumber: string;
	firstName: string;
	lastName?: string;
	vcard?: string;
	replyMarkup?: TelegramReplyMarkup;
	messageOptions?: NormalizedMessageOptions;
}

export interface SendContactBody {
	chat_id: string;
	phone_number: string;
	first_name: string;
	last_name?: string;
	vcard?: string;
	reply_markup?: TelegramReplyMarkup;
}

export type PreparedSendContact =
	| { ok: true; request: { method: 'sendContact'; body: SendContactBody } }
	| { ok: false; errors: Record<string, string> };

export function prepareSendContact(input: SendContactInput): PreparedSendContact {
	const errors: Record<string, string> = {};

	if (!input.chatId.trim()) errors.chatId = 'Enter a chat ID or channel username.';
	if (!input.phoneNumber.trim()) errors.phoneNumber = 'Enter the contact phone number.';
	if (!input.firstName.trim()) errors.firstName = 'Enter the contact first name.';
	if (input.vcard && new TextEncoder().encode(input.vcard).length > TELEGRAM_CONTACT_VCARD_MAX_BYTES) {
		errors.vcard = `vCards can contain at most ${TELEGRAM_CONTACT_VCARD_MAX_BYTES.toLocaleString()} UTF-8 bytes.`;
	}

	if (Object.keys(errors).length > 0) return { ok: false, errors };

	return {
		ok: true,
		request: {
			method: 'sendContact',
			body: appendMessageOptionsToJson({
				chat_id: input.chatId.trim(),
				phone_number: input.phoneNumber.trim(),
				first_name: input.firstName.trim(),
				...(input.lastName?.trim() ? { last_name: input.lastName.trim() } : {}),
				...(input.vcard?.trim() ? { vcard: input.vcard } : {}),
				...(input.replyMarkup === undefined ? {} : { reply_markup: input.replyMarkup })
			}, input.messageOptions ?? {}, false)
		}
	};
}
