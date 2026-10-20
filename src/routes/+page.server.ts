import { fail } from '@sveltejs/kit';
import { prepareSendMessage } from '$lib/server/methods/message';
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
import { prepareSendAudio, type TelegramAudioSource } from '$lib/server/methods/audio';
import {
	prepareSendAnimation,
	type TelegramAnimationSource
} from '$lib/server/methods/animation';
import { prepareSendVideo, type TelegramVideoSource } from '$lib/server/methods/video';
import {
	prepareSendVideoNote,
	type TelegramVideoNoteSource
} from '$lib/server/methods/video-note';
import { prepareSendContact } from '$lib/server/methods/contact';
import { prepareSendLocation } from '$lib/server/methods/location';
import { prepareSendVenue } from '$lib/server/methods/venue';
import {
	prepareAnswerCallbackQuery,
	prepareEditMessageReplyMarkup
} from '$lib/server/methods/inline-keyboard';
import { prepareSetMessageReaction } from '$lib/server/methods/reaction';
import { parseMessageOptions } from '$lib/server/message-options';
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
		const messageOptions = parseMessageOptions(formData);
		const fields = {
			chatId: String(formData.get('chatId') ?? ''),
			text: String(formData.get('text') ?? ''),
			replyMarkup: String(formData.get('replyMarkup') ?? ''),
			messageOptions: messageOptions.fields
		};
		const replyMarkup = parseReplyMarkup(fields.replyMarkup);

		if (!messageOptions.ok || !replyMarkup.ok) {
			return fail(400, {
				action: 'sendMessage' as const,
				success: false as const,
				fields,
				messageOptionsErrors: messageOptions.ok ? undefined : messageOptions.errors,
				replyMarkupErrors: replyMarkup.ok ? undefined : replyMarkup.errors
			});
		}
		const prepared = prepareSendMessage({
			chatId: fields.chatId,
			text: fields.text,
			replyMarkup: replyMarkup.value,
			messageOptions: messageOptions.value
		});
		if (!prepared.ok) {
			return fail(400, {
				action: 'sendMessage' as const,
				success: false as const,
				fields,
				fieldErrors: prepared.errors
			});
		}

		try {
			const response = await createTelegramClient(fetch).sendMessage(prepared.request);

			return {
				action: 'sendMessage' as const,
				success: true as const,
				fields: { ...fields, text: '' },
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
		const messageOptions = parseMessageOptions(formData);
		const fields = { ...mediaFields(formData, 'photo'), messageOptions: messageOptions.fields };
		if (!messageOptions.ok) return messageOptionsFailure('sendPhoto', fields, messageOptions.errors);
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
				replyMarkup: replyMarkup.value,
				messageOptions: messageOptions.value
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
		const messageOptions = parseMessageOptions(formData);
		const fields = { ...mediaFields(formData, 'document'), messageOptions: messageOptions.fields };
		if (!messageOptions.ok) return messageOptionsFailure('sendDocument', fields, messageOptions.errors);
		const replyMarkup = parseReplyMarkup(fields.replyMarkup);
		if (!replyMarkup.ok) {
			return fail(400, mediaReplyMarkupFailure('sendDocument', fields, replyMarkup.errors));
		}
		const prepared = prepareSendDocument({
			chatId: fields.chatId,
			document: mediaEntry(formData, 'document'),
			caption: fields.caption,
			replyMarkup: replyMarkup.value,
			messageOptions: messageOptions.value
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
		const messageOptions = parseMessageOptions(formData);
		const fields = { ...mediaFields(formData, 'voice'), messageOptions: messageOptions.fields };
		if (!messageOptions.ok) return messageOptionsFailure('sendVoice', fields, messageOptions.errors);
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
			replyMarkup: replyMarkup.value,
			messageOptions: messageOptions.value
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
	sendAudio: async ({ request, fetch }) => {
		const formData = await request.formData();
		const messageOptions = parseMessageOptions(formData);
		const fields = { ...advancedMediaFields(formData, 'audio'), messageOptions: messageOptions.fields };
		if (!messageOptions.ok) return messageOptionsFailure('sendAudio', fields, messageOptions.errors);
		const replyMarkup = parseReplyMarkup(fields.replyMarkup);
		if (!replyMarkup.ok) {
			return fail(400, mediaReplyMarkupFailure('sendAudio', fields, replyMarkup.errors));
		}
		const prepared = prepareSendAudio({
			chatId: fields.chatId,
			audio: mediaSource(formData, 'audio') as TelegramAudioSource,
			caption: fields.caption,
			duration: optionalNumber(fields.duration),
			performer: fields.performer,
			title: fields.title,
			thumbnail: optionalFile(formData, 'thumbnailFile'),
			replyMarkup: replyMarkup.value,
			messageOptions: messageOptions.value
		});
		if (!prepared.ok) {
			return fail(400, mediaValidationFailure('sendAudio', fields, prepared.errors));
		}
		try {
			const response = await createTelegramClient(fetch).sendAudio(prepared.request);
			return mediaSuccess('sendAudio', fields, response);
		} catch (error) {
			return mediaTelegramFailure('sendAudio', fields, error);
		}
	},
	sendVideo: async ({ request, fetch }) => {
		const formData = await request.formData();
		const messageOptions = parseMessageOptions(formData);
		const fields = { ...advancedMediaFields(formData, 'video'), messageOptions: messageOptions.fields };
		if (!messageOptions.ok) return messageOptionsFailure('sendVideo', fields, messageOptions.errors);
		const replyMarkup = parseReplyMarkup(fields.replyMarkup);
		if (!replyMarkup.ok) {
			return fail(400, mediaReplyMarkupFailure('sendVideo', fields, replyMarkup.errors));
		}
		const prepared = prepareSendVideo({
			chatId: fields.chatId,
			video: mediaSource(formData, 'video') as TelegramVideoSource,
			caption: fields.caption,
			duration: optionalNumber(fields.duration),
			width: optionalNumber(fields.width),
			height: optionalNumber(fields.height),
			thumbnail: optionalFile(formData, 'thumbnailFile'),
			supportsStreaming: fields.supportsStreaming === 'true',
			hasSpoiler: fields.hasSpoiler === 'true',
			replyMarkup: replyMarkup.value,
			messageOptions: messageOptions.value
		});
		if (!prepared.ok) {
			return fail(400, mediaValidationFailure('sendVideo', fields, prepared.errors));
		}
		try {
			const response = await createTelegramClient(fetch).sendVideo(prepared.request);
			return mediaSuccess('sendVideo', fields, response);
		} catch (error) {
			return mediaTelegramFailure('sendVideo', fields, error);
		}
	},
	sendVideoNote: async ({ request, fetch }) => {
		const formData = await request.formData();
		const messageOptions = parseMessageOptions(formData);
		const fields = { ...advancedMediaFields(formData, 'videoNote'), messageOptions: messageOptions.fields };
		if (!messageOptions.ok) return messageOptionsFailure('sendVideoNote', fields, messageOptions.errors);
		const replyMarkup = parseReplyMarkup(fields.replyMarkup);
		if (!replyMarkup.ok) {
			return fail(400, mediaReplyMarkupFailure('sendVideoNote', fields, replyMarkup.errors));
		}
		const prepared = prepareSendVideoNote({
			chatId: fields.chatId,
			videoNote: mediaSource(formData, 'videoNote') as TelegramVideoNoteSource,
			duration: optionalNumber(fields.duration),
			length: optionalNumber(fields.length),
			thumbnail: optionalFile(formData, 'thumbnailFile'),
			replyMarkup: replyMarkup.value,
			messageOptions: messageOptions.value
		});
		if (!prepared.ok) {
			return fail(400, mediaValidationFailure('sendVideoNote', fields, prepared.errors));
		}
		try {
			const response = await createTelegramClient(fetch).sendVideoNote(prepared.request);
			return mediaSuccess('sendVideoNote', fields, response);
		} catch (error) {
			return mediaTelegramFailure('sendVideoNote', fields, error);
		}
	},
	sendAnimation: async ({ request, fetch }) => {
		const formData = await request.formData();
		const messageOptions = parseMessageOptions(formData);
		const fields = { ...advancedMediaFields(formData, 'animation'), messageOptions: messageOptions.fields };
		if (!messageOptions.ok) return messageOptionsFailure('sendAnimation', fields, messageOptions.errors);
		const replyMarkup = parseReplyMarkup(fields.replyMarkup);
		if (!replyMarkup.ok) {
			return fail(400, mediaReplyMarkupFailure('sendAnimation', fields, replyMarkup.errors));
		}
		const prepared = prepareSendAnimation({
			chatId: fields.chatId,
			animation: mediaSource(formData, 'animation') as TelegramAnimationSource,
			caption: fields.caption,
			duration: optionalNumber(fields.duration),
			width: optionalNumber(fields.width),
			height: optionalNumber(fields.height),
			thumbnail: optionalFile(formData, 'thumbnailFile'),
			hasSpoiler: fields.hasSpoiler === 'true',
			replyMarkup: replyMarkup.value,
			messageOptions: messageOptions.value
		});
		if (!prepared.ok) {
			return fail(400, mediaValidationFailure('sendAnimation', fields, prepared.errors));
		}
		try {
			const response = await createTelegramClient(fetch).sendAnimation(prepared.request);
			return mediaSuccess('sendAnimation', fields, response);
		} catch (error) {
			return mediaTelegramFailure('sendAnimation', fields, error);
		}
	},
	sendContact: async ({ request, fetch }) => {
		const formData = await request.formData();
		const messageOptions = parseMessageOptions(formData);
		const fields = { ...contactFields(formData), messageOptions: messageOptions.fields };
		if (!messageOptions.ok) return messageOptionsFailure('sendContact', fields, messageOptions.errors);
		const replyMarkup = parseReplyMarkup(fields.replyMarkup);
		if (!replyMarkup.ok) return replyMarkupFailure('sendContact', fields, replyMarkup.errors);
		const prepared = prepareSendContact({ ...fields, replyMarkup: replyMarkup.value, messageOptions: messageOptions.value });
		if (!prepared.ok) return methodValidationFailure('sendContact', fields, prepared.errors);
		try {
			const response = await createTelegramClient(fetch).sendContact(prepared.request);
			return { action: 'sendContact' as const, success: true as const, fields, response };
		} catch (error) {
			return methodTelegramFailure('sendContact', fields, error);
		}
	},
	sendLocation: async ({ request, fetch }) => {
		const formData = await request.formData();
		const messageOptions = parseMessageOptions(formData);
		const fields = { ...locationFields(formData), messageOptions: messageOptions.fields };
		if (!messageOptions.ok) return messageOptionsFailure('sendLocation', fields, messageOptions.errors);
		const replyMarkup = parseReplyMarkup(fields.replyMarkup);
		if (!replyMarkup.ok) return replyMarkupFailure('sendLocation', fields, replyMarkup.errors);
		const prepared = prepareSendLocation({ ...fields, replyMarkup: replyMarkup.value, messageOptions: messageOptions.value });
		if (!prepared.ok) return methodValidationFailure('sendLocation', fields, prepared.errors);
		try {
			const response = await createTelegramClient(fetch).sendLocation(prepared.request);
			return { action: 'sendLocation' as const, success: true as const, fields, response };
		} catch (error) {
			return methodTelegramFailure('sendLocation', fields, error);
		}
	},
	sendVenue: async ({ request, fetch }) => {
		const formData = await request.formData();
		const messageOptions = parseMessageOptions(formData);
		const fields = { ...venueFields(formData), messageOptions: messageOptions.fields };
		if (!messageOptions.ok) return messageOptionsFailure('sendVenue', fields, messageOptions.errors);
		const replyMarkup = parseReplyMarkup(fields.replyMarkup);
		if (!replyMarkup.ok) return replyMarkupFailure('sendVenue', fields, replyMarkup.errors);
		const prepared = prepareSendVenue({ ...fields, replyMarkup: replyMarkup.value, messageOptions: messageOptions.value });
		if (!prepared.ok) return methodValidationFailure('sendVenue', fields, prepared.errors);
		try {
			const response = await createTelegramClient(fetch).sendVenue(prepared.request);
			return { action: 'sendVenue' as const, success: true as const, fields, response };
		} catch (error) {
			return methodTelegramFailure('sendVenue', fields, error);
		}
	},
	sendDice: async ({ request, fetch }) => {
		const formData = await request.formData();
		const messageOptions = parseMessageOptions(formData);
		const fields = {
			chatId: String(formData.get('chatId') ?? ''),
			emoji: String(formData.get('emoji') ?? '🎲'),
			replyMarkup: String(formData.get('replyMarkup') ?? ''),
			messageOptions: messageOptions.fields
		};
		if (!messageOptions.ok) return messageOptionsFailure('sendDice', fields, messageOptions.errors);
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
			replyMarkup: replyMarkup.value,
			messageOptions: messageOptions.value
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
		const messageOptions = parseMessageOptions(formData);
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
			replyMarkup: String(formData.get('replyMarkup') ?? ''),
			messageOptions: messageOptions.fields
		};
		if (!messageOptions.ok) return messageOptionsFailure('sendPoll', fields, messageOptions.errors);
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
			replyMarkup: replyMarkup.value,
			messageOptions: messageOptions.value
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
		const messageOptions = parseMessageOptions(formData);
		const fields = {
			chatId: String(formData.get('chatId') ?? ''),
			itemType: stringEntries(formData, 'itemType'),
			itemSourceType: stringEntries(formData, 'itemSourceType'),
			itemReference: stringEntries(formData, 'itemReference'),
			itemCaption: stringEntries(formData, 'itemCaption'),
			itemParseMode: stringEntries(formData, 'itemParseMode'),
			messageOptions: messageOptions.fields
		};
		if (!messageOptions.ok) return messageOptionsFailure('sendMediaGroup', fields, messageOptions.errors);
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
				caption: fields.itemCaption[index] ?? '',
				parseMode: fields.itemParseMode[index] || undefined
			};
		});
		const prepared = prepareSendMediaGroup({ chatId: fields.chatId, items, messageOptions: messageOptions.value });
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
		const messageOptions = parseMessageOptions(formData);
		const fields = {
			chatId: String(formData.get('chatId') ?? ''),
			blocks: String(formData.get('blocks') ?? ''),
			isRtl: String(formData.get('isRtl') === 'true'),
			skipEntityDetection: String(formData.get('skipEntityDetection') === 'true'),
			replyMarkup: String(formData.get('replyMarkup') ?? ''),
			messageOptions: messageOptions.fields
		};
		if (!messageOptions.ok) return messageOptionsFailure('sendRichMessage', fields, messageOptions.errors);
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
			replyMarkup: replyMarkup.value,
			messageOptions: messageOptions.value
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
	},
	answerCallbackQuery: async ({ request, fetch }) => {
		const formData = await request.formData();
		const fields = {
			callbackQueryId: String(formData.get('callbackQueryId') ?? ''),
			text: String(formData.get('text') ?? ''),
			showAlert: String(formData.get('showAlert') === 'true'),
			url: String(formData.get('url') ?? ''),
			cacheTime: String(formData.get('cacheTime') ?? '')
		};
		const prepared = prepareAnswerCallbackQuery({
			...fields,
			showAlert: fields.showAlert === 'true'
		});
		if (!prepared.ok) {
			return fail(400, {
				action: 'answerCallbackQuery' as const,
				success: false as const,
				fields,
				fieldErrors: prepared.errors
			});
		}

		try {
			const response = await createTelegramClient(fetch).answerCallbackQuery(prepared.request);
			return { action: 'answerCallbackQuery' as const, success: true as const, fields, response };
		} catch (error) {
			return methodTelegramFailure('answerCallbackQuery', fields, error);
		}
	},
	editMessageReplyMarkup: async ({ request, fetch }) => {
		const formData = await request.formData();
		const fields = {
			chatId: String(formData.get('chatId') ?? ''),
			messageId: String(formData.get('messageId') ?? ''),
			inlineMessageId: String(formData.get('inlineMessageId') ?? ''),
			replyMarkup: String(formData.get('replyMarkup') ?? '')
		};
		const replyMarkup = parseReplyMarkup(fields.replyMarkup);
		if (!replyMarkup.ok) {
			return fail(400, {
				action: 'editMessageReplyMarkup' as const,
				success: false as const,
				fields,
				replyMarkupErrors: replyMarkup.errors
			});
		}
		if (replyMarkup.value && !('inline_keyboard' in replyMarkup.value)) {
			return fail(400, {
				action: 'editMessageReplyMarkup' as const,
				success: false as const,
				fields,
				replyMarkupErrors: { replyMarkup: 'Only inline keyboards can be edited.' }
			});
		}
		const prepared = prepareEditMessageReplyMarkup({
			...fields,
			replyMarkup: replyMarkup.value
		});
		if (!prepared.ok) {
			return fail(400, {
				action: 'editMessageReplyMarkup' as const,
				success: false as const,
				fields,
				fieldErrors: prepared.errors
			});
		}

		try {
			const response = await createTelegramClient(fetch).editMessageReplyMarkup(prepared.request);
			return {
				action: 'editMessageReplyMarkup' as const,
				success: true as const,
				fields,
				response
			};
		} catch (error) {
			return methodTelegramFailure('editMessageReplyMarkup', fields, error);
		}
	},
	setMessageReaction: async ({ request, fetch }) => {
		const formData = await request.formData();
		const fields = {
			chatId: String(formData.get('chatId') ?? ''),
			messageId: String(formData.get('messageId') ?? ''),
			reactionKind: String(formData.get('reactionKind') ?? 'none') as
				| 'none'
				| 'emoji'
				| 'custom_emoji',
			emoji: String(formData.get('emoji') ?? ''),
			customEmojiId: String(formData.get('customEmojiId') ?? ''),
			isBig: String(formData.get('isBig') === 'true')
		};
		const prepared = prepareSetMessageReaction({
			...fields,
			isBig: fields.isBig === 'true'
		});
		if (!prepared.ok) {
			return fail(400, {
				action: 'setMessageReaction' as const,
				success: false as const,
				fields,
				fieldErrors: prepared.errors
			});
		}

		try {
			const response = await createTelegramClient(fetch).setMessageReaction(prepared.request);
			return { action: 'setMessageReaction' as const, success: true as const, fields, response };
		} catch (error) {
			return methodTelegramFailure('setMessageReaction', fields, error);
		}
	}
} satisfies Actions;

