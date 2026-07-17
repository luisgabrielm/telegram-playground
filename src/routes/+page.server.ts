import { fail } from '@sveltejs/kit';
import { validateMessage } from '$lib/server/message-validation';
import { parseReplyMarkup } from '$lib/server/reply-markup';
import { prepareSendDocument } from '$lib/server/methods/document';
import {
	prepareSendPhotoRequest,
	SendPhotoValidationError,
	type TelegramPhotoSource
} from '$lib/server/methods/photo';
import { prepareSendVoice, type TelegramVoiceSource } from '$lib/server/methods/voice';
import { prepareSendPoll } from '$lib/server/methods/poll';
import { prepareSendDice } from '$lib/server/methods/dice';
import {
	prepareSendMediaGroup,
	type MediaGroupItemType,
	type SendMediaGroupItem
} from '$lib/server/methods/media-group';
import {
	parseRichMessageBlocks,
	prepareSendRichMessage
} from '$lib/server/methods/rich-message';
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
			text: String(formData.get('text') ?? ''),
			replyMarkup: String(formData.get('replyMarkup') ?? '')
		};
		const validation = validateMessage(fields);
		const replyMarkup = parseReplyMarkup(fields.replyMarkup);

		if (!validation.valid || !replyMarkup.ok) {
			return fail(400, {
				action: 'sendMessage' as const,
				success: false as const,
				fields,
				fieldErrors: validation.errors,
				replyMarkupErrors: replyMarkup.ok ? undefined : replyMarkup.errors
			});
		}

		try {
			const response = await createTelegramClient(fetch).sendMessage(
				fields.chatId.trim(),
				fields.text,
				replyMarkup.value
			);

			return {
				action: 'sendMessage' as const,
				success: true as const,
				fields: { chatId: fields.chatId, text: '', replyMarkup: fields.replyMarkup },
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
		const replyMarkup = parseReplyMarkup(fields.replyMarkup);
		if (!replyMarkup.ok) {
			return fail(400, mediaReplyMarkupFailure('sendPhoto', fields, replyMarkup.errors));
		}
		const source = mediaSource(formData, 'photo') as TelegramPhotoSource;

		try {
			const prepared = prepareSendPhotoRequest({
				chatId: fields.chatId,
				photo: source,
				caption: fields.caption,
				hasSpoiler: formData.get('hasSpoiler') === 'true',
				replyMarkup: replyMarkup.value
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
		const replyMarkup = parseReplyMarkup(fields.replyMarkup);
		if (!replyMarkup.ok) {
			return fail(400, mediaReplyMarkupFailure('sendDocument', fields, replyMarkup.errors));
		}
		const prepared = prepareSendDocument({
			chatId: fields.chatId,
			document: mediaEntry(formData, 'document'),
			caption: fields.caption,
			replyMarkup: replyMarkup.value
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
		const replyMarkup = parseReplyMarkup(fields.replyMarkup);
		if (!replyMarkup.ok) {
			return fail(400, mediaReplyMarkupFailure('sendVoice', fields, replyMarkup.errors));
		}
		const source = mediaSource(formData, 'voice') as TelegramVoiceSource;
		const durationValue = String(formData.get('duration') ?? '').trim();
		const prepared = prepareSendVoice({
			chatId: fields.chatId,
			voice: source,
			caption: fields.caption,
			duration: durationValue ? Number(durationValue) : undefined,
			replyMarkup: replyMarkup.value
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
	},
	sendDice: async ({ request, fetch }) => {
		const formData = await request.formData();
		const fields = {
			chatId: String(formData.get('chatId') ?? ''),
			emoji: String(formData.get('emoji') ?? '🎲'),
			replyMarkup: String(formData.get('replyMarkup') ?? '')
		};
		const replyMarkup = parseReplyMarkup(fields.replyMarkup);
		if (!replyMarkup.ok) {
			return fail(400, {
				action: 'sendDice' as const,
				success: false as const,
				fields,
				replyMarkupErrors: replyMarkup.errors
			});
		}
		const prepared = prepareSendDice({
			chatId: fields.chatId,
			emoji: fields.emoji,
			replyMarkup: replyMarkup.value
		});
		if (!prepared.ok) {
			return fail(400, {
				action: 'sendDice' as const,
				success: false as const,
				fields,
				fieldErrors: prepared.errors
			});
		}

		try {
			const response = await createTelegramClient(fetch).sendDice(prepared.request);
			return { action: 'sendDice' as const, success: true as const, fields, response };
		} catch (error) {
			return methodTelegramFailure('sendDice', fields, error);
		}
	},
	sendPoll: async ({ request, fetch }) => {
		const formData = await request.formData();
		const fields = {
			chatId: String(formData.get('chatId') ?? ''),
			question: String(formData.get('question') ?? ''),
			options: stringEntries(formData, 'options'),
			type: formData.get('type') === 'quiz' ? ('quiz' as const) : ('regular' as const),
			isAnonymous: String(formData.get('isAnonymous') === 'true'),
			allowsMultipleAnswers: String(formData.get('allowsMultipleAnswers') === 'true'),
			correctOptionIds: stringEntries(formData, 'correctOptionIds'),
			explanation: String(formData.get('explanation') ?? ''),
			openPeriod: String(formData.get('openPeriod') ?? ''),
			replyMarkup: String(formData.get('replyMarkup') ?? '')
		};
		const replyMarkup = parseReplyMarkup(fields.replyMarkup);
		if (!replyMarkup.ok) {
			return fail(400, {
				action: 'sendPoll' as const,
				success: false as const,
				fields,
				replyMarkupErrors: replyMarkup.errors
			});
		}
		const prepared = prepareSendPoll({
			chatId: fields.chatId,
			question: fields.question,
			options: fields.options,
			type: fields.type,
			isAnonymous: fields.isAnonymous === 'true',
			allowsMultipleAnswers: fields.allowsMultipleAnswers === 'true',
			correctOptionIds: fields.correctOptionIds.map(Number),
			explanation: fields.explanation,
			openPeriod: fields.openPeriod,
			replyMarkup: replyMarkup.value
		});
		if (!prepared.ok) {
			return fail(400, {
				action: 'sendPoll' as const,
				success: false as const,
				fields,
				fieldErrors: prepared.errors
			});
		}

		try {
			const response = await createTelegramClient(fetch).sendPoll(prepared.request);
			return { action: 'sendPoll' as const, success: true as const, fields, response };
		} catch (error) {
			return methodTelegramFailure('sendPoll', fields, error);
		}
	},
	sendMediaGroup: async ({ request, fetch }) => {
		const formData = await request.formData();
		const fields = {
			chatId: String(formData.get('chatId') ?? ''),
			itemType: stringEntries(formData, 'itemType'),
			itemSourceType: stringEntries(formData, 'itemSourceType'),
			itemReference: stringEntries(formData, 'itemReference'),
			itemCaption: stringEntries(formData, 'itemCaption')
		};
		const items: SendMediaGroupItem[] = fields.itemType.map((type, index) => {
			const sourceType = fields.itemSourceType[index] ?? 'reference';
			const fileEntry = formData.get(`itemFile.${index}`);
			return {
				type: type as MediaGroupItemType,
				source:
					sourceType === 'upload'
						? {
								kind: 'upload' as const,
								file: fileEntry instanceof File ? fileEntry : new File([], ''),
								filename: fileEntry instanceof File ? fileEntry.name : undefined
							}
						: {
								kind: 'reference' as const,
								value: fields.itemReference[index] ?? ''
							},
				caption: fields.itemCaption[index] ?? ''
			};
		});
		const prepared = prepareSendMediaGroup({ chatId: fields.chatId, items });
		if (!prepared.ok) {
			return fail(400, {
				action: 'sendMediaGroup' as const,
				success: false as const,
				fields,
				fieldErrors: prepared.errors
			});
		}

		try {
			const response = await createTelegramClient(fetch).sendMediaGroup(prepared.request);
			return { action: 'sendMediaGroup' as const, success: true as const, fields, response };
		} catch (error) {
			return methodTelegramFailure('sendMediaGroup', fields, error);
		}
	},
	sendRichMessage: async ({ request, fetch }) => {
		const formData = await request.formData();
		const fields = {
			chatId: String(formData.get('chatId') ?? ''),
			blocks: String(formData.get('blocks') ?? ''),
			isRtl: String(formData.get('isRtl') === 'true'),
			skipEntityDetection: String(formData.get('skipEntityDetection') === 'true'),
			replyMarkup: String(formData.get('replyMarkup') ?? '')
		};
		const parsedBlocks = parseRichMessageBlocks(fields.blocks);
		const replyMarkup = parseReplyMarkup(fields.replyMarkup);
		if (!parsedBlocks.ok || !replyMarkup.ok) {
			return fail(400, {
				action: 'sendRichMessage' as const,
				success: false as const,
				fields,
				fieldErrors: parsedBlocks.ok ? undefined : parsedBlocks.errors,
				replyMarkupErrors: replyMarkup.ok ? undefined : replyMarkup.errors
			});
		}
		const prepared = prepareSendRichMessage({
			chatId: fields.chatId,
			blocks: parsedBlocks.value,
			isRtl: fields.isRtl === 'true',
			skipEntityDetection: fields.skipEntityDetection === 'true',
			replyMarkup: replyMarkup.value
		});
		if (!prepared.ok) {
			return fail(400, {
				action: 'sendRichMessage' as const,
				success: false as const,
				fields,
				fieldErrors: prepared.errors
			});
		}

		try {
			const response = await createTelegramClient(fetch).sendRichMessage(prepared.request);
			return { action: 'sendRichMessage' as const, success: true as const, fields, response };
		} catch (error) {
			return methodTelegramFailure('sendRichMessage', fields, error);
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
		hasSpoiler: String(formData.get('hasSpoiler') ?? ''),
		replyMarkup: String(formData.get('replyMarkup') ?? '')
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

function mediaReplyMarkupFailure(
	action: MediaAction,
	fields: ReturnType<typeof mediaFields>,
	replyMarkupErrors: Record<string, string>
) {
	return { action, success: false as const, fields, replyMarkupErrors };
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

function methodTelegramFailure<
	Action extends 'sendPoll' | 'sendDice' | 'sendMediaGroup' | 'sendRichMessage',
	Fields
>(
	action: Action,
	fields: Fields,
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

function stringEntries(formData: FormData, name: string) {
	return formData.getAll(name).map((value) => String(value));
}
