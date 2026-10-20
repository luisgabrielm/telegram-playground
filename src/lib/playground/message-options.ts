import {
	messageOptionsValueToFields,
	normalizeMessageOptionsFields,
	serializeMessageOptions,
	type MessageOptionsEditorValue,
	type TelegramMessageOptionsPayload
} from '$lib/message-options';

export function buildMessageOptionsPayload(
	value: MessageOptionsEditorValue,
	includeParseMode = true
): TelegramMessageOptionsPayload {
	const normalized = normalizeMessageOptionsFields(messageOptionsValueToFields(value));
	if (!normalized.ok) return {};
	return serializeMessageOptions(normalized.value, includeParseMode);
}
