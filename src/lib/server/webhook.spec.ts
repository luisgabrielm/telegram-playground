import { describe, expect, it } from 'vitest';
import { UpdateStore } from './update-store';
import { processWebhookRequest } from './webhook';

const SECRET = 'test-webhook-secret';

describe('processWebhookRequest', () => {
	it('accepts and stores a valid update when no secret is configured', async () => {
		const store = new UpdateStore();
		const response = await processWebhookRequest(webhookRequest({ update_id: 1, message: {} }), undefined, store);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true, stored: true, updateId: 1 });
		expect(store.list()).toHaveLength(1);
	});

	it('acknowledges duplicate deliveries without storing them twice', async () => {
		const store = new UpdateStore();
		await processWebhookRequest(webhookRequest({ update_id: 1, message: {} }), undefined, store);
		const response = await processWebhookRequest(webhookRequest({ update_id: 1, message: {} }), undefined, store);

		expect(await response.json()).toEqual({ ok: true, stored: false, updateId: 1 });
		expect(store.list()).toHaveLength(1);
	});

	it('rejects malformed JSON', async () => {
		const store = new UpdateStore();
		const response = await processWebhookRequest(
			new Request('http://localhost/webhook', { method: 'POST', body: '{' }),
			undefined,
			store
		);

		expect(response.status).toBe(400);
		expect(store.list()).toEqual([]);
	});

	it.each([
		null,
		[],
		{},
		{ update_id: '1' },
		{ update_id: null }
	])('rejects an invalid update payload: %j', async (payload) => {
		const response = await processWebhookRequest(webhookRequest(payload), undefined, new UpdateStore());

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			ok: false,
			error: 'Payload must be a JSON object with a numeric update_id.'
		});
	});

	it('requires a matching header when a secret is configured', async () => {
		const missing = await processWebhookRequest(webhookRequest({ update_id: 1 }), SECRET, new UpdateStore());
		const incorrect = await processWebhookRequest(
			webhookRequest({ update_id: 1 }, 'incorrect'),
			SECRET,
			new UpdateStore()
		);
		const matching = await processWebhookRequest(
			webhookRequest({ update_id: 1 }, SECRET),
			SECRET,
			new UpdateStore()
		);

		expect(missing.status).toBe(401);
		expect(incorrect.status).toBe(401);
		expect(matching.status).toBe(200);
	});

	it('never includes the configured secret in an error response', async () => {
		const response = await processWebhookRequest(
			webhookRequest({ update_id: 1 }, 'incorrect'),
			SECRET,
			new UpdateStore()
		);

		expect(await response.text()).not.toContain(SECRET);
	});
});

function webhookRequest(payload: unknown, secret?: string) {
	return new Request('http://localhost/webhook', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			...(secret ? { 'x-telegram-bot-api-secret-token': secret } : {})
		},
		body: JSON.stringify(payload)
	});
}
