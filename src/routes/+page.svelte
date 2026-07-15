<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import { tick, untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import type { ActionData, PageProps } from './$types';

	type MethodId = 'getMe' | 'sendMessage';

	const methodGroups = [
		{
			label: 'Bot',
			methods: [{ id: 'getMe', label: 'Bot information', apiMethod: 'getMe' }]
		},
		{
			label: 'Messages',
			methods: [{ id: 'sendMessage', label: 'Text message', apiMethod: 'sendMessage' }]
		}
	] as const;

	let { data, form }: PageProps = $props();
	const initialForm = untrack(() => form);

	let activeMethod = $state<MethodId>(
		initialForm?.action === 'sendMessage' ? 'sendMessage' : 'getMe'
	);
	let getMePending = $state(false);
	let sendPending = $state(false);
	let getMeFeedback = $state<ActionData | null>(
		initialForm?.action === 'getMe' ? initialForm : null
	);
	let sendFeedback = $state<ActionData | null>(
		initialForm?.action === 'sendMessage' ? initialForm : null
	);
	let chatId = $state(
		initialForm?.action === 'sendMessage' ? (initialForm.fields?.chatId ?? '') : ''
	);
	let messageText = $state(
		initialForm?.action === 'sendMessage' ? (initialForm.fields?.text ?? '') : ''
	);
	let chatIdInput: HTMLInputElement | undefined;
	let messageTextInput: HTMLTextAreaElement | undefined;

	const captureChatIdInput: Attachment<HTMLInputElement> = (element) => {
		chatIdInput = element;

		return () => {
			chatIdInput = undefined;
		};
	};

	const captureMessageTextInput: Attachment<HTMLTextAreaElement> = (element) => {
		messageTextInput = element;

		return () => {
			messageTextInput = undefined;
		};
	};

	const enhanceGetMe: SubmitFunction = () => {
		getMePending = true;
		getMeFeedback = null;

		return async ({ result, update }) => {
			try {
				getMeFeedback = getActionData(result);
				await update({ reset: false, invalidateAll: false });
			} finally {
				getMePending = false;
			}
		};
	};

	const enhanceSendMessage: SubmitFunction = () => {
		sendPending = true;
		sendFeedback = null;

		return async ({ result, update }) => {
			try {
				sendFeedback = getActionData(result);

				if (result.type === 'success') {
					messageText = '';
				}

				await update({ reset: false, invalidateAll: false });

				if (result.type === 'failure') {
					await tick();
					const failure = result.data as ActionData;

					if (failure?.action === 'sendMessage' && failure.fieldErrors?.chatId) {
						chatIdInput?.focus();
					} else if (failure?.action === 'sendMessage' && failure.fieldErrors?.text) {
						messageTextInput?.focus();
					}
				}
			} finally {
				sendPending = false;
			}
		};
	};

	function getActionData(result: ActionResult): ActionData | null {
		if (result.type === 'success' || result.type === 'failure') {
			return result.data as ActionData;
		}

		return null;
	}

	function rawJson(value: unknown) {
		return JSON.stringify(value, null, 2);
	}
</script>

<svelte:head>
	<title>Telegram API Playground</title>
	<meta name="description" content="Internal tool for testing Telegram Bot API methods." />
</svelte:head>

<div class="app-shell">
	<header class="topbar">
		<div class="product-name">
			<span class="product-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24">
					<path d="M20.7 3.4 3.8 9.9c-1.2.5-1.2 1.2-.2 1.5l4.3 1.3 1.7 5.2c.2.6.1.9.8.9.5 0 .8-.2 1-.4l2.1-2 4.4 3.2c.8.4 1.4.2 1.6-.8l2.8-13.5c.3-1.2-.5-1.8-1.6-1.9ZM9.5 12.4l8.4-5.3c.4-.3.8-.1.5.2l-6.9 6.3-.3 3.4-1.7-4.6Z" />
				</svg>
			</span>
			<div>
				<strong>Telegram API Playground</strong>
				<span>Local development tool</span>
			</div>
		</div>

		<div class:configured={data.configured} class="config-status">
			<span class="status-dot"></span>
			{data.configured ? 'Token configured' : 'Token not configured'}
		</div>
	</header>

	<div class="app-body">
		<aside class="sidebar">
			<nav aria-label="Telegram API methods">
				{#each methodGroups as group (group.label)}
					<div class="method-group">
						<p>{group.label}</p>
						<div class="method-list">
							{#each group.methods as method (method.id)}
								<button
									type="button"
									class:active={activeMethod === method.id}
									aria-current={activeMethod === method.id ? 'page' : undefined}
									onclick={() => (activeMethod = method.id)}
								>
									<span>{method.label}</span>
									<code>{method.apiMethod}</code>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</nav>

			<div class="sidebar-footer">
				<span>Environment</span>
				<code>TELEGRAM_BOT_TOKEN</code>
			</div>
		</aside>

		<main>
			{#if activeMethod === 'getMe'}
				<header class="method-header">
					<div>
						<div class="method-meta"><span>POST</span><code>getMe</code></div>
						<h1>Bot information</h1>
						<p>Validate the configured token and return basic information about the bot.</p>
					</div>
					<a href="https://core.telegram.org/bots/api#getme" target="_blank" rel="noreferrer">
						API reference <span aria-hidden="true">↗</span>
					</a>
				</header>

				<div class="workspace">
					<section class="request-panel" aria-labelledby="get-me-request-title">
						<div class="panel-header">
							<div>
								<h2 id="get-me-request-title">Request</h2>
								<p>This method has no parameters.</p>
							</div>
						</div>

						<div class="no-parameters">
							<span>&lbrace;&rbrace;</span>
							<p>No request body required</p>
						</div>

						<form method="POST" action="?/getMe" use:enhance={enhanceGetMe} aria-busy={getMePending}>
							<button class="primary-button" type="submit" disabled={getMePending}>
								{#if getMePending}
									<span class="spinner" aria-hidden="true"></span>Sending request…
								{:else}
									Send request
								{/if}
							</button>
						</form>
					</section>

					<section class="response-panel" aria-labelledby="get-me-response-title" aria-live="polite">
						<div class="panel-header response-header">
							<h2 id="get-me-response-title">Response</h2>
							{#if getMeFeedback?.action === 'getMe'}
								<span class:success-code={getMeFeedback.success} class="response-code">
									{getMeFeedback.success ? '200 OK' : 'ERROR'}
								</span>
							{/if}
						</div>

						{#if !data.configured && !getMeFeedback}
							<div class="notice warning" role="status">
								<strong>Bot token is not configured</strong>
								<p>Set <code>TELEGRAM_BOT_TOKEN</code> in <code>.env</code> and restart the server.</p>
							</div>
						{:else if getMeFeedback?.action === 'getMe' && getMeFeedback.success && getMeFeedback.response}
							<div class="response-summary">
								<dl>
									<div><dt>ID</dt><dd>{getMeFeedback.response.result.id}</dd></div>
									<div><dt>Name</dt><dd>{getMeFeedback.response.result.first_name}</dd></div>
									<div>
										<dt>Username</dt>
										<dd>{getMeFeedback.response.result.username ? `@${getMeFeedback.response.result.username}` : '—'}</dd>
									</div>
									<div><dt>Bot account</dt><dd>{getMeFeedback.response.result.is_bot ? 'Yes' : 'No'}</dd></div>
								</dl>
							</div>
						{:else if getMeFeedback?.action === 'getMe' && !getMeFeedback.success}
							<div class="notice error" role="alert">
								<strong>Request failed</strong>
								<p>{getMeFeedback.error}</p>
							</div>
						{:else}
							<div class="empty-response">
								<code>&lbrace;&rbrace;</code>
								<p>Send the request to inspect the response.</p>
							</div>
						{/if}

						{#if getMeFeedback?.action === 'getMe' && getMeFeedback.response}
							<details class="raw-response">
								<summary>Raw JSON</summary>
								<pre>{rawJson(getMeFeedback.response)}</pre>
							</details>
						{/if}
					</section>
				</div>
			{:else}
				<header class="method-header">
					<div>
						<div class="method-meta"><span>POST</span><code>sendMessage</code></div>
						<h1>Text message</h1>
						<p>Send a plain-text message to a chat, group, or channel.</p>
					</div>
					<a href="https://core.telegram.org/bots/api#sendmessage" target="_blank" rel="noreferrer">
						API reference <span aria-hidden="true">↗</span>
					</a>
				</header>

				<div class="workspace">
					<section class="request-panel" aria-labelledby="send-request-title">
						<div class="panel-header">
							<div>
								<h2 id="send-request-title">Request</h2>
								<p>Required parameters</p>
							</div>
						</div>

						<form
							class="message-form"
							method="POST"
							action="?/sendMessage"
							use:enhance={enhanceSendMessage}
							aria-busy={sendPending}
						>
							<div class="field-group">
								<div class="label-row">
									<label for="chatId">chat_id</label>
									<span>String · required</span>
								</div>
								<input
									id="chatId"
									name="chatId"
									type="text"
									placeholder="123456789 or @channel"
									bind:value={chatId}
									{@attach captureChatIdInput}
									aria-describedby="chat-id-help chat-id-error"
									aria-invalid={sendFeedback?.action === 'sendMessage' && Boolean(sendFeedback.fieldErrors?.chatId)}
								/>
								<p id="chat-id-help" class="field-help">Numeric chat ID or public channel username.</p>
								{#if sendFeedback?.action === 'sendMessage' && sendFeedback.fieldErrors?.chatId}
									<p id="chat-id-error" class="field-error">{sendFeedback.fieldErrors.chatId}</p>
								{/if}
							</div>

							<div class="field-group">
								<div class="label-row">
									<label for="messageText">text</label>
									<span class:over-limit={messageText.length > 4096}>
										String · required · {messageText.length.toLocaleString()}/4,096
									</span>
								</div>
								<textarea
									id="messageText"
									name="text"
									rows="8"
									placeholder="Message text"
									bind:value={messageText}
									{@attach captureMessageTextInput}
									aria-describedby="message-help message-error"
									aria-invalid={sendFeedback?.action === 'sendMessage' && Boolean(sendFeedback.fieldErrors?.text)}
								></textarea>
								<p id="message-help" class="field-help">Sent without a parse mode.</p>
								{#if sendFeedback?.action === 'sendMessage' && sendFeedback.fieldErrors?.text}
									<p id="message-error" class="field-error">{sendFeedback.fieldErrors.text}</p>
								{/if}
							</div>

							<button class="primary-button" type="submit" disabled={sendPending}>
								{#if sendPending}
									<span class="spinner" aria-hidden="true"></span>Sending request…
								{:else}
									Send request
								{/if}
							</button>
						</form>
					</section>

					<section class="response-panel" aria-labelledby="send-response-title" aria-live="polite">
						<div class="panel-header response-header">
							<h2 id="send-response-title">Response</h2>
							{#if sendFeedback?.action === 'sendMessage' && sendFeedback.response}
								<span class:success-code={sendFeedback.success} class="response-code">
									{sendFeedback.success ? '200 OK' : 'ERROR'}
								</span>
							{/if}
						</div>

						{#if sendFeedback?.action === 'sendMessage' && sendFeedback.success && sendFeedback.response}
							<div class="notice success" role="status">
								<strong>Message sent</strong>
								<p>
									Message <code>#{sendFeedback.response.result.message_id}</code> was accepted for chat
									<code>{sendFeedback.response.result.chat.id}</code>.
								</p>
							</div>
						{:else if sendFeedback?.action === 'sendMessage' && sendFeedback.error}
							<div class="notice error" role="alert">
								<strong>Request failed</strong>
								<p>{sendFeedback.error}</p>
							</div>
						{:else}
							<div class="empty-response">
								<code>&lbrace;&rbrace;</code>
								<p>Send the request to inspect the response.</p>
							</div>
						{/if}

						{#if sendFeedback?.action === 'sendMessage' && sendFeedback.response}
							<details class="raw-response">
								<summary>Raw JSON</summary>
								<pre>{rawJson(sendFeedback.response)}</pre>
							</details>
						{/if}
					</section>
				</div>
			{/if}
		</main>
	</div>
</div>

<style>
	:global(:root) {
		--bg: #f6f7f9;
		--surface: #ffffff;
		--surface-muted: #f9fafb;
		--border: #dfe3e8;
		--border-strong: #cdd3da;
		--text: #1d2733;
		--text-muted: #697586;
		--text-subtle: #8b95a3;
		--accent: #168ac0;
		--accent-soft: #e9f5fa;
		--success: #16805a;
		--success-soft: #edf8f3;
		--danger: #b63d49;
		--danger-soft: #fff1f2;
		--warning: #795d17;
		--warning-soft: #fff9e8;
	}

	.app-shell {
		min-height: 100vh;
		background: var(--bg);
		color: var(--text);
	}

	.topbar {
		display: flex;
		height: 4rem;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--border);
		background: var(--surface);
		padding: 0 1.25rem;
	}

	.product-name {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}

	.product-icon {
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		border-radius: 0.45rem;
		background: #229ed9;
	}

	.product-icon svg {
		width: 1.25rem;
		fill: white;
	}

	.product-name > div {
		display: grid;
		gap: 0.1rem;
	}

	.product-name strong {
		font-size: 0.86rem;
	}

	.product-name div span {
		color: var(--text-subtle);
		font-size: 0.67rem;
	}

	.config-status {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		color: var(--text-muted);
		font-size: 0.72rem;
	}

	.status-dot {
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 50%;
		background: #9ba4af;
	}

	.config-status.configured {
		color: var(--success);
	}

	.config-status.configured .status-dot {
		background: #20a071;
	}

	.app-body {
		display: grid;
		min-height: calc(100vh - 4rem);
		grid-template-columns: 15rem minmax(0, 1fr);
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		border-right: 1px solid var(--border);
		background: var(--surface);
		padding: 1.25rem 0.8rem;
	}

	.method-group + .method-group {
		margin-top: 1.35rem;
	}

	.method-group > p,
	.sidebar-footer > span {
		margin: 0 0 0.45rem;
		padding: 0 0.6rem;
		color: var(--text-subtle);
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.method-list {
		display: grid;
		gap: 0.2rem;
	}

	.method-list button {
		display: grid;
		gap: 0.18rem;
		width: 100%;
		border: 0;
		border-radius: 0.42rem;
		background: transparent;
		padding: 0.65rem 0.7rem;
		color: var(--text-muted);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.method-list button:hover {
		background: var(--surface-muted);
		color: var(--text);
	}

	.method-list button.active {
		background: var(--accent-soft);
		color: #116f9a;
	}

	.method-list button span {
		font-size: 0.78rem;
		font-weight: 650;
	}

	.method-list button code {
		color: inherit;
		font-size: 0.63rem;
		opacity: 0.78;
	}

	.sidebar-footer {
		display: grid;
		gap: 0.35rem;
		border-top: 1px solid var(--border);
		padding: 1rem 0.2rem 0;
	}

	.sidebar-footer > span {
		padding: 0;
	}

	.sidebar-footer code {
		color: var(--text-muted);
		font-size: 0.65rem;
	}

	main {
		min-width: 0;
		padding: 2rem clamp(1.25rem, 3vw, 3rem) 3rem;
	}

	.method-header {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 2rem;
		max-width: 1120px;
		margin: 0 auto 1.5rem;
	}

	.method-meta {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		margin-bottom: 0.55rem;
	}

	.method-meta span {
		border-radius: 0.25rem;
		background: #e9f7f1;
		padding: 0.2rem 0.35rem;
		color: var(--success);
		font-size: 0.6rem;
		font-weight: 800;
	}

	.method-meta code {
		color: var(--text-muted);
		font-size: 0.72rem;
	}

	.method-header h1 {
		margin: 0;
		font-size: 1.65rem;
		letter-spacing: -0.025em;
	}

	.method-header p {
		margin: 0.4rem 0 0;
		color: var(--text-muted);
		font-size: 0.8rem;
	}

	.method-header > a {
		flex: 0 0 auto;
		color: var(--accent);
		font-size: 0.72rem;
		font-weight: 650;
		text-decoration: none;
	}

	.method-header > a:hover {
		text-decoration: underline;
	}

	.workspace {
		display: grid;
		max-width: 1120px;
		margin: 0 auto;
		grid-template-columns: minmax(0, 1fr) minmax(20rem, 0.85fr);
		gap: 1rem;
		align-items: start;
	}

	.request-panel,
	.response-panel {
		border: 1px solid var(--border);
		border-radius: 0.55rem;
		background: var(--surface);
		box-shadow: 0 1px 2px rgba(20, 31, 43, 0.03);
	}

	.request-panel {
		padding: 1.25rem;
	}

	.response-panel {
		overflow: hidden;
	}

	.panel-header {
		display: flex;
		min-height: 2.8rem;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid var(--border);
		margin: -1.25rem -1.25rem 1.25rem;
		padding: 0.85rem 1.25rem;
	}

	.response-header {
		align-items: center;
		margin: 0;
		background: var(--surface-muted);
	}

	.panel-header h2 {
		margin: 0;
		font-size: 0.82rem;
	}

	.panel-header p {
		margin: 0.2rem 0 0;
		color: var(--text-subtle);
		font-size: 0.65rem;
	}

	.response-code {
		border-radius: 999px;
		background: var(--danger-soft);
		padding: 0.25rem 0.5rem;
		color: var(--danger);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.59rem;
		font-weight: 700;
	}

	.response-code.success-code {
		background: var(--success-soft);
		color: var(--success);
	}

	.no-parameters {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		border: 1px dashed var(--border-strong);
		border-radius: 0.42rem;
		background: var(--surface-muted);
		padding: 1rem;
		color: var(--text-muted);
	}

	.no-parameters span {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.9rem;
	}

	.no-parameters p {
		margin: 0;
		font-size: 0.72rem;
	}

	.request-panel form {
		margin-top: 1.25rem;
	}

	.message-form {
		display: grid;
		gap: 1.15rem;
	}

	.field-group {
		display: grid;
		gap: 0.45rem;
	}

	.label-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.label-row label {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.72rem;
		font-weight: 700;
	}

	.label-row span {
		color: var(--text-subtle);
		font-size: 0.61rem;
	}

	.label-row span.over-limit {
		color: var(--danger);
	}

	input,
	textarea {
		width: 100%;
		border: 1px solid var(--border-strong);
		border-radius: 0.4rem;
		background: var(--surface);
		padding: 0.7rem 0.75rem;
		color: var(--text);
		font: inherit;
		font-size: 0.78rem;
	}

	textarea {
		min-height: 9rem;
		line-height: 1.55;
		resize: vertical;
	}

	input:focus,
	textarea:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px rgba(22, 138, 192, 0.1);
		outline: none;
	}

	input[aria-invalid='true'],
	textarea[aria-invalid='true'] {
		border-color: #d46a74;
	}

	.field-help,
	.field-error {
		margin: 0;
		font-size: 0.63rem;
		line-height: 1.4;
	}

	.field-help {
		color: var(--text-subtle);
	}

	.field-error {
		color: var(--danger);
		font-weight: 650;
	}

	.primary-button {
		display: inline-flex;
		min-height: 2.35rem;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border: 1px solid #117dad;
		border-radius: 0.4rem;
		background: var(--accent);
		padding: 0.55rem 0.85rem;
		color: white;
		font: inherit;
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
	}

	.primary-button:hover:not(:disabled) {
		background: #117dad;
	}

	.primary-button:disabled {
		cursor: wait;
		opacity: 0.65;
	}

	.spinner {
		width: 0.75rem;
		height: 0.75rem;
		border: 2px solid rgba(255, 255, 255, 0.45);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 700ms linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.empty-response {
		display: grid;
		min-height: 15rem;
		place-items: center;
		align-content: center;
		gap: 0.6rem;
		padding: 1.25rem;
		color: var(--text-subtle);
		text-align: center;
	}

	.empty-response code {
		font-size: 1.1rem;
	}

	.empty-response p {
		margin: 0;
		font-size: 0.7rem;
	}

	.notice {
		margin: 1rem;
		border: 1px solid;
		border-radius: 0.4rem;
		padding: 0.8rem;
	}

	.notice strong {
		font-size: 0.74rem;
	}

	.notice p {
		margin: 0.3rem 0 0;
		font-size: 0.68rem;
		line-height: 1.5;
	}

	.notice.warning {
		border-color: #ead9a6;
		background: var(--warning-soft);
		color: var(--warning);
	}

	.notice.error {
		border-color: #efc8cd;
		background: var(--danger-soft);
		color: var(--danger);
	}

	.notice.success {
		border-color: #bde1d3;
		background: var(--success-soft);
		color: var(--success);
	}

	.response-summary {
		padding: 1rem;
	}

	.response-summary dl {
		margin: 0;
		border: 1px solid var(--border);
		border-radius: 0.4rem;
		overflow: hidden;
	}

	.response-summary dl > div {
		display: grid;
		grid-template-columns: 7rem 1fr;
		border-bottom: 1px solid var(--border);
	}

	.response-summary dl > div:last-child {
		border-bottom: 0;
	}

	.response-summary dt,
	.response-summary dd {
		margin: 0;
		padding: 0.6rem 0.7rem;
		font-size: 0.68rem;
	}

	.response-summary dt {
		background: var(--surface-muted);
		color: var(--text-muted);
		font-weight: 650;
	}

	.response-summary dd {
		border-left: 1px solid var(--border);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		word-break: break-word;
	}

	.raw-response {
		border-top: 1px solid var(--border);
	}

	.raw-response summary {
		padding: 0.75rem 1rem;
		color: var(--text-muted);
		font-size: 0.68rem;
		font-weight: 650;
		cursor: pointer;
	}

	.raw-response pre {
		max-height: 24rem;
		margin: 0;
		overflow: auto;
		border-top: 1px solid var(--border);
		background: #19232e;
		padding: 1rem;
		color: #dae5ed;
		font-size: 0.65rem;
		line-height: 1.6;
		white-space: pre-wrap;
		word-break: break-word;
	}

	button:focus-visible,
	a:focus-visible,
	summary:focus-visible {
		outline: 3px solid rgba(22, 138, 192, 0.2);
		outline-offset: 2px;
	}

	@media (max-width: 850px) {
		.app-body {
			display: block;
		}

		.sidebar {
			display: block;
			border-right: 0;
			border-bottom: 1px solid var(--border);
			padding: 0.75rem 1rem;
			overflow-x: auto;
		}

		.sidebar nav {
			display: flex;
			gap: 1.5rem;
			width: max-content;
		}

		.method-group,
		.method-group + .method-group {
			margin: 0;
		}

		.method-list {
			display: flex;
		}

		.method-list button {
			min-width: 9rem;
		}

		.sidebar-footer {
			display: none;
		}

		.workspace {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 560px) {
		.topbar {
			height: 3.6rem;
			padding: 0 0.9rem;
		}

		.product-name div span {
			display: none;
		}

		.config-status {
			font-size: 0;
		}

		.config-status::after {
			content: 'Token';
			font-size: 0.68rem;
		}

		main {
			padding: 1.3rem 0.9rem 2rem;
		}

		.method-header {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.65rem;
		}

		.method-header h1 {
			font-size: 1.4rem;
		}

		.request-panel {
			padding: 1rem;
		}

		.panel-header {
			margin: -1rem -1rem 1rem;
			padding: 0.75rem 1rem;
		}

		.response-header {
			margin: 0;
		}

		.label-row {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.25rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
		}
	}
</style>
