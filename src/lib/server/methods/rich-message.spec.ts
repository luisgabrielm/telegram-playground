import { describe, expect, it } from 'vitest';
import { parseRichMessageBlocks, prepareSendRichMessage } from './rich-message';

describe('rich message preparation', () => {
	it('serializes delivery options without changing the structured format', () => {
		const result = prepareSendRichMessage({ chatId: '42', blocks: [{ type: 'paragraph', text: 'Hello' }],
			messageOptions: { parseMode: 'HTML', disableNotification: true, replyParameters: { messageId: 2 } } });
		expect(result.ok && result.request.body).toMatchObject({ disable_notification: true, reply_parameters: { message_id: 2 } });
		expect(result.ok && result.request.body).not.toHaveProperty('parse_mode');
	});
	it('builds a structured rich-message request', () => {
		const result = prepareSendRichMessage({
			chatId: ' @channel ',
			blocks: [
				{ type: 'heading', text: 'Release notes', size: 2 },
				{ type: 'paragraph', text: 'Everything shipped.' },
				{
					type: 'paragraph',
					text: { type: 'url', text: 'Read more', url: 'https://example.com' }
				}
			],
			isRtl: true,
			skipEntityDetection: true,
			replyMarkup: { force_reply: true }
		});

		expect(result).toEqual({
			ok: true,
			request: {
				method: 'sendRichMessage',
				body: {
					chat_id: '@channel',
					rich_message: {
						blocks: [
							{ type: 'heading', text: 'Release notes', size: 2 },
							{ type: 'paragraph', text: 'Everything shipped.' },
							{
								type: 'paragraph',
								text: { type: 'url', text: 'Read more', url: 'https://example.com' }
							}
						],
						is_rtl: true,
						skip_entity_detection: true
					},
					reply_markup: { force_reply: true }
				}
			}
		});
	});

	it('accepts lists, quotations, preformatted text, and tables', () => {
		const blocks = [
			{
				type: 'list',
				items: [
					{ blocks: [{ type: 'paragraph', text: 'First' }], value: 1, type: '1' },
					{ blocks: [{ type: 'paragraph', text: 'Second' }], value: 2, type: '1' }
				]
			},
			{
				type: 'blockquote',
				blocks: [{ type: 'paragraph', text: 'Quoted' }],
				credit: 'Source'
			},
			{ type: 'pre', text: 'const answer = 42;', language: 'typescript' },
			{
				type: 'table',
				cells: [
					[
						{ text: 'Name', is_header: true, align: 'left', valign: 'top' },
						{ text: 'Value', is_header: true, align: 'left', valign: 'top' }
					],
					[
						{ text: 'Status', align: 'left', valign: 'top' },
						{ text: 'Ready', align: 'left', valign: 'top' }
					]
				],
				is_bordered: true
			}
		];

		expect(parseRichMessageBlocks(JSON.stringify(blocks))).toEqual({ ok: true, value: blocks });
	});

	it.each([
		['missing chat', { chatId: '', blocks: [{ type: 'paragraph', text: 'Hello' }] }],
		['empty blocks', { chatId: '123', blocks: [] }],
		['empty text', { chatId: '123', blocks: [{ type: 'paragraph', text: ' ' }] }],
		['bad heading', { chatId: '123', blocks: [{ type: 'heading', text: 'Title', size: 7 }] }],
		[
			'bad link',
			{
				chatId: '123',
				blocks: [
					{ type: 'paragraph', text: { type: 'url', text: 'Link', url: 'javascript:alert(1)' } }
				]
			}
		],
		[
			'jagged table',
			{
				chatId: '123',
				blocks: [
					{
						type: 'table',
						cells: [
							[{ text: 'A', align: 'left', valign: 'top' }],
							[
								{ text: 'B', align: 'left', valign: 'top' },
								{ text: 'C', align: 'left', valign: 'top' }
							]
						]
					}
				]
			}
		]
	] as const)('rejects %s', (_, input) => {
		const result = prepareSendRichMessage(input as never);
		expect(result.ok).toBe(false);
	});

	it('rejects malformed and unsupported JSON', () => {
		expect(parseRichMessageBlocks('{')).toMatchObject({ ok: false });
		expect(parseRichMessageBlocks('[]')).toMatchObject({ ok: false });
		expect(
			parseRichMessageBlocks(JSON.stringify([{ type: 'divider', extra: true }]))
		).toMatchObject({ ok: false });
	});
});
