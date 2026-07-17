import type { TelegramReplyMarkup } from '$lib/reply-markup';
import { TELEGRAM_VIDEO_THUMBNAIL_MAX_BYTES } from './video';

export const TELEGRAM_VIDEO_NOTE_MAX_BYTES = 50 * 1024 * 1024;
export const TELEGRAM_VIDEO_NOTE_MAX_DURATION = 60;

export type TelegramVideoNoteSource =
	| { kind: 'reference'; value: string }
	| { kind: 'upload'; file: File };

export interface SendVideoNoteInput {
	chatId: string;
	videoNote: TelegramVideoNoteSource;
	duration?: number;
	length?: number;
	thumbnail?: File;
	replyMarkup?: TelegramReplyMarkup;
}

export interface SendVideoNoteFieldErrors {
	chatId?: string;
	videoNote?: string;
	duration?: string;
	length?: string;
	thumbnail?: string;
}

export type PreparedSendVideoNoteRequest =
	| {
			method: 'sendVideoNote';
			encoding: 'json';
			body: {
				chat_id: string;
				video_note: string;
				duration?: number;
				length?: number;
				reply_markup?: TelegramReplyMarkup;
			};
	  }
	| { method: 'sendVideoNote'; encoding: 'multipart'; body: FormData };

export type SendVideoNotePreparation =
	| { ok: false; errors: SendVideoNoteFieldErrors }
	| { ok: true; request: PreparedSendVideoNoteRequest };

export function validateSendVideoNote(input: SendVideoNoteInput) {
	const errors: SendVideoNoteFieldErrors = {};

	if (!input.chatId.trim()) errors.chatId = 'Enter a chat ID or channel username.';

	if (input.videoNote.kind === 'reference') {
		const reference = input.videoNote.value.trim();
		if (!reference) {
			errors.videoNote = 'Enter a Telegram video note file ID.';
		} else if (/^https?:\/\//i.test(reference)) {
			errors.videoNote = 'Telegram does not support sending video notes by URL.';
		}
	} else if (input.videoNote.file.size === 0) {
		errors.videoNote = 'Choose a non-empty MPEG-4 video note.';
	} else if (input.videoNote.file.size > TELEGRAM_VIDEO_NOTE_MAX_BYTES) {
		errors.videoNote = 'Video note uploads can contain at most 50 MB.';
	} else if (input.videoNote.file.type && input.videoNote.file.type !== 'video/mp4') {
		errors.videoNote = 'Choose an MPEG-4 video file.';
	}

	if (
		input.duration !== undefined &&
		(!Number.isSafeInteger(input.duration) || input.duration < 0 || input.duration > 60)
	) {
		errors.duration = 'Enter a whole number from 0 to 60 seconds.';
	}
	if (input.length !== undefined && (!Number.isSafeInteger(input.length) || input.length <= 0)) {
		errors.length = 'Enter a positive whole-number diameter.';
	}

	if (input.thumbnail) {
		if (input.videoNote.kind !== 'upload') {
			errors.thumbnail = 'A custom thumbnail is only used with an uploaded video note.';
		} else if (input.thumbnail.size === 0) {
			errors.thumbnail = 'Choose a non-empty JPEG thumbnail.';
		} else if (input.thumbnail.size >= TELEGRAM_VIDEO_THUMBNAIL_MAX_BYTES) {
			errors.thumbnail = 'Thumbnails must be smaller than 200 kB.';
		} else if (input.thumbnail.type && input.thumbnail.type !== 'image/jpeg') {
			errors.thumbnail = 'Choose a JPEG thumbnail.';
		}
	}

	return { valid: Object.keys(errors).length === 0, errors };
}

export function prepareSendVideoNote(input: SendVideoNoteInput): SendVideoNotePreparation {
	const validation = validateSendVideoNote(input);
	if (!validation.valid) return { ok: false, errors: validation.errors };

	const common = {
		...(input.duration === undefined ? {} : { duration: input.duration }),
		...(input.length === undefined ? {} : { length: input.length })
	};

	if (input.videoNote.kind === 'reference') {
		return {
			ok: true,
			request: {
				method: 'sendVideoNote',
				encoding: 'json',
				body: {
					chat_id: input.chatId.trim(),
					video_note: input.videoNote.value.trim(),
					...common,
					...(input.replyMarkup ? { reply_markup: input.replyMarkup } : {})
				}
			}
		};
	}

	const body = new FormData();
	body.set('chat_id', input.chatId.trim());
	body.set('video_note', input.videoNote.file);
	for (const [key, value] of Object.entries(common)) body.set(key, String(value));
	if (input.thumbnail) body.set('thumbnail', input.thumbnail);
	if (input.replyMarkup) body.set('reply_markup', JSON.stringify(input.replyMarkup));

	return { ok: true, request: { method: 'sendVideoNote', encoding: 'multipart', body } };
}
