const TELEGRAM_MESSAGE_MAX_LENGTH = 4096;

export interface MessageFields {
	chatId: string;
	text: string;
}

export interface MessageFieldErrors {
	chatId?: string;
	text?: string;
}

export function validateMessage(fields: MessageFields) {
	const errors: MessageFieldErrors = {};

	if (!fields.chatId.trim()) {
		errors.chatId = 'Enter a chat ID or channel username.';
	}

	if (!fields.text.trim()) {
		errors.text = 'Enter a message to send.';
	} else if (fields.text.length > TELEGRAM_MESSAGE_MAX_LENGTH) {
		errors.text = `Messages can contain at most ${TELEGRAM_MESSAGE_MAX_LENGTH.toLocaleString()} characters.`;
	}

	return {
		valid: Object.keys(errors).length === 0,
		errors
	};
}

export { TELEGRAM_MESSAGE_MAX_LENGTH };
