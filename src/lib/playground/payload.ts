export type PayloadEncoding = 'json' | 'multipart';

export type FilePayloadPreview = {
	$file: {
		name: string;
		type: string;
		size: number;
		last_modified: string;
	} | null;
};

export type MediaPayloadInput = {
	chatId: string;
	mediaName: 'photo' | 'document' | 'voice';
	sourceType: 'reference' | 'upload';
	mediaReference: string;
	file: File | null;
	caption: string;
	duration?: string;
	hasSpoiler?: boolean;
};

export function buildSendMessagePayload(chatId: string, text: string) {
	return {
		chat_id: chatId.trim(),
		text
	};
}

export function buildMediaPayload(input: MediaPayloadInput): {
	encoding: PayloadEncoding;
	payload: Record<string, unknown>;
} {
	const encoding = input.sourceType === 'upload' ? 'multipart' : 'json';
	const media =
		input.sourceType === 'upload'
			? filePreview(input.file)
			: input.mediaReference.trim();
	const payload: Record<string, unknown> = {
		chat_id: input.chatId.trim(),
		[input.mediaName]: media
	};

	if (input.caption.trim()) payload.caption = input.caption;
	if (input.duration?.trim()) payload.duration = numericPreview(input.duration);
	if (input.hasSpoiler) payload.has_spoiler = true;

	return { encoding, payload };
}

function filePreview(file: File | null): FilePayloadPreview {
	if (!file) return { $file: null };

	return {
		$file: {
			name: file.name,
			type: file.type || 'application/octet-stream',
			size: file.size,
			last_modified: new Date(file.lastModified).toISOString()
		}
	};
}

function numericPreview(value: string) {
	const number = Number(value);
	return Number.isFinite(number) ? number : value;
}
