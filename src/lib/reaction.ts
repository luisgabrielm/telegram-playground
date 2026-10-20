export const TELEGRAM_REACTION_EMOJIS = [
	'👍', '👎', '❤', '🔥', '🥰', '👏', '😁', '🤔', '🤯', '😱', '🤬', '😢', '🎉', '🤩',
	'🤮', '💩', '🙏', '👌', '🕊', '🤡', '🥱', '🥴', '😍', '🐳', '❤‍🔥', '🌚', '🌭', '💯',
	'🤣', '⚡', '🍌', '🏆', '💔', '🤨', '😐', '🍓', '🍾', '💋', '🖕', '😈', '😴', '😭',
	'🤓', '👻', '👨‍💻', '👀', '🎃', '🙈', '😇', '😨', '🤝', '✍', '🤗', '🫡', '🎅', '🎄',
	'☃', '💅', '🤪', '🗿', '🆒', '💘', '🙉', '🦄', '😘', '💊', '🙊', '😎', '👾', '🤷‍♂',
	'🤷', '🤷‍♀', '😡'
] as const;

export type TelegramReactionEmoji = (typeof TELEGRAM_REACTION_EMOJIS)[number];
export type ReactionKind = 'none' | 'emoji' | 'custom_emoji';
export type TelegramReactionMode = ReactionKind;

export type TelegramReactionType =
	| { type: 'emoji'; emoji: TelegramReactionEmoji }
	| { type: 'custom_emoji'; custom_emoji_id: string };

export function isTelegramReactionEmoji(value: string): value is TelegramReactionEmoji {
	return TELEGRAM_REACTION_EMOJIS.some((emoji) => emoji === value);
}
