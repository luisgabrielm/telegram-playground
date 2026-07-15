import { fail } from '@sveltejs/kit';
import { validateMessage } from '$lib/server/message-validation';
import { prepareSendDocument } from '$lib/server/methods/document';
import {
	prepareSendPhotoRequest,
	SendPhotoValidationError,
	type TelegramPhotoSource
} from '$lib/server/methods/photo';
import { prepareSendVoice, type TelegramVoiceSource } from '$lib/server/methods/voice';
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
	},
	sendPhoto: async ({ request, fetch }) => {
		const formData = await request.formData();
		const fields = mediaFields(formData, 'photo');
		const source = mediaSource(formData, 'photo') as TelegramPhotoSource;

		try {
			const prepared = prepareSendPhotoRequest({
				chatId: fields.chatId,
				photo: source,
				caption: fields.caption,
				hasSpoiler: formData.get('hasSpoiler') === 'true'
			});
			const response = await createTelegramClient(fetch).sendPhoto(prepared);
			return mediaSuccess('sendPhoto', fields, response);
		} catch (error) {
			if (error instanceof SendPhotoValidationError) {
				return fail(400, mediaValidationFailure('sendPhoto', fields, error.errors));
			}
			return mediaTelegramFailure('sendPhoto', fields, error);
		}
	},
	sendDocument: async ({ request, fetch }) => {
		const formData = await request.formData();
		const fields = mediaFields(formData, 'document');
		const prepared = prepareSendDocument({
			chatId: fields.chatId,
			document: mediaEntry(formData, 'document'),
			caption: fields.caption
		});

		if (!prepared.ok) {
			return fail(400, mediaValidationFailure('sendDocument', fields, prepared.errors));
		}

		try {
			const response = await createTelegramClient(fetch).sendDocument(prepared.request);
			return mediaSuccess('sendDocument', fields, response);
		} catch (error) {
			return mediaTelegramFailure('sendDocument', fields, error);
		}
	},
	sendVoice: async ({ request, fetch }) => {
		const formData = await request.formData();
		const fields = mediaFields(formData, 'voice');
		const source = mediaSource(formData, 'voice') as TelegramVoiceSource;
		const durationValue = String(formData.get('duration') ?? '').trim();
		const prepared = prepareSendVoice({
			chatId: fields.chatId,
			voice: source,
			caption: fields.caption,
			duration: durationValue ? Number(durationValue) : undefined
		});

		if (!prepared.ok) {
			return fail(400, mediaValidationFailure('sendVoice', fields, prepared.errors));
		}

		try {
			const response = await createTelegramClient(fetch).sendVoice(prepared.request);
			return mediaSuccess('sendVoice', fields, response);
		} catch (error) {
			return mediaTelegramFailure('sendVoice', fields, error);
		}
	}
} satisfies Actions;

type MediaAction = 'sendPhoto' | 'sendDocument' | 'sendVoice';

function mediaFields(formData: FormData, mediaName: string) {
	return {
		chatId: String(formData.get('chatId') ?? ''),
		caption: String(formData.get('caption') ?? ''),
		sourceType: String(formData.get('sourceType') ?? 'reference'),
		mediaReference: String(formData.get(`${mediaName}Reference`) ?? ''),
		duration: String(formData.get('duration') ?? ''),
		hasSpoiler: String(formData.get('hasSpoiler') ?? '')
	};
}

function mediaEntry(formData: FormData, mediaName: string): string | File | null {
	if (formData.get('sourceType') !== 'upload') {
		return String(formData.get(`${mediaName}Reference`) ?? '');
	}
	const value = formData.get(`${mediaName}File`);
	return value instanceof File ? value : null;
}

function mediaSource(formData: FormData, mediaName: string) {
	const entry = mediaEntry(formData, mediaName);
	return typeof entry === 'string'
		? { kind: 'reference' as const, value: entry }
		: { kind: 'upload' as const, file: entry ?? new File([], '') };
}

function mediaSuccess(action: MediaAction, fields: ReturnType<typeof mediaFields>, response: unknown) {
	return { action, success: true as const, fields: { ...fields, caption: '' }, response };
}

function mediaValidationFailure(
	action: MediaAction,
	fields: ReturnType<typeof mediaFields>,
	fieldErrors: object
) {
	return { action, success: false as const, fields, fieldErrors };
}

function mediaTelegramFailure(
	action: MediaAction,
	fields: ReturnType<typeof mediaFields>,
	error: unknown
) {
	const telegramError = getPublicTelegramError(error);
	return fail(telegramError.response?.error_code === 401 ? 401 : 502, {
		action,
		success: false as const,
		fields,
		error: telegramError.message,
		response: telegramError.response
	});
}
