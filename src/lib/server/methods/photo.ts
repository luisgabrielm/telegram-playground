import type { TelegramReplyMarkup } from '$lib/reply-markup';

export const TELEGRAM_PHOTO_CAPTION_MAX_LENGTH = 1024;
export const TELEGRAM_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export type TelegramPhotoSource =
	| { kind: 'reference'; value: string }
	| { kind: 'upload'; file: Blob; filename?: string };

export interface SendPhotoInput {
	chatId: string;
	photo: TelegramPhotoSource;
	caption?: string;
	hasSpoiler?: boolean;
	replyMarkup?: TelegramReplyMarkup;
}

export interface SendPhotoFieldErrors {
	chatId?: string;
	photo?: string;
	caption?: string;
}

export interface TelegramPhotoSize {
	file_id: string;
	file_unique_id: string;
	width: number;
	height: number;
	file_size?: number;
}

export interface TelegramPhotoMessage {
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
	photo: TelegramPhotoSize[];
	caption?: string;
}

export type PreparedSendPhotoRequest =
	| {
			method: 'sendPhoto';
			encoding: 'json';
			body: {
				chat_id: string;
				photo: string;
				caption?: string;
				has_spoiler?: boolean;
				reply_markup?: TelegramReplyMarkup;
			};
	  }
	| {
			method: 'sendPhoto';
			encoding: 'multipart';
			body: FormData;
	  };

export class SendPhotoValidationError extends Error {
	readonly errors: SendPhotoFieldErrors;

	constructor(errors: SendPhotoFieldErrors) {
		super('Correct the highlighted photo fields and try again.');
		this.name = 'SendPhotoValidationError';
		this.errors = errors;
	}
}

export function validateSendPhoto(input: SendPhotoInput) {
	const errors: SendPhotoFieldErrors = {};

	if (!input.chatId.trim()) {
		errors.chatId = 'Enter a chat ID or channel username.';
	}

	if (input.photo.kind === 'reference') {
		if (!input.photo.value.trim()) {
			errors.photo = 'Enter a Telegram file ID or an HTTP URL.';
		}
	} else {
		if (input.photo.file.size === 0) {
			errors.photo = 'Choose a non-empty photo file.';
		} else if (input.photo.file.size > TELEGRAM_PHOTO_MAX_BYTES) {
			errors.photo = 'Photos can be at most 10 MB.';
		} else if (input.photo.file.type && !input.photo.file.type.startsWith('image/')) {
			errors.photo = 'Choose an image file.';
		}
	}

	if ((input.caption?.length ?? 0) > TELEGRAM_PHOTO_CAPTION_MAX_LENGTH) {
		errors.caption = `Captions can contain at most ${TELEGRAM_PHOTO_CAPTION_MAX_LENGTH.toLocaleString()} characters.`;
	}

	return {
		valid: Object.keys(errors).length === 0,
		errors
	};
}

/**
 * Builds the payload consumed by the shared Telegram transport. References use
 * JSON, while local files use multipart/form-data and let the runtime generate
 * the boundary header.
 */
export function prepareSendPhotoRequest(input: SendPhotoInput): PreparedSendPhotoRequest {
	const validation = validateSendPhoto(input);

	if (!validation.valid) {
		throw new SendPhotoValidationError(validation.errors);
	}

	const chatId = input.chatId.trim();
	const caption = input.caption?.trim() ? input.caption : undefined;

	if (input.photo.kind === 'reference') {
		return {
			method: 'sendPhoto',
			encoding: 'json',
			body: {
				chat_id: chatId,
				photo: input.photo.value.trim(),
				...(caption === undefined ? {} : { caption }),
				...(input.hasSpoiler ? { has_spoiler: true } : {}),
				...(input.replyMarkup === undefined ? {} : { reply_markup: input.replyMarkup })
			}
		};
	}

	const body = new FormData();
	body.set('chat_id', chatId);
	body.set('photo', input.photo.file, normalizedFilename(input.photo.filename));

	if (caption !== undefined) {
		body.set('caption', caption);
	}
	if (input.hasSpoiler) {
		body.set('has_spoiler', 'true');
	}
	if (input.replyMarkup !== undefined) {
		body.set('reply_markup', JSON.stringify(input.replyMarkup));
	}

	return {
		method: 'sendPhoto',
		encoding: 'multipart',
		body
	};
}

function normalizedFilename(filename: string | undefined) {
	return filename?.trim() || 'photo';
}
