import type { TelegramReplyMarkup } from '$lib/reply-markup';
import type { InputRichBlock, InputRichMessage } from '$lib/rich-message';

export type PreparedSendRichMessageRequest = {
	method: 'sendRichMessage';
	body: {
		chat_id: string;
		rich_message: InputRichMessage;
		reply_markup?: TelegramReplyMarkup;
	};
};

export type RichMessageFieldErrors = Record<string, string>;

export function parseRichMessageBlocks(value: string):
	| { ok: true; value: InputRichBlock[] }
	| { ok: false; errors: RichMessageFieldErrors } {
	if (!value.trim()) return { ok: false, errors: { blocks: 'Add at least one content block.' } };

	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		return { ok: false, errors: { blocks: 'The rich-message block payload is invalid JSON.' } };
	}

	const errors: RichMessageFieldErrors = {};
	if (!Array.isArray(parsed) || parsed.length === 0) {
		return { ok: false, errors: { blocks: 'Add at least one content block.' } };
	}

	parsed.forEach((block, index) => validateBlock(block, `blocks.${index}`, errors));
	return Object.keys(errors).length > 0
		? { ok: false, errors }
		: { ok: true, value: parsed as InputRichBlock[] };
}

export function prepareSendRichMessage(input: {
	chatId: string;
	blocks: InputRichBlock[];
	isRtl?: boolean;
	skipEntityDetection?: boolean;
	replyMarkup?: TelegramReplyMarkup;
}): { ok: true; request: PreparedSendRichMessageRequest } | { ok: false; errors: RichMessageFieldErrors } {
	const errors: RichMessageFieldErrors = {};
	if (!input.chatId.trim()) errors.chatId = 'Enter a chat ID or channel username.';
	if (input.blocks.length === 0) errors.blocks = 'Add at least one content block.';
	input.blocks.forEach((block, index) => validateBlock(block, `blocks.${index}`, errors));
	if (Object.keys(errors).length > 0) return { ok: false, errors };

	return {
		ok: true,
		request: {
			method: 'sendRichMessage',
			body: {
				chat_id: input.chatId.trim(),
				rich_message: {
					blocks: input.blocks,
					...(input.isRtl ? { is_rtl: true as const } : {}),
					...(input.skipEntityDetection ? { skip_entity_detection: true as const } : {})
				},
				...(input.replyMarkup ? { reply_markup: input.replyMarkup } : {})
			}
		}
	};
}

function validateBlock(value: unknown, path: string, errors: RichMessageFieldErrors) {
	if (!isRecord(value) || typeof value.type !== 'string') {
		errors[path] = 'Choose a supported rich-message block.';
		return;
	}

	if (value.type === 'paragraph') {
		validateText(value.text, `${path}.text`, errors);
		validateKeys(value, ['type', 'text'], path, errors);
		return;
	}

	if (value.type === 'heading') {
		validateText(value.text, `${path}.text`, errors);
		if (!Number.isInteger(value.size) || Number(value.size) < 1 || Number(value.size) > 6) {
			errors[`${path}.size`] = 'Heading size must be from 1 to 6.';
		}
		validateKeys(value, ['type', 'text', 'size'], path, errors);
		return;
	}

	if (value.type === 'pre') {
		validateText(value.text, `${path}.text`, errors);
		if (value.language !== undefined && typeof value.language !== 'string') {
			errors[`${path}.language`] = 'Code language must be text.';
		}
		validateKeys(value, ['type', 'text', 'language'], path, errors);
		return;
	}

	if (value.type === 'list') {
		if (!Array.isArray(value.items) || value.items.length === 0) {
			errors[`${path}.items`] = 'Add at least one list item.';
		} else {
			value.items.forEach((item, index) => {
				const itemPath = `${path}.items.${index}`;
				if (!isRecord(item) || !Array.isArray(item.blocks) || item.blocks.length === 0) {
					errors[itemPath] = 'List items must contain at least one block.';
					return;
				}
				item.blocks.forEach((block, blockIndex) =>
					validateBlock(block, `${itemPath}.blocks.${blockIndex}`, errors)
				);
				if (item.value !== undefined && (!Number.isInteger(item.value) || Number(item.value) < 1)) {
					errors[`${itemPath}.value`] = 'Ordered-list values must be positive integers.';
				}
				if (item.type !== undefined && item.type !== '1') {
					errors[`${itemPath}.type`] = 'Only decimal ordered lists are supported here.';
				}
				validateKeys(item, ['blocks', 'value', 'type'], itemPath, errors);
			});
		}
		validateKeys(value, ['type', 'items'], path, errors);
		return;
	}

	if (value.type === 'blockquote') {
		validateBlockArray(value.blocks, `${path}.blocks`, errors);
		if (value.credit !== undefined) validateText(value.credit, `${path}.credit`, errors);
		validateKeys(value, ['type', 'blocks', 'credit'], path, errors);
		return;
	}

	if (value.type === 'table') {
		validateTable(value, path, errors);
		validateKeys(value, ['type', 'cells', 'is_bordered', 'is_striped'], path, errors);
		return;
	}

	errors[path] = 'Choose a supported rich-message block.';
}

