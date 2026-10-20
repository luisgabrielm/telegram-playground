export type InlineKeyboardButtonStyle = 'primary' | 'success' | 'danger';

export interface InlineKeyboardButtonAppearance {
	style?: InlineKeyboardButtonStyle;
	icon_custom_emoji_id?: string;
}

export interface InlineKeyboardUrlButton extends InlineKeyboardButtonAppearance {
	text: string;
	url: string;
}

export interface InlineKeyboardCopyTextButton extends InlineKeyboardButtonAppearance {
	text: string;
	copy_text: {
		text: string;
	};
}

export interface InlineKeyboardCallbackButton extends InlineKeyboardButtonAppearance {
	text: string;
	callback_data: string;
}

export type InlineKeyboardButton =
	| InlineKeyboardUrlButton
	| InlineKeyboardCopyTextButton
	| InlineKeyboardCallbackButton;

export interface InlineKeyboardMarkup {
	inline_keyboard: ReadonlyArray<ReadonlyArray<InlineKeyboardButton>>;
}

export interface ReplyKeyboardButton {
	text: string;
}

export interface ReplyKeyboardMarkup {
	keyboard: ReadonlyArray<ReadonlyArray<ReplyKeyboardButton>>;
	is_persistent?: boolean;
	resize_keyboard?: boolean;
	one_time_keyboard?: boolean;
	input_field_placeholder?: string;
}

export interface ReplyKeyboardRemove {
	remove_keyboard: true;
}

export interface ForceReply {
	force_reply: true;
	input_field_placeholder?: string;
}

export type TelegramReplyMarkup =
	| InlineKeyboardMarkup
	| ReplyKeyboardMarkup
	| ReplyKeyboardRemove
	| ForceReply;
