<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import { tick, untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import type { ActionData, PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const initialForm = untrack(() => form);

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
	<meta
		name="description"
		content="A focused local playground for testing Telegram Bot API methods."
	/>
</svelte:head>

<header class="hero">
	<nav class="nav" aria-label="Primary navigation">
		<a class="brand" href={resolve('/')} aria-label="Telegram API Playground home">
			<span class="brand-mark" aria-hidden="true">
				<svg viewBox="0 0 24 24" role="img">
					<path d="M20.7 3.4 3.8 9.9c-1.2.5-1.2 1.2-.2 1.5l4.3 1.3 1.7 5.2c.2.6.1.9.8.9.5 0 .8-.2 1-.4l2.1-2 4.4 3.2c.8.4 1.4.2 1.6-.8l2.8-13.5c.3-1.2-.5-1.8-1.6-1.9ZM9.5 12.4l8.4-5.3c.4-.3.8-.1.5.2l-6.9 6.3-.3 3.4-1.7-4.6Z" />
				</svg>
			</span>
			<span>Telegram <strong>Playground</strong></span>
		</a>
		<span class="version">V1 · Text messages</span>
	</nav>

	<div class="hero-content">
		<div>
			<p class="eyebrow"><span></span> Bot API workspace</p>
			<h1>Test your bot.<br /><em>See exactly what happened.</em></h1>
			<p class="hero-copy">
				A focused, server-safe workspace for checking your bot identity and sending your first
				Telegram message.
			</p>
		</div>
		<div class="hero-note">
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M12 2 4.5 5v5.5c0 4.8 3.2 9.2 7.5 10.5 4.3-1.3 7.5-5.7 7.5-10.5V5L12 2Zm0 2.2 5.5 2.2v4.1c0 3.6-2.2 7-5.5 8.3-3.3-1.3-5.5-4.7-5.5-8.3V6.4L12 4.2Zm-1 3.3v5.8l-2.3-2.2-1.4 1.4 4.7 4.6 4.7-4.6-1.4-1.4-2.3 2.2V7.5h-2Z" />
			</svg>
			<div>
				<strong>Your token stays server-side</strong>
				<span>Browser requests never receive your bot credentials.</span>
			</div>
		</div>
	</div>
</header>

<main>
	<section class="workspace-heading" aria-labelledby="workspace-title">
		<div>
			<p class="section-kicker">Workspace</p>
			<h2 id="workspace-title">Start with the essentials</h2>
		</div>
		<p>Run each method independently. Responses stay visible until you run that method again.</p>
	</section>

	<div class="method-grid">
		<section class="method-card identity-card" aria-labelledby="get-me-title">
			<div class="card-topline">
				<span class="step-number">01</span>
				<span class:ready={data.configured} class="status-pill">
					<span></span>{data.configured ? 'Token configured' : 'Setup required'}
				</span>
			</div>

			<div class="method-heading">
				<div class="method-name">
					<span>Method</span>
					<code>getMe</code>
				</div>
				<h3 id="get-me-title">Meet your bot</h3>
				<p>Confirm that the token is valid and inspect the bot account connected to it.</p>
			</div>

			<form method="POST" action="?/getMe" use:enhance={enhanceGetMe} aria-busy={getMePending}>
				<button class="button primary" type="submit" disabled={getMePending}>
					{#if getMePending}
						<span class="spinner" aria-hidden="true"></span>
						Checking bot…
					{:else}
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path d="M12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-1.8-4.3L13 11h7V4l-2.4 2.4A7.9 7.9 0 0 0 12 4Z" />
						</svg>
						Run getMe
					{/if}
				</button>
			</form>

			<div class="result-region" aria-live="polite">
				{#if !data.configured && !getMeFeedback}
					<div class="notice warning">
						<strong>Add your bot token</strong>
						<span>Copy <code>.env.example</code> to <code>.env</code>, then restart the server.</span>
					</div>
				{:else if getMeFeedback?.action === 'getMe' && getMeFeedback.success && getMeFeedback.response}
					<div class="bot-profile">
						<div class="bot-avatar" aria-hidden="true">
							{getMeFeedback.response.result.first_name.slice(0, 1).toUpperCase()}
						</div>
						<div class="bot-details">
							<span class="success-label">Connected successfully</span>
							<strong>{getMeFeedback.response.result.first_name}</strong>
							{#if getMeFeedback.response.result.username}
								<a
									href={`https://t.me/${getMeFeedback.response.result.username}`}
									target="_blank"
									rel="noreferrer"
								>@{getMeFeedback.response.result.username}</a
								>
							{/if}
							<small>Bot ID · {getMeFeedback.response.result.id}</small>
						</div>
					</div>
				{:else if getMeFeedback?.action === 'getMe' && !getMeFeedback.success}
					<div class="notice error" role="alert">
						<strong>Could not verify the bot</strong>
						<span>{getMeFeedback.error}</span>
					</div>
				{:else}
					<div class="empty-result">
						<span aria-hidden="true">↗</span>
						<p>Your bot identity will appear here.</p>
					</div>
				{/if}

				{#if getMeFeedback?.action === 'getMe' && getMeFeedback.response}
					<details class="raw-response">
						<summary>View raw response <span>JSON</span></summary>
						<pre>{rawJson(getMeFeedback.response)}</pre>
					</details>
				{/if}
			</div>
		</section>

		<section class="method-card message-card" aria-labelledby="send-message-title">
			<div class="card-topline">
				<span class="step-number">02</span>
				<span class="scope-pill">Plain text</span>
			</div>

			<div class="method-heading">
				<div class="method-name">
					<span>Method</span>
					<code>sendMessage</code>
				</div>
				<h3 id="send-message-title">Send a text message</h3>
				<p>Choose a Telegram chat and send a plain-text message from your bot.</p>
			</div>

			<form
				class="message-form"
				method="POST"
				action="?/sendMessage"
				use:enhance={enhanceSendMessage}
				aria-busy={sendPending}
			>
				<div class="field-group">
					<div class="label-line">
						<label for="chatId">Chat ID</label>
						<span>Required</span>
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
					<p id="chat-id-help" class="field-help">Use a numeric chat ID or public channel username.</p>
					{#if sendFeedback?.action === 'sendMessage' && sendFeedback.fieldErrors?.chatId}
						<p id="chat-id-error" class="field-error">{sendFeedback.fieldErrors.chatId}</p>
					{/if}
				</div>

				<div class="field-group">
					<div class="label-line">
						<label for="messageText">Message</label>
						<span class:over-limit={messageText.length > 4096}>{messageText.length.toLocaleString()} / 4,096</span>
					</div>
					<textarea
						id="messageText"
						name="text"
						rows="7"
						placeholder="Write a sample message…"
						bind:value={messageText}
						{@attach captureMessageTextInput}
						aria-describedby="message-help message-error"
						aria-invalid={sendFeedback?.action === 'sendMessage' && Boolean(sendFeedback.fieldErrors?.text)}
					></textarea>
					<p id="message-help" class="field-help">Sent as plain text without formatting or parse modes.</p>
					{#if sendFeedback?.action === 'sendMessage' && sendFeedback.fieldErrors?.text}
						<p id="message-error" class="field-error">{sendFeedback.fieldErrors.text}</p>
					{/if}
				</div>

				<button class="button primary send-button" type="submit" disabled={sendPending}>
					{#if sendPending}
						<span class="spinner" aria-hidden="true"></span>
						Sending message…
					{:else}
						Send message
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path d="m21 3-7.5 18-4.2-7.7L2 9l19-6Zm-9 9.8 2 3.6 3.7-8.9L8.4 10l3.6 2.1 4-4.2-4 4.9Z" />
						</svg>
					{/if}
				</button>
			</form>

			<div class="result-region send-result" aria-live="polite">
				{#if sendFeedback?.action === 'sendMessage' && sendFeedback.success && sendFeedback.response}
					<div class="notice success">
						<strong>Message sent</strong>
						<span>
							Telegram accepted message #{sendFeedback.response.result.message_id} for chat
							{sendFeedback.response.result.chat.id}.
						</span>
					</div>
				{:else if sendFeedback?.action === 'sendMessage' && sendFeedback.error}
					<div class="notice error" role="alert">
						<strong>Message not sent</strong>
						<span>{sendFeedback.error}</span>
					</div>
				{/if}

				{#if sendFeedback?.action === 'sendMessage' && sendFeedback.response}
					<details class="raw-response">
						<summary>View raw response <span>JSON</span></summary>
						<pre>{rawJson(sendFeedback.response)}</pre>
					</details>
				{/if}
			</div>
		</section>
	</div>
</main>

<footer>
	<span>Telegram API Playground</span>
	<p>Built for focused, local bot development.</p>
</footer>

<style>
	:global(:root) {
		--ink: #17222f;
		--muted: #657180;
		--line: #dce3e8;
		--paper: #ffffff;
		--canvas: #f3f6f8;
		--telegram: #229ed9;
		--telegram-dark: #1686c0;
		--success: #16845b;
		--danger: #b33b45;
	}

	.hero {
		background:
			radial-gradient(circle at 82% 16%, rgba(34, 158, 217, 0.2), transparent 27rem),
			linear-gradient(135deg, #131e2a 0%, #1b2c3c 100%);
		color: white;
		padding: 0 5vw 5.5rem;
	}

	.nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		max-width: 1180px;
		margin: 0 auto;
		padding: 1.35rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
		color: white;
		font-size: 0.95rem;
		letter-spacing: -0.01em;
		text-decoration: none;
	}

	.brand strong {
		font-weight: 700;
	}

	.brand-mark {
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		border-radius: 50%;
		background: var(--telegram);
	}

	.brand-mark svg {
		width: 1.25rem;
		fill: white;
	}

	.version {
		border: 1px solid rgba(255, 255, 255, 0.16);
		border-radius: 999px;
		padding: 0.4rem 0.75rem;
		color: rgba(255, 255, 255, 0.7);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.hero-content {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 20rem;
		gap: 4rem;
		align-items: end;
		max-width: 1180px;
		margin: 0 auto;
		padding-top: 5.25rem;
	}

	.eyebrow,
	.section-kicker {
		margin: 0 0 1rem;
		font-size: 0.72rem;
		font-weight: 750;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.eyebrow {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		color: #79d1f5;
	}

	.eyebrow span {
		width: 1.4rem;
		height: 1px;
		background: currentColor;
	}

	h1 {
		max-width: 780px;
		margin: 0;
		font-size: clamp(2.8rem, 6vw, 5.4rem);
		font-weight: 760;
		letter-spacing: -0.065em;
		line-height: 0.98;
	}

	h1 em {
		color: #74cef3;
		font-family: Georgia, 'Times New Roman', serif;
		font-weight: 400;
	}

	.hero-copy {
		max-width: 600px;
		margin: 1.75rem 0 0;
		color: rgba(255, 255, 255, 0.67);
		font-size: 1.05rem;
		line-height: 1.7;
	}

	.hero-note {
		display: flex;
		gap: 0.9rem;
		align-items: flex-start;
		border-left: 1px solid rgba(255, 255, 255, 0.18);
		padding-left: 1.3rem;
	}

	.hero-note svg {
		width: 1.5rem;
		flex: 0 0 auto;
		fill: #70cef4;
	}

	.hero-note div {
		display: grid;
		gap: 0.35rem;
	}

	.hero-note strong {
		font-size: 0.86rem;
	}

	.hero-note span {
		color: rgba(255, 255, 255, 0.55);
		font-size: 0.75rem;
		line-height: 1.55;
	}

	main {
		max-width: 1180px;
		margin: 0 auto;
		padding: 4.5rem 2rem 6rem;
	}

	.workspace-heading {
		display: flex;
		justify-content: space-between;
		gap: 2rem;
		align-items: end;
		margin-bottom: 2rem;
	}

	.section-kicker {
		margin-bottom: 0.5rem;
		color: var(--telegram-dark);
	}

	.workspace-heading h2 {
		margin: 0;
		color: var(--ink);
		font-size: clamp(1.7rem, 3vw, 2.45rem);
		letter-spacing: -0.04em;
	}

	.workspace-heading > p {
		max-width: 390px;
		margin: 0;
		color: var(--muted);
		font-size: 0.88rem;
		line-height: 1.65;
		text-align: right;
	}

	.method-grid {
		display: grid;
		grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
		gap: 1.25rem;
		align-items: start;
	}

	.method-card {
		border: 1px solid var(--line);
		border-radius: 1.1rem;
		background: var(--paper);
		box-shadow: 0 18px 50px rgba(34, 51, 66, 0.06);
		overflow: hidden;
	}

	.identity-card,
	.message-card {
		padding: 1.6rem;
	}

	.card-topline {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 2rem;
	}

	.step-number {
		color: #93a1ae;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.72rem;
	}

	.status-pill,
	.scope-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		border-radius: 999px;
		background: #f1f3f5;
		padding: 0.4rem 0.68rem;
		color: #6c7884;
		font-size: 0.67rem;
		font-weight: 700;
	}

	.status-pill > span {
		width: 0.4rem;
		height: 0.4rem;
		border-radius: 50%;
		background: #a0a9b1;
	}

	.status-pill.ready {
		background: #e9f7f1;
		color: var(--success);
	}

	.status-pill.ready > span {
		background: #23a874;
		box-shadow: 0 0 0 3px rgba(35, 168, 116, 0.12);
	}

	.scope-pill {
		background: #eaf6fb;
		color: var(--telegram-dark);
	}

	.method-heading {
		margin-bottom: 1.6rem;
	}

	.method-name {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		margin-bottom: 1rem;
	}

	.method-name span {
		color: #98a2ac;
		font-size: 0.67rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.method-name code {
		border-radius: 0.32rem;
		background: #eaf6fb;
		padding: 0.22rem 0.45rem;
		color: #147eaf;
		font-size: 0.78rem;
	}

	.method-heading h3 {
		margin: 0;
		color: var(--ink);
		font-size: 1.55rem;
		letter-spacing: -0.035em;
	}

	.method-heading p {
		margin: 0.65rem 0 0;
		color: var(--muted);
		font-size: 0.86rem;
		line-height: 1.6;
	}

	.button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		min-height: 2.85rem;
		border: 0;
		border-radius: 0.65rem;
		padding: 0.75rem 1.05rem;
		font: inherit;
		font-size: 0.82rem;
		font-weight: 750;
		cursor: pointer;
		transition:
			transform 120ms ease,
			background 120ms ease,
			box-shadow 120ms ease;
	}

	.button.primary {
		background: var(--telegram);
		color: white;
		box-shadow: 0 8px 20px rgba(34, 158, 217, 0.2);
	}

	.button.primary:hover:not(:disabled) {
		transform: translateY(-1px);
		background: var(--telegram-dark);
		box-shadow: 0 10px 24px rgba(34, 158, 217, 0.28);
	}

	.button:focus-visible,
	input:focus-visible,
	textarea:focus-visible,
	summary:focus-visible,
	a:focus-visible {
		outline: 3px solid rgba(34, 158, 217, 0.28);
		outline-offset: 2px;
	}

	.button:disabled {
		cursor: wait;
		opacity: 0.68;
	}

	.button svg {
		width: 1.05rem;
		fill: currentColor;
	}

	.spinner {
		width: 0.9rem;
		height: 0.9rem;
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

	.result-region {
		margin-top: 1.4rem;
	}

	.empty-result {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		border: 1px dashed #d8dfe4;
		border-radius: 0.75rem;
		padding: 1rem;
		color: #8a96a1;
	}

	.empty-result span {
		display: grid;
		width: 1.8rem;
		height: 1.8rem;
		place-items: center;
		border-radius: 50%;
		background: #f0f3f5;
	}

	.empty-result p {
		margin: 0;
		font-size: 0.76rem;
	}

	.notice {
		display: grid;
		gap: 0.3rem;
		border-radius: 0.72rem;
		padding: 0.95rem 1rem;
		font-size: 0.78rem;
		line-height: 1.5;
	}

	.notice.warning {
		border: 1px solid #ead9ae;
		background: #fff9e9;
		color: #705b24;
	}

	.notice.error {
		border: 1px solid #f0cbd0;
		background: #fff2f3;
		color: #8d3039;
	}

	.notice.success {
		border: 1px solid #bfe4d6;
		background: #effaf6;
		color: #136947;
	}

	.notice code {
		font-size: 0.72rem;
	}

	.bot-profile {
		display: flex;
		align-items: center;
		gap: 1rem;
		border: 1px solid #cce6dc;
		border-radius: 0.8rem;
		background: #f5fbf8;
		padding: 1rem;
	}

	.bot-avatar {
		display: grid;
		width: 3.2rem;
		height: 3.2rem;
		flex: 0 0 auto;
		place-items: center;
		border-radius: 50%;
		background: linear-gradient(135deg, #26a9e6, #1786bf);
		color: white;
		font-size: 1.25rem;
		font-weight: 800;
		box-shadow: 0 8px 20px rgba(34, 158, 217, 0.2);
	}

	.bot-details {
		display: flex;
		min-width: 0;
		flex-direction: column;
		align-items: flex-start;
	}

	.success-label {
		margin-bottom: 0.25rem;
		color: var(--success);
		font-size: 0.65rem;
		font-weight: 750;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	.bot-details strong {
		color: var(--ink);
	}

	.bot-details a {
		color: var(--telegram-dark);
		font-size: 0.79rem;
		text-decoration: none;
	}

	.bot-details small {
		margin-top: 0.35rem;
		color: #87929d;
		font-size: 0.67rem;
	}

	.raw-response {
		margin-top: 0.8rem;
		border: 1px solid var(--line);
		border-radius: 0.7rem;
		overflow: hidden;
	}

	.raw-response summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.8rem 0.9rem;
		color: #52606c;
		font-size: 0.72rem;
		font-weight: 650;
		cursor: pointer;
		list-style: none;
	}

	.raw-response summary::-webkit-details-marker {
		display: none;
	}

	.raw-response summary span {
		color: #9aa4ad;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.62rem;
	}

	.raw-response pre {
		max-height: 20rem;
		margin: 0;
		overflow: auto;
		border-top: 1px solid var(--line);
		background: #17222f;
		padding: 1rem;
		color: #dce8ef;
		font-size: 0.68rem;
		line-height: 1.6;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.message-form {
		display: grid;
		gap: 1.2rem;
	}

	.field-group {
		display: grid;
		gap: 0.5rem;
	}

	.label-line {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.label-line label {
		color: var(--ink);
		font-size: 0.78rem;
		font-weight: 750;
	}

	.label-line span {
		color: #97a2ac;
		font-size: 0.65rem;
	}

	.label-line span.over-limit {
		color: var(--danger);
		font-weight: 750;
	}

	input,
	textarea {
		width: 100%;
		border: 1px solid #ced7dd;
		border-radius: 0.68rem;
		background: #fbfcfd;
		padding: 0.82rem 0.9rem;
		color: var(--ink);
		font: inherit;
		font-size: 0.84rem;
		transition:
			border-color 120ms ease,
			background 120ms ease,
			box-shadow 120ms ease;
	}

	textarea {
		min-height: 9.5rem;
		line-height: 1.55;
		resize: vertical;
	}

	input:hover,
	textarea:hover {
		border-color: #aebbc4;
	}

	input:focus,
	textarea:focus {
		border-color: var(--telegram);
		background: white;
		box-shadow: 0 0 0 3px rgba(34, 158, 217, 0.09);
		outline: none;
	}

	input[aria-invalid='true'],
	textarea[aria-invalid='true'] {
		border-color: #cf6971;
	}

	input::placeholder,
	textarea::placeholder {
		color: #a7b0b8;
	}

	.field-help,
	.field-error {
		margin: 0;
		font-size: 0.67rem;
		line-height: 1.45;
	}

	.field-help {
		color: #89949e;
	}

	.field-error {
		color: var(--danger);
		font-weight: 650;
	}

	.send-button {
		width: 100%;
		margin-top: 0.1rem;
	}

	.send-result:empty {
		display: none;
	}

	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		max-width: 1180px;
		margin: 0 auto;
		border-top: 1px solid var(--line);
		padding: 1.6rem 2rem 2.5rem;
		color: #8a96a0;
		font-size: 0.7rem;
	}

	footer span {
		color: #61707c;
		font-weight: 750;
	}

	footer p {
		margin: 0;
	}

	@media (max-width: 850px) {
		.hero {
			padding-bottom: 4rem;
		}

		.hero-content {
			grid-template-columns: 1fr;
			gap: 2.4rem;
			padding-top: 4rem;
		}

		.hero-note {
			max-width: 24rem;
		}

		.method-grid {
			grid-template-columns: 1fr;
		}

		.workspace-heading {
			align-items: flex-start;
			flex-direction: column;
		}

		.workspace-heading > p {
			text-align: left;
		}
	}

	@media (max-width: 560px) {
		.hero {
			padding-right: 1.25rem;
			padding-left: 1.25rem;
		}

		.version {
			display: none;
		}

		.hero-content {
			padding-top: 3.3rem;
		}

		h1 {
			font-size: 2.75rem;
		}

		main {
			padding: 3.5rem 1rem 4rem;
		}

		.identity-card,
		.message-card {
			padding: 1.2rem;
		}

		footer {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.35rem;
			padding-right: 1.25rem;
			padding-left: 1.25rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			scroll-behavior: auto !important;
			transition-duration: 0.01ms !important;
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
		}
	}
</style>