function validateText(value: unknown, path: string, errors: RichMessageFieldErrors) {
	if (typeof value === 'string') {
		if (!value.trim()) errors[path] = 'Enter text.';
		return;
	}
	if (Array.isArray(value)) {
		if (value.length === 0) errors[path] = 'Enter text.';
		else value.forEach((part, index) => validateText(part, `${path}.${index}`, errors));
		return;
	}
	if (isRecord(value) && value.type === 'url') {
		validateText(value.text, `${path}.text`, errors);
		if (typeof value.url !== 'string' || !isSupportedUrl(value.url)) {
			errors[`${path}.url`] = 'Enter an HTTP, HTTPS, or tg:// URL.';
		}
		validateKeys(value, ['type', 'text', 'url'], path, errors);
		return;
	}
	errors[path] = 'Enter supported rich text.';
}

function validateBlockArray(value: unknown, path: string, errors: RichMessageFieldErrors) {
	if (!Array.isArray(value) || value.length === 0) {
		errors[path] = 'Add at least one nested block.';
		return;
	}
	value.forEach((block, index) => validateBlock(block, `${path}.${index}`, errors));
}

function validateTable(value: Record<string, unknown>, path: string, errors: RichMessageFieldErrors) {
	if (!Array.isArray(value.cells) || value.cells.length === 0) {
		errors[`${path}.cells`] = 'Add at least one table row.';
		return;
	}
	let width: number | undefined;
	value.cells.forEach((row, rowIndex) => {
		if (!Array.isArray(row) || row.length === 0) {
			errors[`${path}.cells.${rowIndex}`] = 'Table rows must contain at least one cell.';
			return;
		}
		width ??= row.length;
		if (row.length !== width) errors[`${path}.cells.${rowIndex}`] = 'Table rows must have equal widths.';
		row.forEach((cell, cellIndex) => {
			const cellPath = `${path}.cells.${rowIndex}.${cellIndex}`;
			if (!isRecord(cell)) {
				errors[cellPath] = 'Table cells must be objects.';
				return;
			}
			if (cell.text !== undefined) validateText(cell.text, `${cellPath}.text`, errors);
			if (!['left', 'center', 'right'].includes(String(cell.align))) {
				errors[`${cellPath}.align`] = 'Choose a horizontal alignment.';
			}
			if (!['top', 'middle', 'bottom'].includes(String(cell.valign))) {
				errors[`${cellPath}.valign`] = 'Choose a vertical alignment.';
			}
			validateKeys(cell, ['text', 'is_header', 'align', 'valign'], cellPath, errors);
		});
	});
}

function validateKeys(
	value: Record<string, unknown>,
	allowed: string[],
	path: string,
	errors: RichMessageFieldErrors
) {
	if (Object.keys(value).some((key) => !allowed.includes(key))) {
		errors[path] = 'This block contains unsupported fields.';
	}
}

function isSupportedUrl(value: string) {
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'tg:';
	} catch {
		return false;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
