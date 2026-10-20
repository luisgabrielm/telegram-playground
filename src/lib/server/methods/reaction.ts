import {
	isTelegramReactionEmoji,
	type ReactionKind,
	type TelegramReactionEmoji,
	type TelegramReactionMode,
	type TelegramReactionType
} from '$lib/reaction';
export { TELEGRAM_REACTION_EMOJIS, isTelegramReactionEmoji } from '$lib/reaction';
export type { ReactionKind, TelegramReactionEmoji, TelegramReactionMode, TelegramReactionType } from '$lib/reaction';

export interface SetMessageReactionInput {
	chatId: string;
	messageId: string | number;
	reactionKind: ReactionKind | string;
	emoji?: string;
	customEmojiId?: string;
	isBig?: boolean;
}

export interface SetMessageReactionFieldErrors {
	chatId?: string;
	messageId?: string;
	reactionKind?: string;
	emoji?: string;
	customEmojiId?: string;
}

export interface SetMessageReactionBody {
	chat_id: string;
	message_id: number;
	reaction: TelegramReactionType[];
	is_big?: true;
}

export interface SetMessageReactionRequest {
	method: 'setMessageReaction';
	body: SetMessageReactionBody;
}

export type SetMessageReactionPreparation =
	| { ok: false; errors: Record<string, string> }
	| { ok: true; request: SetMessageReactionRequest };

export function validateSetMessageReaction(input: SetMessageReactionInput) {
	const errors: SetMessageReactionFieldErrors = {};

	if (!input.chatId.trim()) errors.chatId = 'Enter a chat ID or channel username.';
	if (parsePositiveInteger(input.messageId) === null) {
		errors.messageId = 'Message ID must be a positive whole number.';
	}

	if (!isReactionMode(input.reactionKind)) {
		errors.reactionKind = 'Choose remove, standard emoji, or custom emoji.';
	} else if (input.reactionKind === 'emoji') {
		if (!isTelegramReactionEmoji(input.emoji ?? '')) {
			errors.emoji = 'Choose a standard reaction supported by Telegram.';
		}
	} else if (input.reactionKind === 'custom_emoji' && !input.customEmojiId?.trim()) {
		errors.customEmojiId = 'Enter a custom emoji ID.';
	}

	return { valid: Object.keys(errors).length === 0, errors };
}

export function prepareSetMessageReaction(
	input: SetMessageReactionInput
): SetMessageReactionPreparation {
	const validation = validateSetMessageReaction(input);
	if (!validation.valid) return { ok: false, errors: { ...validation.errors } };

	const messageId = parsePositiveInteger(input.messageId);
	if (messageId === null || !isReactionMode(input.reactionKind)) {
		return { ok: false, errors: { ...validation.errors } };
	}

	const reaction = buildReaction(input);
	if (reaction === null) {
		return input.reactionKind === 'emoji'
			? { ok: false, errors: { emoji: 'Choose a standard reaction supported by Telegram.' } }
			: { ok: false, errors: { customEmojiId: 'Enter a custom emoji ID.' } };
	}

	return {
		ok: true,
		request: {
			method: 'setMessageReaction',
			body: {
				chat_id: input.chatId.trim(),
				message_id: messageId,
				reaction,
				...(input.isBig ? { is_big: true as const } : {})
			}
		}
	};
}

function isReactionMode(value: string): value is TelegramReactionMode {
	return value === 'none' || value === 'emoji' || value === 'custom_emoji';
}

function buildReaction(input: SetMessageReactionInput): TelegramReactionType[] | null {
	if (input.reactionKind === 'none') return [];
	if (input.reactionKind === 'emoji') {
		return isTelegramReactionEmoji(input.emoji ?? '')
			? [{ type: 'emoji', emoji: input.emoji as TelegramReactionEmoji }]
			: null;
	}
	if (input.reactionKind === 'custom_emoji') {
		const customEmojiId = input.customEmojiId?.trim();
		return customEmojiId ? [{ type: 'custom_emoji', custom_emoji_id: customEmojiId }] : null;
	}
	return null;
}

function parsePositiveInteger(value: string | number): number | null {
	if (typeof value === 'string' && !value.trim()) return null;
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