type MediaAction =
	| 'sendPhoto'
	| 'sendDocument'
	| 'sendVoice'
	| 'sendAudio'
	| 'sendVideo'
	| 'sendVideoNote'
	| 'sendAnimation';

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

function advancedMediaFields(formData: FormData, mediaName: string) {
	return {
		...mediaFields(formData, mediaName),
		performer: String(formData.get('performer') ?? ''),
		title: String(formData.get('title') ?? ''),
		width: String(formData.get('width') ?? ''),
		height: String(formData.get('height') ?? ''),
		length: String(formData.get('length') ?? ''),
		thumbnailReference: '',
		supportsStreaming: String(formData.get('supportsStreaming') === 'true')
	};
}

function contactFields(formData: FormData) {
	return {
		chatId: String(formData.get('chatId') ?? ''),
		phoneNumber: String(formData.get('phoneNumber') ?? ''),
		firstName: String(formData.get('firstName') ?? ''),
		lastName: String(formData.get('lastName') ?? ''),
		vcard: String(formData.get('vcard') ?? ''),
		replyMarkup: String(formData.get('replyMarkup') ?? '')
	};
}

function locationFields(formData: FormData) {
	return {
		chatId: String(formData.get('chatId') ?? ''),
		latitude: String(formData.get('latitude') ?? ''),
		longitude: String(formData.get('longitude') ?? ''),
		horizontalAccuracy: String(formData.get('horizontalAccuracy') ?? ''),
		livePeriod: String(formData.get('livePeriod') ?? ''),
		heading: String(formData.get('heading') ?? ''),
		proximityAlertRadius: String(formData.get('proximityAlertRadius') ?? ''),
		replyMarkup: String(formData.get('replyMarkup') ?? '')
	};
}

