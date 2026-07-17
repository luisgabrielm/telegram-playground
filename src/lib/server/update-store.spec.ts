import { describe, expect, it } from 'vitest';
import { getTelegramUpdateType, isTelegramUpdatePayload } from '$lib/updates';
import { UpdateStore } from './update-store';

describe('UpdateStore', () => {
	it('stores updates newest first', () => {
		const store = new UpdateStore();
		store.add({ update_id: 1, message: { text: 'first' } }, '2026-01-01T00:00:00.000Z');
		store.add({ update_id: 2, callback_query: { data: 'next' } }, '2026-01-01T00:00:01.000Z');

		expect(store.list().map((entry) => entry.updateId)).toEqual([2, 1]);
	});

	it('deduplicates update IDs', () => {
		const store = new UpdateStore();

		expect(store.add({ update_id: 1, message: {} }).stored).toBe(true);
		expect(store.add({ update_id: 1, edited_message: {} }).stored).toBe(false);
		expect(store.list()).toHaveLength(1);
	});

	it('retains only the configured number of newest entries', () => {
		const store = new UpdateStore(2);
		store.add({ update_id: 1, message: {} });
		store.add({ update_id: 2, message: {} });
		store.add({ update_id: 3, message: {} });

		expect(store.list().map((entry) => entry.updateId)).toEqual([3, 2]);
	});

	it('clears all entries and their deduplication keys', () => {
		const store = new UpdateStore();
		store.add({ update_id: 1, message: {} });

		store.clear();

		expect(store.list()).toEqual([]);
		expect(store.add({ update_id: 1, message: {} }).stored).toBe(true);
	});
});

describe('Telegram update helpers', () => {
	it('requires a JSON object with a finite numeric update_id', () => {
		expect(isTelegramUpdatePayload({ update_id: 42, message: {} })).toBe(true);
		expect(isTelegramUpdatePayload({ update_id: '42' })).toBe(false);
		expect(isTelegramUpdatePayload({ update_id: Number.NaN })).toBe(false);
		expect(isTelegramUpdatePayload([])).toBe(false);
	});

	it('uses the top-level update field as the display type', () => {
		expect(getTelegramUpdateType({ update_id: 42, callback_query: {} })).toBe('callback_query');
		expect(getTelegramUpdateType({ update_id: 43 })).toBe('unknown');
	});
});
