import { describe, expect, it } from 'vitest';
import type { TelegramReplyMarkup } from '$lib/reply-markup';
import {
	TELEGRAM_POLL_EXPLANATION_MAX_LENGTH,
	TELEGRAM_POLL_OPEN_PERIOD_MAX,
	TELEGRAM_POLL_OPTION_MAX_COUNT,
	TELEGRAM_POLL_OPTION_MAX_LENGTH,
	TELEGRAM_POLL_QUESTION_MAX_LENGTH,
	prepareSendPoll,
	type SendPollInput
} from './poll';

const regularPoll: SendPollInput = {
	chatId: '123',
	question: 'Choose one',
	options: ['First', 'Second'],
	type: 'regular',
	isAnonymous: true,
	allowsMultipleAnswers: false
};

describe('prepareSendPoll', () => {
	it('serializes reply options without applying poll parse mode', () => {
		const result = prepareSendPoll({ ...regularPoll, messageOptions: { parseMode: 'MarkdownV2', replyParameters: { messageId: 4 } } });
		expect(result.ok && result.request.body).toMatchObject({ reply_parameters: { message_id: 4 } });
		expect(result.ok && result.request.body).not.toHaveProperty('parse_mode');
	});
	it('builds a regular poll and trims only the chat identifier', () => {
		expect(
			prepareSendPoll({
				...regularPoll,
				chatId: '  @channel  ',
				question: ' Question ',
				options: [' Alpha ', 'Beta'],
				isAnonymous: false,
				allowsMultipleAnswers: true,
				openPeriod: '60'
			})
		).toEqual({
			ok: true,
			request: {
				method: 'sendPoll',
				body: {
					chat_id: '@channel',
					question: ' Question ',
					options: [{ text: ' Alpha ' }, { text: 'Beta' }],
					type: 'regular',
					is_anonymous: false,
					allows_multiple_answers: true,
					open_period: 60
				}
			}
		});
	});

	it('builds a quiz with its correct option, explanation, and reply markup', () => {
		const replyMarkup: TelegramReplyMarkup = {
			inline_keyboard: [[{ text: 'Details', url: 'https://example.com' }]]
		};
		const result = prepareSendPoll({
			...regularPoll,
			type: 'quiz',
			allowsMultipleAnswers: true,
			correctOptionIds: [0, 1],
			explanation: 'Second is correct.',
			replyMarkup
		});

		expect(result).toEqual({
			ok: true,
			request: {
				method: 'sendPoll',
				body: {
					chat_id: '123',
					question: 'Choose one',
					options: [{ text: 'First' }, { text: 'Second' }],
					type: 'quiz',
					is_anonymous: true,
					correct_option_ids: [0, 1],
					explanation: 'Second is correct.',
					reply_markup: replyMarkup
				}
			}
		});
	});

	it.each([
		['chatId', { chatId: ' ' }],
		['question', { question: ' ' }],
		['question', { question: 'x'.repeat(TELEGRAM_POLL_QUESTION_MAX_LENGTH + 1) }],
		['options', { options: [] }],
		['options', { options: Array(TELEGRAM_POLL_OPTION_MAX_COUNT + 1).fill('option') }],
		['options.0', { options: [' ', 'valid'] }],
		['options.0', { options: ['x'.repeat(TELEGRAM_POLL_OPTION_MAX_LENGTH + 1), 'valid'] }],
		['explanation', { explanation: 'x'.repeat(TELEGRAM_POLL_EXPLANATION_MAX_LENGTH + 1) }],
		['explanation', { explanation: 'one\ntwo\nthree\nfour' }],
		['openPeriod', { openPeriod: 4 }],
		['openPeriod', { openPeriod: TELEGRAM_POLL_OPEN_PERIOD_MAX + 1 }],
		['openPeriod', { openPeriod: '10.5' }]
	] satisfies Array<[string, Partial<SendPollInput>]>)('rejects invalid %s values', (field, change) => {
		const result = prepareSendPoll({ ...regularPoll, ...change });

		expect(result.ok).toBe(false);
		if (result.ok) throw new Error('Expected validation failure');
		expect(result.errors[field]).toBeTruthy();
	});

	it('counts Unicode code points rather than UTF-16 units', () => {
		const result = prepareSendPoll({
			...regularPoll,
			question: '😀'.repeat(TELEGRAM_POLL_QUESTION_MAX_LENGTH),
			options: ['😀'.repeat(TELEGRAM_POLL_OPTION_MAX_LENGTH)]
		});

		expect(result.ok).toBe(true);
	});

	it('requires one or more valid, unique correct options for quizzes', () => {
		for (const correctOptionIds of [undefined, [], [-1], [2], [0.5], [0, 0]]) {
			const result = prepareSendPoll({
				...regularPoll,
				type: 'quiz',
				correctOptionIds
			});

			expect(result.ok).toBe(false);
			if (result.ok) throw new Error('Expected validation failure');
			expect(result.errors.correctOptionIds).toBeTruthy();
		}
	});

	it('accepts the documented boundary values and omits blank optional values', () => {
		const result = prepareSendPoll({
			...regularPoll,
			options: ['Only option'],
			explanation: ' ',
			openPeriod: ''
		});

		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error('Expected a prepared request');
		expect(result.request.body).not.toHaveProperty('explanation');
		expect(result.request.body).not.toHaveProperty('open_period');
		expect(result.request.body).not.toHaveProperty('allows_multiple_answers');
	});
});
