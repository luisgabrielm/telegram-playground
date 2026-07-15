import type { Component } from 'svelte';
import type { TelegramApiFailure, TelegramApiSuccess, TelegramMessage, TelegramUser } from '$lib/telegram';

export type MethodId = 'getMe' | 'sendMessage' | 'sendPhoto' | 'sendDocument' | 'sendVoice';

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
	};
	fieldErrors?: {
		chatId?: string;
		text?: string;
	};
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
	};
	fieldErrors?: {
		chatId?: string;
		photo?: string;
		document?: string;
		voice?: string;
		caption?: string;
		duration?: string;
	};
};

export type MethodFeedback = GetMeFeedback | SendMessageFeedback | MediaFeedback;

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
