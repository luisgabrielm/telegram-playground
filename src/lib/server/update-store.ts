import type { TelegramUpdatePayload, UpdateEntry } from '$lib/updates';

export const UPDATE_HISTORY_LIMIT = 100;

export class UpdateStore {
	readonly #limit: number;
	readonly #entries: UpdateEntry[] = [];
	readonly #updateIds = new Set<number>();

	constructor(limit = UPDATE_HISTORY_LIMIT) {
		this.#limit = limit;
	}

	add(payload: TelegramUpdatePayload, receivedAt = new Date().toISOString()) {
		if (this.#updateIds.has(payload.update_id)) {
			return { stored: false as const };
		}

		const entry: UpdateEntry = {
			updateId: payload.update_id,
			receivedAt,
			payload
		};

		this.#entries.unshift(entry);
		this.#updateIds.add(entry.updateId);

		while (this.#entries.length > this.#limit) {
			const removed = this.#entries.pop();
			if (removed) this.#updateIds.delete(removed.updateId);
		}

		return { stored: true as const, entry };
	}

	list(): UpdateEntry[] {
		return [...this.#entries];
	}

	clear() {
		this.#entries.length = 0;
		this.#updateIds.clear();
	}
}

export const updateStore = new UpdateStore();
