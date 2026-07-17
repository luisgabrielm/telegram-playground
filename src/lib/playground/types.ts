import type { Component } from 'svelte';
import type { TelegramApiFailure, TelegramApiSuccess, TelegramMessage, TelegramUser } from '$lib/telegram';

export type MethodId =
	| 'getMe'
	| 'sendMessage'
	| 'sendPhoto'
	| 'sendDocument'
	| 'sendVoice'
	| 'sendPoll'
	| 'sendDice'
	| 'sendMediaGroup'
	| 'sendRichMessage';

type FeedbackBase = {
	success: boolean;
	error?: string;
	response?: TelegramApiFailure;
};

export type GetMeFeedback = FeedbackBase & {
	action: 'getMe';
	response?: TelegramApiSuccess<TelegramUser> | TelegramApiFailure;
};

export type SendMessageFeedback = FeedbackBase & {
	action: 'sendMessage';
	response?: TelegramApiSuccess<TelegramMessage> | TelegramApiFailure;
	fields?: {
		chatId?: string;
		text?: string;
		replyMarkup?: string;
	};
	fieldErrors?: {
		chatId?: string;
		text?: string;
	};
	replyMarkupErrors?: Record<string, string>;
};

export type MediaAction = 'sendPhoto' | 'sendDocument' | 'sendVoice';

export type MediaFeedback = FeedbackBase & {
	action: MediaAction;
	response?: unknown;
	fields?: {
		chatId?: string;
		caption?: string;
		sourceType?: string;
		mediaReference?: string;
		duration?: string;
		hasSpoiler?: string;
		replyMarkup?: string;
	};
	fieldErrors?: {
		chatId?: string;
		photo?: string;
		document?: string;
		voice?: string;
		caption?: string;
		duration?: string;
	};
	replyMarkupErrors?: Record<string, string>;
};

export type PollFeedback = FeedbackBase & {
	action: 'sendPoll';
	response?: TelegramApiSuccess<TelegramMessage> | TelegramApiFailure;
	fields?: {
		chatId?: string;
		question?: string;
		options?: string[];
		type?: 'regular' | 'quiz';
		isAnonymous?: string;
		allowsMultipleAnswers?: string;
		correctOptionIds?: string[];
		explanation?: string;
		openPeriod?: string;
		replyMarkup?: string;
	};
	fieldErrors?: Record<string, string>;
	replyMarkupErrors?: Record<string, string>;
};

export type DiceFeedback = FeedbackBase & {
	action: 'sendDice';
	response?: TelegramApiSuccess<TelegramMessage> | TelegramApiFailure;
	fields?: {
		chatId?: string;
		emoji?: string;
		replyMarkup?: string;
	};
	fieldErrors?: Record<string, string>;
	replyMarkupErrors?: Record<string, string>;
};

export type MediaGroupFeedback = FeedbackBase & {
	action: 'sendMediaGroup';
	response?: TelegramApiSuccess<TelegramMessage[]> | TelegramApiFailure;
	fields?: {
		chatId?: string;
		itemType?: string[];
		itemSourceType?: string[];
		itemReference?: string[];
		itemCaption?: string[];
	};
	fieldErrors?: Record<string, string>;
};

export type RichMessageFeedback = FeedbackBase & {
	action: 'sendRichMessage';
	response?: TelegramApiSuccess<TelegramMessage> | TelegramApiFailure;
	fields?: {
		chatId?: string;
		blocks?: string;
		isRtl?: string;
		skipEntityDetection?: string;
		replyMarkup?: string;
	};
	fieldErrors?: Record<string, string>;
	replyMarkupErrors?: Record<string, string>;
};

export type MethodFeedback =
	| GetMeFeedback
	| SendMessageFeedback
	| MediaFeedback
	| PollFeedback
	| DiceFeedback
	| MediaGroupFeedback
	| RichMessageFeedback;

export type MethodComponentProps = {
	configured: boolean;
	initialFeedback: MethodFeedback | null;
};

export type PlaygroundMethod = {
	id: MethodId;
	label: string;
	apiMethod: string;
	group: 'Bot' | 'Messages';
	component: Component<MethodComponentProps>;
};

export type MethodGroup = {
	label: PlaygroundMethod['group'];
	methods: PlaygroundMethod[];
};
