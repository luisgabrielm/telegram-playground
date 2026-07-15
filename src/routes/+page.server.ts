import { fail } from '@sveltejs/kit';
import { validateMessage } from '$lib/server/message-validation';
import {
	createTelegramClient,
	getPublicTelegramError,
	isTelegramConfigured
} from '$lib/server/telegram';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	configured: isTelegramConfigured()
});

export const actions = {
	getMe: async ({ fetch }) => {
		try {
			const response = await createTelegramClient(fetch).getMe();

			return {
				action: 'getMe' as const,
				success: true as const,
				response
			};
		} catch (error) {
			const telegramError = getPublicTelegramError(error);

			return fail(telegramError.response?.error_code === 401 ? 401 : 502, {
				action: 'getMe' as const,
				success: false as const,
				error: telegramError.message,
				response: telegramError.response
			});
		}
	},
	sendMessage: async ({ request, fetch }) => {
		const formData = await request.formData();
		const fields = {
			chatId: String(formData.get('chatId') ?? ''),
			text: String(formData.get('text') ?? '')
		};
		const validation = validateMessage(fields);

		if (!validation.valid) {
			return fail(400, {
				action: 'sendMessage' as const,
				success: false as const,
				fields,
				fieldErrors: validation.errors
			});
		}

		try {
			const response = await createTelegramClient(fetch).sendMessage(
				fields.chatId.trim(),
				fields.text
			);

			return {
				action: 'sendMessage' as const,
				success: true as const,
				fields: { chatId: fields.chatId, text: '' },
				response
			};
		} catch (error) {
			const telegramError = getPublicTelegramError(error);

			return fail(telegramError.response?.error_code === 401 ? 401 : 502, {
				action: 'sendMessage' as const,
				success: false as const,
				fields,
				error: telegramError.message,
				response: telegramError.response
			});
		}
	}
} satisfies Actions;