function venueFields(formData: FormData) {
	return {
		chatId: String(formData.get('chatId') ?? ''),
		latitude: String(formData.get('latitude') ?? ''),
		longitude: String(formData.get('longitude') ?? ''),
		title: String(formData.get('title') ?? ''),
		address: String(formData.get('address') ?? ''),
		foursquareId: String(formData.get('foursquareId') ?? ''),
		foursquareType: String(formData.get('foursquareType') ?? ''),
		googlePlaceId: String(formData.get('googlePlaceId') ?? ''),
		googlePlaceType: String(formData.get('googlePlaceType') ?? ''),
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

function optionalFile(formData: FormData, name: string) {
	const value = formData.get(name);
	return value instanceof File && value.name ? value : undefined;
}

function optionalNumber(value: string) {
	return value.trim() ? Number(value) : undefined;
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
	Action extends
		| 'sendPoll'
		| 'sendDice'
		| 'sendMediaGroup'
		| 'sendRichMessage'
		| 'sendContact'
		| 'sendLocation'
		| 'sendVenue'
		| 'answerCallbackQuery'
		| 'editMessageReplyMarkup'
		| 'setMessageReaction',
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

function methodValidationFailure<Action extends 'sendContact' | 'sendLocation' | 'sendVenue', Fields>(
	action: Action,
	fields: Fields,
	fieldErrors: Record<string, string>
) {
	return fail(400, { action, success: false as const, fields, fieldErrors });
}

function replyMarkupFailure<Action extends 'sendContact' | 'sendLocation' | 'sendVenue', Fields>(
	action: Action,
	fields: Fields,
	replyMarkupErrors: Record<string, string>
) {
	return fail(400, { action, success: false as const, fields, replyMarkupErrors });
}

function messageOptionsFailure<Action extends MediaAction | 'sendMessage' | 'sendContact' | 'sendLocation' | 'sendVenue' | 'sendPoll' | 'sendDice' | 'sendMediaGroup' | 'sendRichMessage', Fields>(
	action: Action,
	fields: Fields,
	messageOptionsErrors: Record<string, string>
) {
	return fail(400, { action, success: false as const, fields, messageOptionsErrors });
}

function stringEntries(formData: FormData, name: string) {
	return formData.getAll(name).map((value) => String(value));
}
