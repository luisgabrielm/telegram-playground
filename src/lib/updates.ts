export type JsonValue =
	| null
	| boolean
	| number
	| string
	| JsonValue[]
	| { [key: string]: JsonValue };

export type TelegramUpdatePayload = {
	update_id: number;
	[key: string]: JsonValue;
};

export type UpdateEntry = {
	updateId: number;
	receivedAt: string;
	payload: TelegramUpdatePayload;
};

export function isTelegramUpdatePayload(value: unknown): value is TelegramUpdatePayload {
	return isRecord(value) && typeof value.update_id === 'number' && Number.isFinite(value.update_id);
}

export function getTelegramUpdateType(payload: TelegramUpdatePayload): string {
	return Object.keys(payload).find((key) => key !== 'update_id') ?? 'unknown';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
