import { describe, expect, it } from 'vitest';
import type { TelegramReplyMarkup } from '$lib/reply-markup';
import { prepareSendContact, TELEGRAM_CONTACT_VCARD_MAX_BYTES } from './contact';

describe('prepareSendContact', () => {
	it('prepares required contact fields', () => {
		expect(
			prepareSendContact({ chatId: ' @support ', phoneNumber: ' +1 555 0100 ', firstName: ' Ada ' })
		).toEqual({
			ok: true,
			request: {
				method: 'sendContact',
				body: { chat_id: '@support', phone_number: '+1 555 0100', first_name: 'Ada' }
			}
		});
	});

	it('includes optional contact fields and reply markup', () => {
		const replyMarkup: TelegramReplyMarkup = { force_reply: true };
		const vcard = 'BEGIN:VCARD\nVERSION:4.0\nEND:VCARD';
		expect(
			prepareSendContact({
				chatId: '42',
				phoneNumber: '+5511999999999',
				firstName: 'Luis',
				lastName: 'Gabriel',
				vcard,
				replyMarkup
			})
		).toEqual({
			ok: true,
			request: {
				method: 'sendContact',
				body: {
					chat_id: '42',
					phone_number: '+5511999999999',
					first_name: 'Luis',
					last_name: 'Gabriel',
					vcard,
					reply_markup: replyMarkup
				}
			}
		});
	});

	it('requires chat, phone number, and first name', () => {
		expect(prepareSendContact({ chatId: '', phoneNumber: ' ', firstName: '' })).toEqual({
			ok: false,
			errors: {
				chatId: 'Enter a chat ID or channel username.',
				phoneNumber: 'Enter the contact phone number.',
				firstName: 'Enter the contact first name.'
			}
		});
	});

	it('measures the vCard limit in UTF-8 bytes', () => {
		const result = prepareSendContact({
			chatId: '42',
			phoneNumber: '+1',
			firstName: 'Ada',
			vcard: 'é'.repeat(TELEGRAM_CONTACT_VCARD_MAX_BYTES / 2 + 1)
		});
		expect(result).toEqual({
			ok: false,
			errors: { vcard: 'vCards can contain at most 2,048 UTF-8 bytes.' }
		});
	});

	it('serializes reply and delivery options without parse mode', () => {
		const result = prepareSendContact({
			chatId: '42', phoneNumber: '+1', firstName: 'Ada',
			messageOptions: { parseMode: 'HTML', replyParameters: { messageId: 7 }, protectContent: true }
		});
		expect(result.ok && result.request.body).toMatchObject({
			reply_parameters: { message_id: 7 }, protect_content: true
		});
		expect(result.ok && result.request.body).not.toHaveProperty('parse_mode');
	});
});
