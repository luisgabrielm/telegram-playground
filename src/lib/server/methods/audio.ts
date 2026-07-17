import type { TelegramReplyMarkup } from '$lib/reply-markup';

export const TELEGRAM_AUDIO_CAPTION_MAX_LENGTH = 1024;
export const TELEGRAM_AUDIO_MAX_BYTES = 50 * 1024 * 1024;
export const TELEGRAM_THUMBNAIL_MAX_BYTES = 200 * 1024;

export type TelegramAudioSource =
	| { kind: 'reference'; value: string }
	| { kind: 'upload'; file: File };

export interface SendAudioInput {
	chatId: string;
	audio: TelegramAudioSource;
	caption?: string;
	duration?: number;
	performer?: string;
	title?: string;
	thumbnail?: File;
	replyMarkup?: TelegramReplyMarkup;
}

export interface SendAudioFieldErrors {
	chatId?: string;
	audio?: string;
	caption?: string;
	duration?: string;
	thumbnail?: string;
}

export interface SendAudioJsonBody {
	chat_id: string;
	audio: string;
	caption?: string;
	duration?: number;
	performer?: string;
	title?: string;
	reply_markup?: TelegramReplyMarkup;
}

export type PreparedSendAudioRequest =
	| { method: 'sendAudio'; encoding: 'json'; body: SendAudioJsonBody }
	| { method: 'sendAudio'; encoding: 'multipart'; body: FormData };

export type SendAudioPreparation =
	| { ok: false; errors: SendAudioFieldErrors }
	| { ok: true; request: PreparedSendAudioRequest };

export function validateSendAudio(input: SendAudioInput) {
	const errors: SendAudioFieldErrors = {};

	if (!input.chatId.trim()) errors.chatId = 'Enter a chat ID or channel username.';

	if (input.audio.kind === 'reference') {
		if (!input.audio.value.trim()) errors.audio = 'Enter a Telegram file ID or HTTP URL.';
	} else if (input.audio.file.size === 0) {
		errors.audio = 'Choose an audio file that is not empty.';
	} else if (input.audio.file.size > TELEGRAM_AUDIO_MAX_BYTES) {
		errors.audio = 'Audio uploads can contain at most 50 MB.';
	}

	if ((input.caption?.length ?? 0) > TELEGRAM_AUDIO_CAPTION_MAX_LENGTH) {
		errors.caption = `Captions can contain at most ${TELEGRAM_AUDIO_CAPTION_MAX_LENGTH.toLocaleString()} characters.`;
	}
	if (input.duration !== undefined && (!Number.isSafeInteger(input.duration) || input.duration < 0)) {
		errors.duration = 'Enter a non-negative whole number of seconds.';
	}
	if (input.thumbnail) {
		if (input.audio.kind !== 'upload') {
			errors.thumbnail = 'A thumbnail can only be used with a local audio upload.';
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

export function prepareSendAudio(input: SendAudioInput): SendAudioPreparation {
	const validation = validateSendAudio(input);
	if (!validation.valid) return { ok: false, errors: validation.errors };

	const common = {
		caption: optionalText(input.caption),
		performer: optionalText(input.performer),
		title: optionalText(input.title)
	};

	if (input.audio.kind === 'reference') {
		return {
			ok: true,
			request: {
				method: 'sendAudio',
				encoding: 'json',
				body: {
					chat_id: input.chatId.trim(),
					audio: input.audio.value.trim(),
					...(common.caption ? { caption: common.caption } : {}),
					...(input.duration === undefined ? {} : { duration: input.duration }),
					...(common.performer ? { performer: common.performer } : {}),
					...(common.title ? { title: common.title } : {}),
					...(input.replyMarkup ? { reply_markup: input.replyMarkup } : {})
				}
			}
		};
	}

	const body = new FormData();
	body.set('chat_id', input.chatId.trim());
	body.set('audio', input.audio.file);
	setOptional(body, 'caption', common.caption);
	if (input.duration !== undefined) body.set('duration', String(input.duration));
	setOptional(body, 'performer', common.performer);
	setOptional(body, 'title', common.title);
	if (input.thumbnail) body.set('thumbnail', input.thumbnail);
	if (input.replyMarkup) body.set('reply_markup', JSON.stringify(input.replyMarkup));

	return { ok: true, request: { method: 'sendAudio', encoding: 'multipart', body } };
}

function optionalText(value: string | undefined) {
	return value?.trim() ? value.trim() : undefined;
}

function setOptional(body: FormData, name: string, value: string | undefined) {
	if (value !== undefined) body.set(name, value);
}
