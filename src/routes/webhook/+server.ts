import { env } from '$env/dynamic/private';
import { processWebhookRequest } from '$lib/server/webhook';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ request }) => {
	return processWebhookRequest(request, env.TELEGRAM_WEBHOOK_SECRET);
};
