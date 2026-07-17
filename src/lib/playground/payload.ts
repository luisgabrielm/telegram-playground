import type { TelegramReplyMarkup } from '$lib/reply-markup';
import type { InputRichBlock } from '$lib/rich-message';

export type PayloadEncoding = 'json' | 'multipart';

export type FilePayloadPreview = {
	$file: {
		name: string;
		type: string;
		size: number;
		last_modified: string;
	} | null;
};

export type MediaPayloadInput = {
	chatId: string;
	mediaName: 'photo' | 'document' | 'voice';
	sourceType: 'reference' | 'upload';
	mediaReference: string;
	file: File | null;
	caption: string;
	duration?: string;
	hasSpoiler?: boolean;
	replyMarkup?: TelegramReplyMarkup;
};

export function buildSendMessagePayload(
	chatId: string,
	text: string,
	replyMarkup?: TelegramReplyMarkup
) {
	return {
		chat_id: chatId.trim(),
		text,
		...(replyMarkup ? { reply_markup: replyMarkup } : {})
	};
}

export function buildAnswerCallbackQueryPayload(input: {
	callbackQueryId: string;
	text: string;
	showAlert: boolean;
	url: string;
	cacheTime: string;
}) {
	return compactPayload({
		callback_query_id: input.callbackQueryId.trim(),
		text: optionalText(input.text),
		show_alert: input.showAlert || undefined,
		url: optionalText(input.url),
		cache_time: optionalNumericPreview(input.cacheTime)
	});
}

export function buildEditMessageReplyMarkupPayload(input: {
	chatId: string;
	messageId: string;
	inlineMessageId: string;
	replyMarkup?: TelegramReplyMarkup;
}) {
	return compactPayload({
		chat_id: optionalText(input.chatId),
		message_id: optionalNumericPreview(input.messageId),
		inline_message_id: optionalText(input.inlineMessageId),
		reply_markup: input.replyMarkup
	});
}

export function buildSendRichMessagePayload(input: {
	chatId: string;
	blocks: InputRichBlock[];
	isRtl: boolean;
	skipEntityDetection: boolean;
	replyMarkup?: TelegramReplyMarkup;
}) {
	return {
		chat_id: input.chatId.trim(),
		rich_message: {
			blocks: input.blocks,
			...(input.isRtl ? { is_rtl: true } : {}),
			...(input.skipEntityDetection ? { skip_entity_detection: true } : {})
		},
		...(input.replyMarkup ? { reply_markup: input.replyMarkup } : {})
	};
}

export function buildMediaPayload(input: MediaPayloadInput): {
	encoding: PayloadEncoding;
	payload: Record<string, unknown>;
} {
	const encoding = input.sourceType === 'upload' ? 'multipart' : 'json';
	const media =
		input.sourceType === 'upload'
			? filePreview(input.file)
			: input.mediaReference.trim();
	const payload: Record<string, unknown> = {
		chat_id: input.chatId.trim(),
		[input.mediaName]: media
	};

	if (input.caption.trim()) payload.caption = input.caption;
	if (input.duration?.trim()) payload.duration = numericPreview(input.duration);
	if (input.hasSpoiler) payload.has_spoiler = true;
	if (input.replyMarkup) payload.reply_markup = input.replyMarkup;

	return { encoding, payload };
}

export function buildAudioAnimationPayload(input: {
	chatId: string;
	mediaName: 'audio' | 'animation';
	sourceType: 'reference' | 'upload';
	mediaReference: string;
	file: File | null;
	caption: string;
	duration: string | number;
	performer?: string;
	title?: string;
	width?: string | number;
	height?: string | number;
	thumbnailFile?: File | null;
	hasSpoiler?: boolean;
	replyMarkup?: TelegramReplyMarkup;
}): { encoding: PayloadEncoding; payload: Record<string, unknown> } {
	const encoding: PayloadEncoding = input.sourceType === 'upload' ? 'multipart' : 'json';
	const payload: Record<string, unknown> = {
		chat_id: input.chatId.trim(),
		[input.mediaName]:
			input.sourceType === 'upload' ? filePreview(input.file) : input.mediaReference.trim()
	};

	if (input.caption.trim()) payload.caption = input.caption;
	if (hasValue(input.duration)) payload.duration = numericPreview(input.duration);
	if (input.performer?.trim()) payload.performer = input.performer;
	if (input.title?.trim()) payload.title = input.title;
	if (hasValue(input.width)) payload.width = numericPreview(input.width);
	if (hasValue(input.height)) payload.height = numericPreview(input.height);
	if (input.thumbnailFile) payload.thumbnail = filePreview(input.thumbnailFile);
	if (input.hasSpoiler) payload.has_spoiler = true;
	if (input.replyMarkup) payload.reply_markup = input.replyMarkup;

	return { encoding, payload };
}

export type SendPollPayloadInput = {
	chatId: string;
	question: string;
	options: string[];
	type: 'regular' | 'quiz';
	isAnonymous: boolean;
	allowsMultipleAnswers: boolean;
	correctOptionIds: number[];
	explanation?: string;
	openPeriod?: string | number;
	replyMarkup?: TelegramReplyMarkup;
};

