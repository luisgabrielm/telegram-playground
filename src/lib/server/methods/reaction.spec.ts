import { describe, expect, it } from 'vitest';
import {
	TELEGRAM_REACTION_EMOJIS,
	isTelegramReactionEmoji,
	prepareSetMessageReaction,
	validateSetMessageReaction
} from './reaction';

describe('validateSetMessageReaction', () => {
	it('requires a chat ID and positive integer message ID', () => {
		expect(
			validateSetMessageReaction({ chatId: ' ', messageId: '0', reactionKind: 'none' })
		).toEqual({
			valid: false,
			errors: {
				chatId: 'Enter a chat ID or channel username.',
				messageId: 'Message ID must be a positive whole number.'
			}
		});

		for (const messageId of ['', '-1', '1.5', 'message', Number.MAX_SAFE_INTEGER + 1]) {
			expect(
				validateSetMessageReaction({ chatId: '42', messageId, reactionKind: 'none' }).errors
					.messageId
			).toBe('Message ID must be a positive whole number.');
		}
	});

	it('rejects an invalid reaction type', () => {
		expect(
			validateSetMessageReaction({ chatId: '42', messageId: '7', reactionKind: 'paid' })
		).toEqual({
			valid: false,
			errors: { reactionKind: 'Choose remove, standard emoji, or custom emoji.' }
		});
	});

	it.each(TELEGRAM_REACTION_EMOJIS)('accepts the official standard reaction %s', (emoji) => {
		expect(isTelegramReactionEmoji(emoji)).toBe(true);
		expect(
			validateSetMessageReaction({ chatId: '42', messageId: '7', reactionKind: 'emoji', emoji })
		).toEqual({ valid: true, errors: {} });
	});

	it.each(['', '🚀', '👍🏽', ' 👍 '])('rejects unsupported standard emoji %j', (emoji) => {
		expect(
			validateSetMessageReaction({ chatId: '42', messageId: '7', reactionKind: 'emoji', emoji })
		).toEqual({
			valid: false,
			errors: { emoji: 'Choose a standard reaction supported by Telegram.' }
		});
	});

	it('requires a custom emoji ID only for custom reactions', () => {
		expect(
			validateSetMessageReaction({
				chatId: '42',
				messageId: '7',
				reactionKind: 'custom_emoji',
				customEmojiId: '  '
			})
		).toEqual({ valid: false, errors: { customEmojiId: 'Enter a custom emoji ID.' } });

		expect(
			validateSetMessageReaction({ chatId: '42', messageId: '7', reactionKind: 'none' })
		).toEqual({ valid: true, errors: {} });
	});
});

describe('prepareSetMessageReaction', () => {
	it('prepares removal as an empty reaction list and trims the chat ID', () => {
		expect(
			prepareSetMessageReaction({ chatId: '  @channel  ', messageId: '12', reactionKind: 'none' })
		).toEqual({
			ok: true,
			request: {
				method: 'setMessageReaction',
				body: { chat_id: '@channel', message_id: 12, reaction: [] }
			}
		});
	});

	it('prepares exactly one standard reaction', () => {
		expect(
			prepareSetMessageReaction({
				chatId: '-100123',
				messageId: 9,
				reactionKind: 'emoji',
				emoji: '🎉'
			})
		).toEqual({
			ok: true,
			request: {
				method: 'setMessageReaction',
				body: {
					chat_id: '-100123',
					message_id: 9,
					reaction: [{ type: 'emoji', emoji: '🎉' }]
				}
			}
		});
	});

	it('trims and prepares exactly one custom emoji reaction with large animation', () => {
		expect(
			prepareSetMessageReaction({
				chatId: '42',
				messageId: '8',
				reactionKind: 'custom_emoji',
				customEmojiId: '  5368324170671202286  ',
				isBig: true
			})
		).toEqual({
			ok: true,
			request: {
				method: 'setMessageReaction',
				body: {
					chat_id: '42',
					message_id: 8,
					reaction: [{ type: 'custom_emoji', custom_emoji_id: '5368324170671202286' }],
					is_big: true
				}
			}
		});
	});

	it('omits false is_big and ignores inactive reaction values', () => {
		expect(
			prepareSetMessageReaction({
				chatId: '42',
				messageId: '8',
				reactionKind: 'none',
				emoji: '🚀',
				customEmojiId: 'secret-like-id',
				isBig: false
			})
		).toEqual({
			ok: true,
			request: {
				method: 'setMessageReaction',
				body: { chat_id: '42', message_id: 8, reaction: [] }
			}
		});
	});

	it('returns safe validation errors without echoing invalid input', () => {
		const secretLikeValue = '123456:secret-token-like-value';
		const result = prepareSetMessageReaction({
			chatId: '',
			messageId: secretLikeValue,
			reactionKind: 'emoji',
			emoji: secretLikeValue
		});

		expect(result).toEqual({
			ok: false,
			errors: {
				chatId: 'Enter a chat ID or channel username.',
				messageId: 'Message ID must be a positive whole number.',
				emoji: 'Choose a standard reaction supported by Telegram.'
			}
		});
		expect(JSON.stringify(result)).not.toContain(secretLikeValue);
	});
});
