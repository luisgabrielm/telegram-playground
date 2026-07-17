import { json } from '@sveltejs/kit';
import { updateStore } from '$lib/server/update-store';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	return json({ entries: updateStore.list() });
};

export const DELETE: RequestHandler = () => {
	updateStore.clear();
	return json({ ok: true });
};
