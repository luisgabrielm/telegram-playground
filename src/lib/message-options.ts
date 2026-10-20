export type TelegramParseMode = 'HTML' | 'MarkdownV2';

export interface MessageOptionsFields {
	parseMode: string;
	replyEnabled: string;
	replyMessageId: string;
	allowSendingWithoutReply: string;
	quote: string;
	quoteParseMode: string;
	quotePosition: string;
	protectContent: string;
	disableNotification: string;
	messageEffectId: string;
}

export interface MessageOptionsEditorValue {
	parseMode: '' | TelegramParseMode;
	replyEnabled: boolean;
	replyMessageId: string;
	allowSendingWithoutReply: boolean;
	quote: string;
	quoteParseMode: '' | TelegramParseMode;
	quotePosition: string;
	protectContent: boolean;
	disableNotification: boolean;
	messageEffectId: string;
}

export interface TelegramReplyParameters {
	messageId: number;
	allowSendingWithoutReply?: true;
	quote?: string;
	quoteParseMode?: TelegramParseMode;
	quotePosition?: number;
}

export interface NormalizedMessageOptions {
	parseMode?: TelegramParseMode;
	replyParameters?: TelegramReplyParameters;
	protectContent?: true;
	disableNotification?: true;
	messageEffectId?: string;
}

export interface TelegramReplyParametersPayload {
	message_id: number;
	allow_sending_without_reply?: true;
	quote?: string;
	quote_parse_mode?: TelegramParseMode;
	quote_position?: number;
}

export interface TelegramMessageOptionsPayload {
	parse_mode?: TelegramParseMode;
	reply_parameters?: TelegramReplyParametersPayload;
	protect_content?: true;
	disable_notification?: true;
	message_effect_id?: string;
}

export type MessageOptionsFieldErrors = Partial<Record<keyof MessageOptionsFields, string>>;

export type NormalizeMessageOptionsResult =
	| { ok: true; value: NormalizedMessageOptions }
	| { ok: false; errors: MessageOptionsFieldErrors };

export function emptyMessageOptionsFields(): MessageOptionsFields {
	return {
		parseMode: '',
		replyEnabled: '',
		replyMessageId: '',
		allowSendingWithoutReply: '',
		quote: '',
		quoteParseMode: '',
		quotePosition: '',
		protectContent: '',
		disableNotification: '',
		messageEffectId: ''
	};
}

export function createMessageOptionsValue(
	fields: Partial<MessageOptionsFields> = {}
): MessageOptionsEditorValue {
	return {
		parseMode: parseModeValue(fields.parseMode),
		replyEnabled: fields.replyEnabled === 'true',
		replyMessageId: fields.replyMessageId ?? '',
		allowSendingWithoutReply: fields.allowSendingWithoutReply === 'true',
		quote: fields.quote ?? '',
		quoteParseMode: parseModeValue(fields.quoteParseMode),
		quotePosition: fields.quotePosition ?? '',
		protectContent: fields.protectContent === 'true',
		disableNotification: fields.disableNotification === 'true',
		messageEffectId: fields.messageEffectId ?? ''
	};
}

export function messageOptionsValueToFields(value: MessageOptionsEditorValue): MessageOptionsFields {
	return {
		parseMode: value.parseMode,
		replyEnabled: value.replyEnabled ? 'true' : '',
		replyMessageId: value.replyMessageId,
		allowSendingWithoutReply: value.allowSendingWithoutReply ? 'true' : '',
		quote: value.quote,
		quoteParseMode: value.quoteParseMode,
		quotePosition: value.quotePosition,
		protectContent: value.protectContent ? 'true' : '',
		disableNotification: value.disableNotification ? 'true' : '',
		messageEffectId: value.messageEffectId
	};
}

export function normalizeMessageOptionsFields(
	fields: MessageOptionsFields
): NormalizeMessageOptionsResult {
	const errors: MessageOptionsFieldErrors = {};
	const parseMode = validateParseMode(fields.parseMode, 'parseMode', errors);
	const quoteParseMode = validateParseMode(fields.quoteParseMode, 'quoteParseMode', errors);
	const value: NormalizedMessageOptions = {};

	if (parseMode) value.parseMode = parseMode;
	if (fields.protectContent === 'true') value.protectContent = true;
	if (fields.disableNotification === 'true') value.disableNotification = true;

	const messageEffectId = fields.messageEffectId.trim();
	if (messageEffectId) value.messageEffectId = messageEffectId;

	if (fields.replyEnabled === 'true') {
		const messageId = positiveInteger(fields.replyMessageId);
		if (messageId === undefined) {
			errors.replyMessageId = 'Enter a positive message ID.';
		}

		const hasQuote = fields.quote.length > 0;
		if (!hasQuote && fields.quoteParseMode) {
			errors.quoteParseMode = 'Enter quote text before choosing its format.';
		}
		if (!hasQuote && fields.quotePosition.trim()) {
			errors.quotePosition = 'Enter quote text before setting its position.';
		}

		let quotePosition: number | undefined;
		if (fields.quotePosition.trim()) {
			quotePosition = nonnegativeInteger(fields.quotePosition);
			if (quotePosition === undefined) {
				errors.quotePosition = 'Enter a nonnegative whole number.';
			}
		}

		if (messageId !== undefined) {
			value.replyParameters = {
				messageId,
				...(fields.allowSendingWithoutReply === 'true'
					? { allowSendingWithoutReply: true as const }
					: {}),
				...(hasQuote ? { quote: fields.quote } : {}),
				...(hasQuote && quoteParseMode ? { quoteParseMode } : {}),
				...(hasQuote && quotePosition !== undefined ? { quotePosition } : {})
			};
		}
	}

	return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

export function serializeMessageOptions(
	options: NormalizedMessageOptions,
	includeParseMode = true
): TelegramMessageOptionsPayload {
	const reply = options.replyParameters;

	return {
		...(includeParseMode && options.parseMode ? { parse_mode: options.parseMode } : {}),
		...(reply
			? {
					reply_parameters: {
						message_id: reply.messageId,
						...(reply.allowSendingWithoutReply
							? { allow_sending_without_reply: true as const }
							: {}),
						...(reply.quote !== undefined ? { quote: reply.quote } : {}),
						...(reply.quoteParseMode ? { quote_parse_mode: reply.quoteParseMode } : {}),
						...(reply.quotePosition !== undefined ? { quote_position: reply.quotePosition } : {})
					}
				}
			: {}),
		...(options.protectContent ? { protect_content: true as const } : {}),
		...(options.disableNotification ? { disable_notification: true as const } : {}),
		...(options.messageEffectId ? { message_effect_id: options.messageEffectId } : {})
	};
}

function validateParseMode(
	value: string,
	field: 'parseMode' | 'quoteParseMode',
	errors: MessageOptionsFieldErrors
): TelegramParseMode | undefined {
	if (!value) return undefined;
	if (value === 'HTML' || value === 'MarkdownV2') return value;
	errors[field] = 'Choose HTML or MarkdownV2.';
	return undefined;
}

function positiveInteger(value: string): number | undefined {
	if (!/^[1-9]\d*$/.test(value.trim())) return undefined;
	const result = Number(value.trim());
	return Number.isSafeInteger(result) ? result : undefined;
}

function nonnegativeInteger(value: string): number | undefined {
	if (!/^\d+$/.test(value.trim())) return undefined;
	const result = Number(value.trim());
	return Number.isSafeInteger(result) ? result : undefined;
}

function parseModeValue(value: string | undefined): '' | TelegramParseMode {
	return value === 'HTML' || value === 'MarkdownV2' ? value : '';
}
