<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import { untrack } from 'svelte';
	import EmptyResponse from '$lib/components/playground/EmptyResponse.svelte';
	import MethodLayout from '$lib/components/playground/MethodLayout.svelte';
	import Notice from '$lib/components/playground/Notice.svelte';
	import PayloadPreview from '$lib/components/playground/PayloadPreview.svelte';
	import RequestPanel from '$lib/components/playground/RequestPanel.svelte';
	import ResponsePanel from '$lib/components/playground/ResponsePanel.svelte';
	import SubmitButton from '$lib/components/playground/SubmitButton.svelte';
	import type { GetMeFeedback, MethodComponentProps } from '$lib/playground/types';
	import type { TelegramApiFailure, TelegramApiSuccess, TelegramUser } from '$lib/telegram';

	let { configured, initialFeedback }: MethodComponentProps = $props();
	const initial = untrack(() =>
		initialFeedback?.action === 'getMe' ? initialFeedback : null
	);
	let pending = $state(false);
	let feedback = $state<GetMeFeedback | null>(initial);
	const bot = $derived(getResult(feedback?.response));

	const enhanceForm: SubmitFunction = () => {
		pending = true;
		feedback = null;

		return async ({ result, update }) => {
			try {
				feedback = getFeedback(result);
				await update({ reset: false, invalidateAll: false });
			} finally {
				pending = false;
			}
		};
	};

	function getFeedback(result: ActionResult): GetMeFeedback | null {
		if (result.type !== 'success' && result.type !== 'failure') return null;
		const value = result.data as GetMeFeedback;
		return value.action === 'getMe' ? value : null;
	}

	function getResult(
		response: TelegramApiSuccess<TelegramUser> | TelegramApiFailure | undefined
	): TelegramUser | null {
		return response?.ok === true ? response.result : null;
	}
</script>

<MethodLayout
	apiMethod="getMe"
	title="Bot information"
	description="Validate the configured token and return basic information about the bot."
	documentationUrl="https://core.telegram.org/bots/api#getme"
>
	{#snippet request()}
		<RequestPanel titleId="get-me-request-title" subtitle="This method has no parameters.">
			<div class="no-parameters">
				<span>&lbrace;&rbrace;</span>
				<p>No request body required</p>
			</div>
			<form method="POST" action="?/getMe" use:enhance={enhanceForm} aria-busy={pending}>
				<PayloadPreview titleId="get-me-payload-title" payload={{}} />
				<SubmitButton {pending} />
			</form>
		</RequestPanel>
	{/snippet}

	{#snippet response()}
		<ResponsePanel
			titleId="get-me-response-title"
			status={feedback ? (feedback.success ? 'success' : 'error') : undefined}
			rawResponse={feedback?.response}
		>
			{#if !configured && !feedback}
				<Notice kind="warning" title="Bot token is not configured">
					<p>Set <code>TELEGRAM_BOT_TOKEN</code> in <code>.env</code> and restart the server.</p>
				</Notice>
			{:else if feedback?.success && bot}
				<div class="response-summary">
					<dl>
						<div><dt>ID</dt><dd>{bot.id}</dd></div>
						<div><dt>Name</dt><dd>{bot.first_name}</dd></div>
						<div>
							<dt>Username</dt>
							<dd>{bot.username ? `@${bot.username}` : '—'}</dd>
						</div>
						<div><dt>Bot account</dt><dd>{bot.is_bot ? 'Yes' : 'No'}</dd></div>
					</dl>
				</div>
			{:else if feedback && !feedback.success}
				<Notice kind="error" title="Request failed"><p>{feedback.error}</p></Notice>
			{:else}
				<EmptyResponse />
			{/if}
		</ResponsePanel>
	{/snippet}
</MethodLayout>

<style>
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

	form {
		margin-top: 1.25rem;
	}

	.response-summary {
		padding: 1rem;
	}

	dl {
		margin: 0;
		border: 1px solid var(--border);
		border-radius: 0.4rem;
		overflow: hidden;
	}

	dl > div {
		display: grid;
		grid-template-columns: 7rem 1fr;
		border-bottom: 1px solid var(--border);
	}

	dl > div:last-child {
		border-bottom: 0;
	}

	dt,
	dd {
		margin: 0;
		padding: 0.6rem 0.7rem;
		font-size: 0.68rem;
	}

	dt {
		background: var(--surface-muted);
		color: var(--text-muted);
		font-weight: 650;
	}

	dd {
		border-left: 1px solid var(--border);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		word-break: break-word;
	}
</style>
