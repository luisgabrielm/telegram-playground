import type { TelegramReplyMarkup } from '$lib/reply-markup';
import { TELEGRAM_THUMBNAIL_MAX_BYTES } from './audio';

export const TELEGRAM_ANIMATION_CAPTION_MAX_LENGTH = 1024;
export const TELEGRAM_ANIMATION_MAX_BYTES = 50 * 1024 * 1024;

export type TelegramAnimationSource =
	| { kind: 'reference'; value: string }
	| { kind: 'upload'; file: File };

export interface SendAnimationInput {
	chatId: string;
	animation: TelegramAnimationSource;
	caption?: string;
	duration?: number;
	width?: number;
	height?: number;
	thumbnail?: File;
	hasSpoiler?: boolean;
	replyMarkup?: TelegramReplyMarkup;
}

export interface SendAnimationFieldErrors {
	chatId?: string;
	animation?: string;
	caption?: string;
	duration?: string;
	width?: string;
	height?: string;
	thumbnail?: string;
}

export interface SendAnimationJsonBody {
	chat_id: string;
	animation: string;
	caption?: string;
	duration?: number;
	width?: number;
	height?: number;
	has_spoiler?: boolean;
	reply_markup?: TelegramReplyMarkup;
}

export type PreparedSendAnimationRequest =
	| { method: 'sendAnimation'; encoding: 'json'; body: SendAnimationJsonBody }
	| { method: 'sendAnimation'; encoding: 'multipart'; body: FormData };

export type SendAnimationPreparation =
	| { ok: false; errors: SendAnimationFieldErrors }
	| { ok: true; request: PreparedSendAnimationRequest };

export function validateSendAnimation(input: SendAnimationInput) {
	const errors: SendAnimationFieldErrors = {};
	if (!input.chatId.trim()) errors.chatId = 'Enter a chat ID or channel username.';

	if (input.animation.kind === 'reference') {
		if (!input.animation.value.trim()) errors.animation = 'Enter a Telegram file ID or HTTP URL.';
	} else if (input.animation.file.size === 0) {
		errors.animation = 'Choose an animation file that is not empty.';
	} else if (input.animation.file.size > TELEGRAM_ANIMATION_MAX_BYTES) {
		errors.animation = 'Animation uploads can contain at most 50 MB.';
	}

	if ((input.caption?.length ?? 0) > TELEGRAM_ANIMATION_CAPTION_MAX_LENGTH) {
		errors.caption = `Captions can contain at most ${TELEGRAM_ANIMATION_CAPTION_MAX_LENGTH.toLocaleString()} characters.`;
	}
	validateWholeNumber(input.duration, 'duration', errors, true);
	validateWholeNumber(input.width, 'width', errors);
	validateWholeNumber(input.height, 'height', errors);

	if (input.thumbnail) {
		if (input.animation.kind !== 'upload') {
			errors.thumbnail = 'A thumbnail can only be used with a local animation upload.';
		} else if (input.thumbnail.size === 0) {
			errors.thumbnail = 'Choose a thumbnail that is not empty.';
		} else if (input.thumbnail.size >= TELEGRAM_THUMBNAIL_MAX_BYTES) {
			errors.thumbnail = 'Thumbnail uploads must be smaller than 200 kB.';
		} else if (input.thumbnail.type && input.thumbnail.type !== 'image/jpeg') {
			errors.thumbnail = 'Choose a JPEG thumbnail.';
		}
	}

	return { valid: Object.keys(errors).length === 0, errors };
}

export function prepareSendAnimation(input: SendAnimationInput): SendAnimationPreparation {
	const validation = validateSendAnimation(input);
	if (!validation.valid) return { ok: false, errors: validation.errors };
	const caption = input.caption?.trim() ? input.caption : undefined;

	if (input.animation.kind === 'reference') {
		return {
			ok: true,
			request: {
				method: 'sendAnimation',
				encoding: 'json',
				body: {
					chat_id: input.chatId.trim(),
					animation: input.animation.value.trim(),
					...(caption ? { caption } : {}),
					...(input.duration === undefined ? {} : { duration: input.duration }),
					...(input.width === undefined ? {} : { width: input.width }),
					...(input.height === undefined ? {} : { height: input.height }),
					...(input.hasSpoiler ? { has_spoiler: true } : {}),
					...(input.replyMarkup ? { reply_markup: input.replyMarkup } : {})
				}
			}
		};
	}

	const body = new FormData();
	body.set('chat_id', input.chatId.trim());
	body.set('animation', input.animation.file);
	if (caption) body.set('caption', caption);
	if (input.duration !== undefined) body.set('duration', String(input.duration));
	if (input.width !== undefined) body.set('width', String(input.width));
	if (input.height !== undefined) body.set('height', String(input.height));
	if (input.thumbnail) body.set('thumbnail', input.thumbnail);
	if (input.hasSpoiler) body.set('has_spoiler', 'true');
	if (input.replyMarkup) body.set('reply_markup', JSON.stringify(input.replyMarkup));

	return { ok: true, request: { method: 'sendAnimation', encoding: 'multipart', body } };
}

function validateWholeNumber(
	value: number | undefined,
	field: 'duration' | 'width' | 'height',
	errors: SendAnimationFieldErrors,
	allowZero = false
) {
	if (value === undefined) return;
	if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
		errors[field] = allowZero
			? 'Enter a non-negative whole number.'
			: 'Enter a positive whole number.';
	}
}
