import { env } from '$env/dynamic/private';
import type {
	TelegramApiFailure,
	TelegramApiResponse,
	TelegramApiSuccess,
	TelegramMessage,
	TelegramUser
} from '$lib/telegram';
import type { PreparedSendDocumentRequest } from './methods/document';
import type { PreparedSendPhotoRequest, TelegramPhotoMessage } from './methods/photo';
import type { PreparedSendVoiceRequest, TelegramVoiceMessage } from './methods/voice';

const TELEGRAM_API_BASE_URL = 'https://api.telegram.org';

type TelegramMethod = 'getMe' | 'sendMessage' | 'sendPhoto' | 'sendDocument' | 'sendVoice';
type PreparedMediaRequest =
	| PreparedSendPhotoRequest
	| PreparedSendDocumentRequest
	| PreparedSendVoiceRequest;

export class TelegramClientError extends Error {
	readonly response?: TelegramApiFailure;

	constructor(message: string, response?: TelegramApiFailure) {
		super(message);
		this.name = 'TelegramClientError';
		this.response = response;
	}
}

export class TelegramClient {
	readonly #token: string;
	readonly #fetch: typeof fetch;

	constructor(token: string | undefined, fetcher: typeof fetch = globalThis.fetch) {
		const normalizedToken = token?.trim();

		if (!normalizedToken) {
			throw new TelegramClientError(
				'Telegram is not configured. Add TELEGRAM_BOT_TOKEN to your .env file.'
			);
		}

		this.#token = normalizedToken;
		this.#fetch = fetcher;
	}

	getMe(): Promise<TelegramApiSuccess<TelegramUser>> {
		return this.#request<TelegramUser>('getMe');
	}

	sendMessage(chatId: string, text: string): Promise<TelegramApiSuccess<TelegramMessage>> {
		return this.#request<TelegramMessage>('sendMessage', {
			chat_id: chatId,
			text
		});
	}

	sendPhoto(request: PreparedSendPhotoRequest): Promise<TelegramApiSuccess<TelegramPhotoMessage>> {
		return this.#sendPrepared<TelegramPhotoMessage>(request);
	}

	sendDocument(request: PreparedSendDocumentRequest): Promise<TelegramApiSuccess<TelegramMessage>> {
		return this.#sendPrepared<TelegramMessage>(request);
	}

	sendVoice(request: PreparedSendVoiceRequest): Promise<TelegramApiSuccess<TelegramVoiceMessage>> {
		return this.#sendPrepared<TelegramVoiceMessage>(request);
	}

	#sendPrepared<T>(request: PreparedMediaRequest) {
		return this.#request<T>(request.method, request.body);
	}

	async #request<T>(method: TelegramMethod, body?: object | FormData) {
		let response: Response;
		const isMultipart = body instanceof FormData;

		try {
			response = await this.#fetch(`${TELEGRAM_API_BASE_URL}/bot${this.#token}/${method}`, {
				method: 'POST',
				headers: body && !isMultipart ? { 'content-type': 'application/json' } : undefined,
				body: isMultipart ? body : body ? JSON.stringify(body) : undefined
			});
		} catch {
			throw new TelegramClientError(
				'Telegram could not be reached. Check your connection and try again.'
			);
		}

		let payload: TelegramApiResponse<T>;

		try {
			payload = (await response.json()) as TelegramApiResponse<T>;
		} catch {
			throw new TelegramClientError('Telegram returned an unreadable response. Try again.');
		}

		if (!isTelegramApiResponse(payload)) {
			throw new TelegramClientError('Telegram returned an unexpected response. Try again.');
		}

		if (!response.ok || !payload.ok) {
			const failure: TelegramApiFailure = payload.ok
				? { ok: false, error_code: response.status }
				: payload;
			const description = sanitize(failure.description ?? 'The request was rejected.', this.#token);

			throw new TelegramClientError(`Telegram rejected the request: ${description}`, failure);
		}

		return payload;
	}
}

export function isTelegramConfigured() {
	return Boolean(env.TELEGRAM_BOT_TOKEN?.trim());
}

export function createTelegramClient(fetcher?: typeof fetch) {
	return new TelegramClient(env.TELEGRAM_BOT_TOKEN, fetcher);
}

export function getPublicTelegramError(error: unknown) {
	if (error instanceof TelegramClientError) {
		return {
			message: error.message,
			response: error.response
		};
	}

	return {
		message: 'An unexpected server error occurred. Try again.',
		response: undefined
	};
}

function isTelegramApiResponse<T>(value: unknown): value is TelegramApiResponse<T> {
	return typeof value === 'object' && value !== null && 'ok' in value && typeof value.ok === 'boolean';
}

function sanitize(value: string, token: string) {
	return value.split(token).join('[redacted]');
}