export function buildSendPollPayload(input: SendPollPayloadInput) {
	const payload: Record<string, unknown> = {
		chat_id: input.chatId.trim(),
		question: input.question,
		options: input.options.map((text) => ({ text })),
		type: input.type,
		is_anonymous: input.isAnonymous
	};

	if (input.type === 'regular' && input.allowsMultipleAnswers) {
		payload.allows_multiple_answers = true;
	}
	if (input.type === 'quiz' && input.correctOptionIds.length > 0) {
		payload.correct_option_ids = input.correctOptionIds;
	}
	if (input.type === 'quiz' && input.explanation?.trim()) payload.explanation = input.explanation;
	if (input.openPeriod !== undefined && String(input.openPeriod).trim()) {
		payload.open_period = numericPreview(String(input.openPeriod));
	}
	if (input.replyMarkup) payload.reply_markup = input.replyMarkup;

	return payload;
}

export const DICE_EMOJIS = ['🎲', '🎯', '🏀', '⚽', '🎳', '🎰'] as const;
export type DiceEmoji = (typeof DICE_EMOJIS)[number];

export function buildSendDicePayload(
	chatId: string,
	emoji: string,
	replyMarkup?: TelegramReplyMarkup
) {
	return {
		chat_id: chatId.trim(),
		emoji,
		...(replyMarkup ? { reply_markup: replyMarkup } : {})
	};
}

export function buildSendContactPayload(input: {
	chatId: string;
	phoneNumber: string;
	firstName: string;
	lastName: string;
	vcard: string;
	replyMarkup?: TelegramReplyMarkup;
}) {
	return {
		chat_id: input.chatId.trim(),
		phone_number: input.phoneNumber.trim(),
		first_name: input.firstName,
		...(input.lastName.trim() ? { last_name: input.lastName } : {}),
		...(input.vcard.trim() ? { vcard: input.vcard } : {}),
		...(input.replyMarkup ? { reply_markup: input.replyMarkup } : {})
	};
}

export function buildSendLocationPayload(input: {
	chatId: string;
	latitude: string | number;
	longitude: string | number;
	horizontalAccuracy: string | number;
	livePeriod: string | number;
	heading: string | number;
	proximityAlertRadius: string | number;
	replyMarkup?: TelegramReplyMarkup;
}) {
	return compactPayload({
		chat_id: input.chatId.trim(),
		latitude: numericPreview(input.latitude),
		longitude: numericPreview(input.longitude),
		horizontal_accuracy: optionalNumericPreview(input.horizontalAccuracy),
		live_period: optionalNumericPreview(input.livePeriod),
		heading: optionalNumericPreview(input.heading),
		proximity_alert_radius: optionalNumericPreview(input.proximityAlertRadius),
		reply_markup: input.replyMarkup
	});
}

export function buildSendVenuePayload(input: {
	chatId: string;
	latitude: string | number;
	longitude: string | number;
	title: string;
	address: string;
	foursquareId: string;
	foursquareType: string;
	googlePlaceId: string;
	googlePlaceType: string;
	replyMarkup?: TelegramReplyMarkup;
}) {
	return compactPayload({
		chat_id: input.chatId.trim(),
		latitude: numericPreview(input.latitude),
		longitude: numericPreview(input.longitude),
		title: input.title,
		address: input.address,
		foursquare_id: optionalText(input.foursquareId),
		foursquare_type: optionalText(input.foursquareType),
		google_place_id: optionalText(input.googlePlaceId),
		google_place_type: optionalText(input.googlePlaceType),
		reply_markup: input.replyMarkup
	});
}

export type MediaGroupPayloadItem = {
	type: 'photo' | 'video' | 'audio' | 'document';
	sourceType: 'reference' | 'upload';
	reference: string;
	file: File | null;
	caption: string;
};

export function buildMediaGroupPayload(input: {
	chatId: string;
	items: MediaGroupPayloadItem[];
}): { encoding: PayloadEncoding; payload: Record<string, unknown> } {
	const encoding: PayloadEncoding = input.items.some((item) => item.sourceType === 'upload')
		? 'multipart'
		: 'json';
	const attachments: Record<string, FilePayloadPreview> = {};
	const media = input.items.map((item, index) => {
		const attachmentName = `media_${index}`;
		const mediaValue =
			item.sourceType === 'upload' ? `attach://${attachmentName}` : item.reference.trim();
		if (item.sourceType === 'upload') attachments[attachmentName] = filePreview(item.file);

		return {
			type: item.type,
			media: mediaValue,
			...(item.caption.trim() ? { caption: item.caption } : {})
		};
	});

	return {
		encoding,
		payload: {
			chat_id: input.chatId.trim(),
			media,
			...attachments
		}
	};
}

function filePreview(file: File | null): FilePayloadPreview {
	if (!file) return { $file: null };

	return {
		$file: {
			name: file.name,
			type: file.type || 'application/octet-stream',
			size: file.size,
			last_modified: new Date(file.lastModified).toISOString()
		}
	};
}

function numericPreview(value: string | number) {
	if (!hasValue(value)) return value;
	const number = Number(value);
	return Number.isFinite(number) ? number : value;
}

function optionalNumericPreview(value: string | number) {
	return hasValue(value) ? numericPreview(value) : undefined;
}

function optionalText(value: string) {
	return value.trim() || undefined;
}

function compactPayload(payload: Record<string, unknown>) {
	return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

function hasValue(value: string | number | undefined): value is string | number {
	return value !== undefined && (typeof value === 'number' || Boolean(value.trim()));
}
