import type { TelegramReplyMarkup } from '$lib/reply-markup';

export const TELEGRAM_DOCUMENT_CAPTION_MAX_LENGTH = 1024;
export const TELEGRAM_DOCUMENT_MAX_BYTES = 50 * 1024 * 1024;

export interface SendDocumentFields {
	chatId: string;
	document: string | File | null;
	caption: string;
	replyMarkup?: TelegramReplyMarkup;
}

export interface SendDocumentFieldErrors {
	chatId?: string;
	document?: string;
	caption?: string;
}

export interface SendDocumentJsonBody {
	chat_id: string;
	document: string;
	caption?: string;
	reply_markup?: TelegramReplyMarkup;
}

export type PreparedSendDocumentRequest =
	| {
			method: 'sendDocument';
			encoding: 'json';
			body: SendDocumentJsonBody;
	  }
	| {
			method: 'sendDocument';
			encoding: 'multipart';
			body: FormData;
	  };

export type SendDocumentPreparation =
	| {
			ok: false;
			errors: SendDocumentFieldErrors;
	  }
	| {
			ok: true;
			request: PreparedSendDocumentRequest;
	  };

export function validateSendDocument(fields: SendDocumentFields) {
	const errors: SendDocumentFieldErrors = {};

	if (!fields.chatId.trim()) {
		errors.chatId = 'Enter a chat ID or channel username.';
	}

	if (typeof fields.document === 'string') {
		if (!fields.document.trim()) {
			errors.document = 'Enter a Telegram file ID or HTTP URL, or choose a document.';
		}
	} else if (fields.document === null) {
		errors.document = 'Enter a Telegram file ID or HTTP URL, or choose a document.';
	} else if (fields.document.size === 0) {
		errors.document = 'Choose a document that is not empty.';
	} else if (fields.document.size > TELEGRAM_DOCUMENT_MAX_BYTES) {
		errors.document = 'Document uploads can contain at most 50 MB.';
	}

	if (fields.caption.length > TELEGRAM_DOCUMENT_CAPTION_MAX_LENGTH) {
		errors.caption = `Captions can contain at most ${TELEGRAM_DOCUMENT_CAPTION_MAX_LENGTH.toLocaleString()} characters.`;
	}

	return {
		valid: Object.keys(errors).length === 0,
		errors
	};
}

export function prepareSendDocument(fields: SendDocumentFields): SendDocumentPreparation {
	const validation = validateSendDocument(fields);

	if (!validation.valid) {
		return {
			ok: false,
			errors: validation.errors
		};
	}

	const chatId = fields.chatId.trim();
	const caption = fields.caption.trim() ? fields.caption : undefined;

	if (typeof fields.document === 'string') {
		return {
			ok: true,
			request: {
				method: 'sendDocument',
				encoding: 'json',
				body: {
					chat_id: chatId,
					document: fields.document.trim(),
					...(caption === undefined ? {} : { caption }),
					...(fields.replyMarkup === undefined ? {} : { reply_markup: fields.replyMarkup })
				}
			}
		};
	}

	const body = new FormData();
	body.set('chat_id', chatId);
	body.set('document', fields.document as File);

	if (caption !== undefined) {
		body.set('caption', caption);
	}
	if (fields.replyMarkup !== undefined) {
		body.set('reply_markup', JSON.stringify(fields.replyMarkup));
	}

	return {
		ok: true,
		request: {
			method: 'sendDocument',
			encoding: 'multipart',
			body
		}
	};
}
