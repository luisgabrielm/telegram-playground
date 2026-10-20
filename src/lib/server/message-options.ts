import {
	emptyMessageOptionsFields,
	normalizeMessageOptionsFields,
	serializeMessageOptions,
	type MessageOptionsFields,
	type NormalizeMessageOptionsResult,
	type NormalizedMessageOptions
} from '$lib/message-options';

export type ParseMessageOptionsResult = NormalizeMessageOptionsResult & {
	fields: MessageOptionsFields;
};

export function readMessageOptionsFields(formData: FormData): MessageOptionsFields {
	const fields = emptyMessageOptionsFields();

	for (const name of Object.keys(fields) as (keyof MessageOptionsFields)[]) {
		fields[name] = String(formData.get(name) ?? '');
	}

	return fields;
}

export function parseMessageOptions(formData: FormData): ParseMessageOptionsResult {
	const fields = readMessageOptionsFields(formData);
	return { ...normalizeMessageOptionsFields(fields), fields } as ParseMessageOptionsResult;
}

export function appendMessageOptionsToJson<T extends Record<string, unknown>>(
	body: T,
	options: NormalizedMessageOptions,
	includeParseMode = true
): T & Record<string, unknown> {
	return Object.assign(body, serializeMessageOptions(options, includeParseMode));
}

export function appendMessageOptionsToFormData(
	body: FormData,
	options: NormalizedMessageOptions,
	includeParseMode = true
): FormData {
	const payload = serializeMessageOptions(options, includeParseMode);

	if (payload.parse_mode) body.set('parse_mode', payload.parse_mode);
	if (payload.reply_parameters) {
		body.set('reply_parameters', JSON.stringify(payload.reply_parameters));
	}
	if (payload.protect_content) body.set('protect_content', 'true');
	if (payload.disable_notification) body.set('disable_notification', 'true');
	if (payload.message_effect_id) body.set('message_effect_id', payload.message_effect_id);

	return body;
}
