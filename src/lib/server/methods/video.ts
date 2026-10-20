import type { TelegramReplyMarkup } from '$lib/reply-markup';
import type { NormalizedMessageOptions } from '$lib/message-options';
import {
	appendMessageOptionsToFormData,
	appendMessageOptionsToJson
} from '$lib/server/message-options';

export const TELEGRAM_VIDEO_CAPTION_MAX_LENGTH = 1024;
export const TELEGRAM_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const TELEGRAM_VIDEO_THUMBNAIL_MAX_BYTES = 200 * 1024;

export type TelegramVideoSource =
	| { kind: 'reference'; value: string }
	| { kind: 'upload'; file: File };

export interface SendVideoInput {
	chatId: string;
	video: TelegramVideoSource;
	caption?: string;
	duration?: number;
	width?: number;
	height?: number;
	thumbnail?: File;
	supportsStreaming?: boolean;
	hasSpoiler?: boolean;
	replyMarkup?: TelegramReplyMarkup;
	messageOptions?: NormalizedMessageOptions;
}

export interface SendVideoFieldErrors {
	chatId?: string;
	video?: string;
	caption?: string;
	duration?: string;
	width?: string;
	height?: string;
	thumbnail?: string;
}

export type PreparedSendVideoRequest =
	| {
			method: 'sendVideo';
			encoding: 'json';
			body: {
				chat_id: string;
				video: string;
				caption?: string;
				duration?: number;
				width?: number;
				height?: number;
				supports_streaming?: boolean;
				has_spoiler?: boolean;
				reply_markup?: TelegramReplyMarkup;
			};
	  }
	| { method: 'sendVideo'; encoding: 'multipart'; body: FormData };

export type SendVideoPreparation =
	| { ok: false; errors: SendVideoFieldErrors }
	| { ok: true; request: PreparedSendVideoRequest };

export function validateSendVideo(input: SendVideoInput) {
	const errors: SendVideoFieldErrors = {};

	if (!input.chatId.trim()) errors.chatId = 'Enter a chat ID or channel username.';

	if (input.video.kind === 'reference') {
		if (!input.video.value.trim()) errors.video = 'Enter a Telegram file ID or HTTP URL.';
	} else if (input.video.file.size === 0) {
		errors.video = 'Choose a non-empty MPEG-4 video.';
	} else if (input.video.file.size > TELEGRAM_VIDEO_MAX_BYTES) {
		errors.video = 'Video uploads can contain at most 50 MB.';
	} else if (input.video.file.type && input.video.file.type !== 'video/mp4') {
		errors.video = 'Choose an MPEG-4 video file.';
	}

	if (!input.messageOptions?.parseMode && (input.caption?.length ?? 0) > TELEGRAM_VIDEO_CAPTION_MAX_LENGTH) {
		errors.caption = 'Captions can contain at most 1,024 characters.';
	}

	validateOptionalWholeNumber(input.duration, 'duration', errors);
	validateOptionalWholeNumber(input.width, 'width', errors);
	validateOptionalWholeNumber(input.height, 'height', errors);

	if (input.thumbnail) {
		if (input.video.kind !== 'upload') {
			errors.thumbnail = 'A custom thumbnail is only used with an uploaded video.';
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

export function prepareSendVideo(input: SendVideoInput): SendVideoPreparation {
	const validation = validateSendVideo(input);
	if (!validation.valid) return { ok: false, errors: validation.errors };

	const common = {
		...(input.caption?.trim() ? { caption: input.caption } : {}),
		...(input.duration === undefined ? {} : { duration: input.duration }),
		...(input.width === undefined ? {} : { width: input.width }),
		...(input.height === undefined ? {} : { height: input.height }),
		...(input.supportsStreaming ? { supports_streaming: true } : {}),
		...(input.hasSpoiler ? { has_spoiler: true } : {})
	};

	if (input.video.kind === 'reference') {
		return {
			ok: true,
			request: {
				method: 'sendVideo',
				encoding: 'json',
				body: appendMessageOptionsToJson({
					chat_id: input.chatId.trim(),
					video: input.video.value.trim(),
					...common,
					...(input.replyMarkup ? { reply_markup: input.replyMarkup } : {})
				}, input.messageOptions ?? {})
			}
		};
	}

	const body = new FormData();
	body.set('chat_id', input.chatId.trim());
	body.set('video', input.video.file);
	appendMultipartValues(body, common);
	if (input.thumbnail) body.set('thumbnail', input.thumbnail);
	if (input.replyMarkup) body.set('reply_markup', JSON.stringify(input.replyMarkup));
	appendMessageOptionsToFormData(body, input.messageOptions ?? {});

	return { ok: true, request: { method: 'sendVideo', encoding: 'multipart', body } };
}

function validateOptionalWholeNumber(
	value: number | undefined,
	field: 'duration' | 'width' | 'height',
	errors: SendVideoFieldErrors
) {
	if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
		errors[field] = 'Enter a non-negative whole number.';
	}
}

function appendMultipartValues(body: FormData, values: Record<string, string | number | boolean>) {
	for (const [key, value] of Object.entries(values)) body.set(key, String(value));
}
