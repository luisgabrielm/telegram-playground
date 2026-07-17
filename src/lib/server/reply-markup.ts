import type {
	ForceReply,
	InlineKeyboardButton,
	InlineKeyboardMarkup,
	ReplyKeyboardButton,
	ReplyKeyboardMarkup,
	ReplyKeyboardRemove,
	TelegramReplyMarkup
} from '$lib/reply-markup';

const COPY_TEXT_MAX_LENGTH = 256;
const CALLBACK_DATA_MAX_BYTES = 64;
const PLACEHOLDER_MAX_LENGTH = 64;

export type ReplyMarkupFieldErrors = Record<string, string> & { replyMarkup: string };

export type ParseReplyMarkupResult =
	| { ok: true; value?: TelegramReplyMarkup }
	| { ok: false; errors: ReplyMarkupFieldErrors };

class ReplyMarkupValidationError extends Error {
	constructor(
		message: string,
		readonly path = 'reply_markup'
	) {
		super(message);
	}
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertObject(value: unknown, path: string): Record<string, unknown> {
	if (!isObject(value)) {
		throw new ReplyMarkupValidationError('Must be an object.', path);
	}

	return value;
}

function assertOnlyKeys(value: Record<string, unknown>, allowed: readonly string[], path: string) {
	const unknownKey = Object.keys(value).find((key) => !allowed.includes(key));

	if (unknownKey) {
		throw new ReplyMarkupValidationError(`Unsupported property "${unknownKey}".`, `${path}.${unknownKey}`);
	}
}

function assertNonEmptyLabel(value: unknown, path: string): string {
	if (typeof value !== 'string' || value.trim().length === 0) {
		throw new ReplyMarkupValidationError('Enter a button label.', path);
	}

	return value;
}

function characterCount(value: string) {
	return Array.from(value).length;
}

function parsePlaceholder(value: unknown, path: string): string {
	if (typeof value !== 'string') {
		throw new ReplyMarkupValidationError('Must be text.', path);
	}

	const length = characterCount(value);
	if (length < 1 || length > PLACEHOLDER_MAX_LENGTH) {
		throw new ReplyMarkupValidationError(
			`Must contain between 1 and ${PLACEHOLDER_MAX_LENGTH} characters.`,
			path
		);
	}

	return value;
}

function parseBoolean(value: unknown, path: string): boolean {
	if (typeof value !== 'boolean') {
		throw new ReplyMarkupValidationError('Must be true or false.', path);
	}

	return value;
}

function parseInlineButton(value: unknown, path: string): InlineKeyboardButton {
	const button = assertObject(value, path);
	assertOnlyKeys(button, ['text', 'url', 'copy_text', 'callback_data'], path);

	const text = assertNonEmptyLabel(button.text, `${path}.text`);
	const actions = ['url', 'copy_text', 'callback_data'].filter((key) => key in button);

	if (actions.length !== 1) {
		throw new ReplyMarkupValidationError('Choose exactly one button action.', path);
	}

	if ('url' in button) {
		if (typeof button.url !== 'string') {
			throw new ReplyMarkupValidationError('Must be a URL.', `${path}.url`);
		}

		let parsedUrl: URL;
		try {
			parsedUrl = new URL(button.url);
		} catch {
			throw new ReplyMarkupValidationError('Enter a valid HTTP, HTTPS, or tg:// URL.', `${path}.url`);
		}

		if (!['http:', 'https:', 'tg:'].includes(parsedUrl.protocol)) {
			throw new ReplyMarkupValidationError('Use an HTTP, HTTPS, or tg:// URL.', `${path}.url`);
		}

		return { text, url: button.url };
	}

	if ('copy_text' in button) {
		const copyText = assertObject(button.copy_text, `${path}.copy_text`);
		assertOnlyKeys(copyText, ['text'], `${path}.copy_text`);

		if (typeof copyText.text !== 'string') {
			throw new ReplyMarkupValidationError('Must be text.', `${path}.copy_text.text`);
		}

		const length = characterCount(copyText.text);
		if (length < 1 || length > COPY_TEXT_MAX_LENGTH) {
			throw new ReplyMarkupValidationError(
				`Must contain between 1 and ${COPY_TEXT_MAX_LENGTH} characters.`,
				`${path}.copy_text.text`
			);
		}

		return { text, copy_text: { text: copyText.text } };
	}

	if (typeof button.callback_data !== 'string') {
		throw new ReplyMarkupValidationError('Must be text.', `${path}.callback_data`);
	}

	const byteLength = new TextEncoder().encode(button.callback_data).byteLength;
	if (byteLength < 1 || byteLength > CALLBACK_DATA_MAX_BYTES) {
		throw new ReplyMarkupValidationError(
			`Must contain between 1 and ${CALLBACK_DATA_MAX_BYTES} UTF-8 bytes.`,
			`${path}.callback_data`
		);
	}

	return { text, callback_data: button.callback_data };
}

function parseRows<T>(
	value: unknown,
	path: string,
	parseButton: (button: unknown, path: string) => T
): T[][] {
	if (!Array.isArray(value) || value.length === 0) {
		throw new ReplyMarkupValidationError('Add at least one keyboard row.', path);
	}

	return value.map((row, rowIndex) => {
		const rowPath = `${path}[${rowIndex}]`;
		if (!Array.isArray(row) || row.length === 0) {
			throw new ReplyMarkupValidationError('Rows must contain at least one button.', rowPath);
		}

		return row.map((button, buttonIndex) =>
			parseButton(button, `${rowPath}[${buttonIndex}]`)
		);
	});
}

function parseInlineKeyboard(value: Record<string, unknown>): InlineKeyboardMarkup {
	assertOnlyKeys(value, ['inline_keyboard'], 'reply_markup');

	return {
		inline_keyboard: parseRows(value.inline_keyboard, 'reply_markup.inline_keyboard', parseInlineButton)
	};
}

function parseReplyKeyboardButton(value: unknown, path: string): ReplyKeyboardButton {
	const button = assertObject(value, path);
	assertOnlyKeys(button, ['text'], path);

	return { text: assertNonEmptyLabel(button.text, `${path}.text`) };
}

function parseReplyKeyboard(value: Record<string, unknown>): ReplyKeyboardMarkup {
	assertOnlyKeys(
		value,
		['keyboard', 'is_persistent', 'resize_keyboard', 'one_time_keyboard', 'input_field_placeholder'],
		'reply_markup'
	);

	const result: ReplyKeyboardMarkup = {
		keyboard: parseRows(value.keyboard, 'reply_markup.keyboard', parseReplyKeyboardButton)
	};

	if ('is_persistent' in value) {
		result.is_persistent = parseBoolean(value.is_persistent, 'reply_markup.is_persistent');
	}
	if ('resize_keyboard' in value) {
		result.resize_keyboard = parseBoolean(value.resize_keyboard, 'reply_markup.resize_keyboard');
	}
	if ('one_time_keyboard' in value) {
		result.one_time_keyboard = parseBoolean(value.one_time_keyboard, 'reply_markup.one_time_keyboard');
	}
	if ('input_field_placeholder' in value) {
		result.input_field_placeholder = parsePlaceholder(
			value.input_field_placeholder,
			'reply_markup.input_field_placeholder'
		);
	}

	return result;
}

function parseRemoveKeyboard(value: Record<string, unknown>): ReplyKeyboardRemove {
	assertOnlyKeys(value, ['remove_keyboard'], 'reply_markup');
	if (value.remove_keyboard !== true) {
		throw new ReplyMarkupValidationError('Must be true.', 'reply_markup.remove_keyboard');
	}

	return { remove_keyboard: true };
}

function parseForceReply(value: Record<string, unknown>): ForceReply {
	assertOnlyKeys(value, ['force_reply', 'input_field_placeholder'], 'reply_markup');
	if (value.force_reply !== true) {
		throw new ReplyMarkupValidationError('Must be true.', 'reply_markup.force_reply');
	}

	const result: ForceReply = { force_reply: true };
	if ('input_field_placeholder' in value) {
		result.input_field_placeholder = parsePlaceholder(
			value.input_field_placeholder,
			'reply_markup.input_field_placeholder'
		);
	}

	return result;
}

function validateReplyMarkup(value: unknown): TelegramReplyMarkup {
	const markup = assertObject(value, 'reply_markup');
	const modes = ['inline_keyboard', 'keyboard', 'remove_keyboard', 'force_reply'].filter(
		(key) => key in markup
	);

	if (modes.length !== 1) {
		throw new ReplyMarkupValidationError('Choose exactly one reply option mode.');
	}

	switch (modes[0]) {
		case 'inline_keyboard':
			return parseInlineKeyboard(markup);
		case 'keyboard':
			return parseReplyKeyboard(markup);
		case 'remove_keyboard':
			return parseRemoveKeyboard(markup);
		case 'force_reply':
			return parseForceReply(markup);
		default:
			throw new ReplyMarkupValidationError('Choose a supported reply option mode.');
	}
}

export function parseReplyMarkup(value: string): ParseReplyMarkupResult {
	if (!value.trim()) {
		return { ok: true };
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		return {
			ok: false,
			errors: { replyMarkup: 'Reply options contain malformed JSON.' }
		};
	}

	try {
		return { ok: true, value: validateReplyMarkup(parsed) };
	} catch (error) {
		if (error instanceof ReplyMarkupValidationError) {
			return {
				ok: false,
				errors: {
					replyMarkup: error.message,
					[error.path]: error.message
				}
			};
		}

		return {
			ok: false,
			errors: { replyMarkup: 'Reply options are invalid.' }
		};
	}
}

export { CALLBACK_DATA_MAX_BYTES, COPY_TEXT_MAX_LENGTH, PLACEHOLDER_MAX_LENGTH };
