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

function numericPreview(value: string) {
	const number = Number(value);
	return Number.isFinite(number) ? number : value;
}
