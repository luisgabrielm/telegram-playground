import type { NormalizedMessageOptions, TelegramParseMode } from '$lib/message-options';
import {
	appendMessageOptionsToFormData,
	appendMessageOptionsToJson
} from '$lib/server/message-options';

export const MEDIA_GROUP_MIN_ITEMS = 2;
export const MEDIA_GROUP_MAX_ITEMS = 10;
export const MEDIA_GROUP_CAPTION_MAX_LENGTH = 1024;

export type MediaGroupItemType = 'photo' | 'video' | 'audio' | 'document';

export type MediaGroupItemSource =
	| { kind: 'reference'; value: string }
	| { kind: 'upload'; file: Blob; filename?: string };

export interface SendMediaGroupItem {
	type: MediaGroupItemType;
	source: MediaGroupItemSource;
	caption?: string;
	parseMode?: TelegramParseMode | string;
}

export interface SendMediaGroupInput {
	chatId: string;
	items: SendMediaGroupItem[];
	messageOptions?: NormalizedMessageOptions;
}

export type MediaGroupFieldErrors = Record<string, string>;

type TelegramInputMedia = {
	type: MediaGroupItemType;
	media: string;
	caption?: string;
	parse_mode?: TelegramParseMode;
};

export type PreparedSendMediaGroupRequest =
	| {
			method: 'sendMediaGroup';
			encoding: 'json';
			body: { chat_id: string; media: TelegramInputMedia[] };
	  }
	| {
			method: 'sendMediaGroup';
			encoding: 'multipart';
			body: FormData;
	  };

export type PrepareSendMediaGroupResult =
	| { ok: true; request: PreparedSendMediaGroupRequest }
	| { ok: false; errors: MediaGroupFieldErrors };

const ITEM_TYPES = new Set<MediaGroupItemType>(['photo', 'video', 'audio', 'document']);

/**
 * Validates and builds Telegram's sendMediaGroup request. Form actions map the
 * parallel fields itemType, itemSourceType, itemReference and itemCaption into
 * SendMediaGroupItem values before calling this function. Uploads use indexed
 * itemFile.N fields so mixed reference/upload albums cannot misalign files.
 * Validation errors use the same field name plus a zero-based index, such as
 * itemCaption.1, so the matching album row can display it.
 */
export function prepareSendMediaGroup(input: SendMediaGroupInput): PrepareSendMediaGroupResult {
	const errors = validateSendMediaGroup(input);
	if (Object.keys(errors).length > 0) return { ok: false, errors };

	const chatId = input.chatId.trim();
	const hasUpload = input.items.some((item) => item.source.kind === 'upload');
	const media = input.items.map<TelegramInputMedia>((item, index) => ({
		type: item.type,
		media:
			item.source.kind === 'reference'
				? item.source.value.trim()
				: `attach://media_${index}`,
		...(item.caption?.trim() ? { caption: item.caption } : {}),
		...(item.caption?.trim() && isParseMode(item.parseMode) ? { parse_mode: item.parseMode } : {})
	}));

	if (!hasUpload) {
		return {
			ok: true,
			request: {
				method: 'sendMediaGroup',
				encoding: 'json',
				body: appendMessageOptionsToJson(
					{ chat_id: chatId, media },
					input.messageOptions ?? {},
					false
				)
			}
		};
	}

	const body = new FormData();
	body.set('chat_id', chatId);
	body.set('media', JSON.stringify(media));
	appendMessageOptionsToFormData(body, input.messageOptions ?? {}, false);
	input.items.forEach((item, index) => {
		if (item.source.kind !== 'upload') return;
		body.set(`media_${index}`, item.source.file, normalizedFilename(item.source.filename, item.type));
	});

	return {
		ok: true,
		request: { method: 'sendMediaGroup', encoding: 'multipart', body }
	};
}

export function validateSendMediaGroup(input: SendMediaGroupInput): MediaGroupFieldErrors {
	const errors: MediaGroupFieldErrors = {};

	if (!input.chatId.trim()) errors.chatId = 'Enter a chat ID or channel username.';
	if (input.items.length < MEDIA_GROUP_MIN_ITEMS || input.items.length > MEDIA_GROUP_MAX_ITEMS) {
		errors.items = `Add between ${MEDIA_GROUP_MIN_ITEMS} and ${MEDIA_GROUP_MAX_ITEMS} media items.`;
	}

	input.items.forEach((item, index) => {
		if (!ITEM_TYPES.has(item.type)) {
			errors[`itemType.${index}`] = 'Choose photo, video, audio, or document.';
		}

		if (item.source.kind === 'reference') {
			if (!item.source.value.trim()) {
				errors[`itemReference.${index}`] = 'Enter an HTTP URL or Telegram file ID.';
			}
		} else if (item.source.kind === 'upload') {
			validateUpload(item.source.file, item.type, index, errors);
		} else {
			errors[`itemFile.${index}`] = 'Choose a media source.';
		}

		if (!isParseMode(item.parseMode) && (item.caption?.length ?? 0) > MEDIA_GROUP_CAPTION_MAX_LENGTH) {
			errors[`itemCaption.${index}`] =
				`Captions can contain at most ${MEDIA_GROUP_CAPTION_MAX_LENGTH.toLocaleString()} characters.`;
		}
		if (item.parseMode && !isParseMode(item.parseMode)) {
			errors[`itemParseMode.${index}`] = 'Choose HTML or MarkdownV2.';
		}
	});

	const types = new Set(input.items.map((item) => item.type));
	if (types.has('audio') && types.size > 1) {
		errors.items = 'Audio albums can contain audio items only.';
	} else if (types.has('document') && types.size > 1) {
		errors.items = 'Document albums can contain document items only.';
	}

	return errors;
}

function isParseMode(value: string | undefined): value is TelegramParseMode {
	return value === 'HTML' || value === 'MarkdownV2';
}

function validateUpload(
	file: Blob,
	type: MediaGroupItemType,
	index: number,
	errors: MediaGroupFieldErrors
) {
	const field = `itemFile.${index}`;
	if (!(file instanceof Blob) || file.size === 0) {
		errors[field] = 'Choose a non-empty local file.';
		return;
	}

	if (!file.type || file.type === 'application/octet-stream' || type === 'document') return;
	const expectedMimePrefix = type === 'photo' ? 'image/' : `${type}/`;
	if (!file.type.startsWith(expectedMimePrefix)) {
		errors[field] = `Choose a ${type} file.`;
	}
}

function normalizedFilename(filename: string | undefined, type: MediaGroupItemType) {
	return filename?.trim() || type;
}
