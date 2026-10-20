import type { TelegramReplyMarkup } from '$lib/reply-markup';
import type { NormalizedMessageOptions } from '$lib/message-options';
import { appendMessageOptionsToJson } from '$lib/server/message-options';

export const TELEGRAM_POLL_QUESTION_MAX_LENGTH = 300;
export const TELEGRAM_POLL_OPTION_MIN_COUNT = 1;
export const TELEGRAM_POLL_OPTION_MAX_COUNT = 12;
export const TELEGRAM_POLL_OPTION_MAX_LENGTH = 100;
export const TELEGRAM_POLL_EXPLANATION_MAX_LENGTH = 200;
export const TELEGRAM_POLL_EXPLANATION_MAX_LINE_FEEDS = 2;
export const TELEGRAM_POLL_OPEN_PERIOD_MIN = 5;
export const TELEGRAM_POLL_OPEN_PERIOD_MAX = 2_628_000;

export type PollType = 'regular' | 'quiz';

export interface SendPollInput {
	chatId: string;
	question: string;
	options: string[];
	type: PollType;
	isAnonymous: boolean;
	allowsMultipleAnswers: boolean;
	correctOptionIds?: number[];
	explanation?: string;
	openPeriod?: string | number;
	replyMarkup?: TelegramReplyMarkup;
	messageOptions?: NormalizedMessageOptions;
}

export interface SendPollBody {
	chat_id: string;
	question: string;
	options: Array<{ text: string }>;
	type: PollType;
	is_anonymous: boolean;
	allows_multiple_answers?: boolean;
	correct_option_ids?: number[];
	explanation?: string;
	open_period?: number;
	reply_markup?: TelegramReplyMarkup;
}

export type PreparedSendPoll =
	| { ok: true; request: { method: 'sendPoll'; body: SendPollBody } }
	| { ok: false; errors: Record<string, string> };

export function prepareSendPoll(input: SendPollInput): PreparedSendPoll {
	const errors: Record<string, string> = {};
	const questionLength = unicodeLength(input.question);

	if (!input.chatId.trim()) errors.chatId = 'Enter a chat ID or channel username.';
	if (!input.question.trim()) {
		errors.question = 'Enter a poll question.';
	} else if (questionLength > TELEGRAM_POLL_QUESTION_MAX_LENGTH) {
		errors.question = `Questions can contain at most ${TELEGRAM_POLL_QUESTION_MAX_LENGTH} characters.`;
	}

	if (
		input.options.length < TELEGRAM_POLL_OPTION_MIN_COUNT ||
		input.options.length > TELEGRAM_POLL_OPTION_MAX_COUNT
	) {
		errors.options = `Add between ${TELEGRAM_POLL_OPTION_MIN_COUNT} and ${TELEGRAM_POLL_OPTION_MAX_COUNT} options.`;
	}

	input.options.forEach((option, index) => {
		if (!option.trim()) {
			errors[`options.${index}`] = 'Enter option text.';
		} else if (unicodeLength(option) > TELEGRAM_POLL_OPTION_MAX_LENGTH) {
			errors[`options.${index}`] = `Options can contain at most ${TELEGRAM_POLL_OPTION_MAX_LENGTH} characters.`;
		}
	});

	if (input.type === 'quiz') {
		const correctOptionIds = input.correctOptionIds ?? [];
		if (correctOptionIds.length === 0) {
			errors.correctOptionIds = 'Choose at least one correct option.';
		} else if (
			new Set(correctOptionIds).size !== correctOptionIds.length ||
			correctOptionIds.some(
				(optionId) =>
					!Number.isInteger(optionId) || optionId < 0 || optionId >= input.options.length
			)
		) {
			errors.correctOptionIds = 'Choose valid, unique correct options from the poll.';
		}
	}

	if (input.explanation) {
		if (unicodeLength(input.explanation) > TELEGRAM_POLL_EXPLANATION_MAX_LENGTH) {
			errors.explanation = `Explanations can contain at most ${TELEGRAM_POLL_EXPLANATION_MAX_LENGTH} characters.`;
		} else if (lineFeedCount(input.explanation) > TELEGRAM_POLL_EXPLANATION_MAX_LINE_FEEDS) {
			errors.explanation = `Explanations can contain at most ${TELEGRAM_POLL_EXPLANATION_MAX_LINE_FEEDS} line feeds.`;
		}
	}

	const openPeriod = parseOpenPeriod(input.openPeriod);
	if (openPeriod === null) {
		errors.openPeriod = `Open period must be a whole number from ${TELEGRAM_POLL_OPEN_PERIOD_MIN} to ${TELEGRAM_POLL_OPEN_PERIOD_MAX.toLocaleString()}.`;
	}

	if (Object.keys(errors).length > 0) return { ok: false, errors };

	return {
		ok: true,
		request: {
			method: 'sendPoll',
			body: appendMessageOptionsToJson({
				chat_id: input.chatId.trim(),
				question: input.question,
				options: input.options.map((text) => ({ text })),
				type: input.type,
				is_anonymous: input.isAnonymous,
				...(input.type === 'regular' && input.allowsMultipleAnswers
					? { allows_multiple_answers: true }
					: {}),
				...(input.type === 'quiz' ? { correct_option_ids: input.correctOptionIds } : {}),
				...(input.explanation?.trim() ? { explanation: input.explanation } : {}),
				...(typeof openPeriod === 'number' ? { open_period: openPeriod } : {}),
				...(input.replyMarkup === undefined ? {} : { reply_markup: input.replyMarkup })
			}, input.messageOptions ?? {}, false)
		}
	};
}

function parseOpenPeriod(value: string | number | undefined): number | undefined | null {
	if (value === undefined || value === '') return undefined;
	if (typeof value === 'string' && !value.trim()) return undefined;
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isInteger(parsed) &&
		parsed >= TELEGRAM_POLL_OPEN_PERIOD_MIN &&
		parsed <= TELEGRAM_POLL_OPEN_PERIOD_MAX
		? parsed
		: null;
}

function unicodeLength(value: string) {
	return Array.from(value).length;
}

function lineFeedCount(value: string) {
	return value.split('\n').length - 1;
}
