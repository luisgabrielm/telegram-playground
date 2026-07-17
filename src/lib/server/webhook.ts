import { json } from '@sveltejs/kit';
import { isTelegramUpdatePayload } from '$lib/updates';
import { updateStore, type UpdateStore } from './update-store';

const SECRET_HEADER = 'x-telegram-bot-api-secret-token';

export async function processWebhookRequest(
	request: Request,
	secret: string | undefined,
	store: UpdateStore = updateStore
): Promise<Response> {
	if (!isWebhookSecretValid(secret, request.headers.get(SECRET_HEADER))) {
		return json({ ok: false, error: 'Unauthorized webhook request.' }, { status: 401 });
	}

	let payload: unknown;

	try {
		payload = await request.json();
	} catch {
		return json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
	}

	if (!isTelegramUpdatePayload(payload)) {
		return json(
			{ ok: false, error: 'Payload must be a JSON object with a numeric update_id.' },
			{ status: 400 }
		);
	}

	const result = store.add(payload);

	return json({
		ok: true,
		stored: result.stored,
		updateId: payload.update_id
	});
}

export function isWebhookSecretValid(secret: string | undefined, header: string | null): boolean {
	const configuredSecret = secret?.trim();
	return !configuredSecret || header === configuredSecret;
}
