export interface TelegramApiSuccess<T> {
	ok: true;
	result: T;
}

export interface TelegramApiFailure {
	ok: false;
	error_code?: number;
	description?: string;
}

export type TelegramApiResponse<T> = TelegramApiSuccess<T> | TelegramApiFailure;

export interface TelegramUser {
	id: number;
	is_bot: boolean;
	first_name: string;
	last_name?: string;
	username?: string;
	can_join_groups?: boolean;
	can_read_all_group_messages?: boolean;
	supports_inline_queries?: boolean;
}

export interface TelegramChat {
	id: number;
	type: 'private' | 'group' | 'supergroup' | 'channel' | string;
	title?: string;
	username?: string;
	first_name?: string;
	last_name?: string;
}

export interface TelegramMessage {
	message_id: number;
	date: number;
	chat: TelegramChat;
	from?: TelegramUser;
	text?: string;
	media_group_id?: string;
	poll?: TelegramPoll;
	dice?: TelegramDice;
}

export interface TelegramPollOption {
	text: string;
	voter_count: number;
}

export interface TelegramPoll {
	id: string;
	question: string;
	options: TelegramPollOption[];
	total_voter_count: number;
	is_closed: boolean;
	is_anonymous: boolean;
	type: 'regular' | 'quiz' | string;
	allows_multiple_answers: boolean;
	correct_option_ids?: number[];
	explanation?: string;
}

export interface TelegramDice {
	emoji: string;
	value: number;
}
