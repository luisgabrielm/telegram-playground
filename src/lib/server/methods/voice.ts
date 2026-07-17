import type { TelegramReplyMarkup } from '$lib/reply-markup';

export const TELEGRAM_VOICE_CAPTION_MAX_LENGTH = 1024;
export const TELEGRAM_VOICE_MAX_BYTES = 50 * 1024 * 1024;

export type TelegramVoiceSource =
	| { kind: 'reference'; value: string }
	| { kind: 'upload'; file: File };

export interface SendVoiceInput {
	chatId: string;
	voice: TelegramVoiceSource;
	caption?: string;
	duration?: number;
	replyMarkup?: TelegramReplyMarkup;
}

export interface SendVoiceFieldErrors {
	chatId?: string;
	voice?: string;
	caption?: string;
	duration?: string;
}

export interface TelegramVoice {
	file_id: string;
	file_unique_id: string;
	duration: number;
	mime_type?: string;
	file_size?: number;
}

export interface TelegramVoiceMessage {
	message_id: number;
	date: number;
	chat: {
		id: number;
		type: string;
		title?: string;
		username?: string;
		first_name?: string;
		last_name?: string;
	};
	voice: TelegramVoice;
	caption?: string;
}

export interface SendVoiceJsonBody {
	chat_id: string;
	voice: string;
	caption?: string;
	duration?: number;
	reply_markup?: TelegramReplyMarkup;
}

export type PreparedSendVoiceRequest =
	| {
			method: 'sendVoice';
			encoding: 'json';
			body: SendVoiceJsonBody;
	  }
	| {
			method: 'sendVoice';
			encoding: 'multipart';
			body: FormData;
	  };

export type SendVoicePreparation =
	| { ok: false; errors: SendVoiceFieldErrors }
	| { ok: true; request: PreparedSendVoiceRequest };

export function validateSendVoice(input: SendVoiceInput) {
	const errors: SendVoiceFieldErrors = {};

	if (!input.chatId.trim()) {
		errors.chatId = 'Enter a chat ID or channel username.';
	}

	if (input.voice.kind === 'reference') {
		if (!input.voice.value.trim()) {
			errors.voice = 'Enter a Telegram file ID or HTTP URL.';
		}
	} else if (input.voice.file.size === 0) {
		errors.voice = 'Choose a voice file that is not empty.';
	} else if (input.voice.file.size > TELEGRAM_VOICE_MAX_BYTES) {
		errors.voice = 'Voice uploads can contain at most 50 MB.';
	}

	if ((input.caption?.length ?? 0) > TELEGRAM_VOICE_CAPTION_MAX_LENGTH) {
		errors.caption = `Captions can contain at most ${TELEGRAM_VOICE_CAPTION_MAX_LENGTH.toLocaleString()} characters.`;
	}

	if (
		input.duration !== undefined &&
		(!Number.isSafeInteger(input.duration) || input.duration < 0)
	) {
		errors.duration = 'Enter a non-negative whole number of seconds.';
	}

	return {
		valid: Object.keys(errors).length === 0,
		errors
	};
}

/**
 * Produces a payload for the shared Telegram transport. File IDs and URLs use
 * JSON; local files use multipart/form-data and retain their filename and MIME
 * type by adding the original File object directly to the form data.
 */
export function prepareSendVoice(input: SendVoiceInput): SendVoicePreparation {
	const validation = validateSendVoice(input);

	if (!validation.valid) {
		return { ok: false, errors: validation.errors };
	}

	const chatId = input.chatId.trim();
	const caption = input.caption?.trim() ? input.caption : undefined;

	if (input.voice.kind === 'reference') {
		return {
			ok: true,
			request: {
				method: 'sendVoice',
				encoding: 'json',
				body: {
					chat_id: chatId,
					voice: input.voice.value.trim(),
					...(caption === undefined ? {} : { caption }),
					...(input.duration === undefined ? {} : { duration: input.duration }),
					...(input.replyMarkup === undefined ? {} : { reply_markup: input.replyMarkup })
				}
			}
		};
	}

	const body = new FormData();
	body.set('chat_id', chatId);
	body.set('voice', input.voice.file);

	if (caption !== undefined) {
		body.set('caption', caption);
	}

	if (input.duration !== undefined) {
		body.set('duration', String(input.duration));
	}
	if (input.replyMarkup !== undefined) {
		body.set('reply_markup', JSON.stringify(input.replyMarkup));
	}

	return {
		ok: true,
		request: {
			method: 'sendVoice',
			encoding: 'multipart',
			body
		}
	};
}
