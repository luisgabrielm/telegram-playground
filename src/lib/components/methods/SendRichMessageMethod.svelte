<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import { untrack } from 'svelte';
	import ReplyMarkupEditor from '$lib/components/reply-markup/ReplyMarkupEditor.svelte';
	import EmptyResponse from '$lib/components/playground/EmptyResponse.svelte';
	import FormField from '$lib/components/playground/FormField.svelte';
	import MethodLayout from '$lib/components/playground/MethodLayout.svelte';
	import Notice from '$lib/components/playground/Notice.svelte';
	import PayloadPreview from '$lib/components/playground/PayloadPreview.svelte';
	import RequestPanel from '$lib/components/playground/RequestPanel.svelte';
	import ResponsePanel from '$lib/components/playground/ResponsePanel.svelte';
	import SubmitButton from '$lib/components/playground/SubmitButton.svelte';
	import { buildSendRichMessagePayload } from '$lib/playground/payload';
	import { restoreReplyMarkup } from '$lib/playground/reply-markup';
	import type { MethodComponentProps, RichMessageFeedback } from '$lib/playground/types';
	import type { TelegramReplyMarkup } from '$lib/reply-markup';
	import type { InputRichBlock, InputRichText } from '$lib/rich-message';

	type BlockKind = 'paragraph' | 'heading' | 'pre' | 'list' | 'blockquote' | 'link' | 'table';
	type BlockDraft = {
		id: number;
		kind: BlockKind;
		text: string;
		headingSize: number;
		language: string;
		ordered: boolean;
		credit: string;
		url: string;
		tableHeader: boolean;
		bordered: boolean;
		striped: boolean;
	};

	let { initialFeedback }: MethodComponentProps = $props();
	const initial = untrack(() =>
		initialFeedback?.action === 'sendRichMessage' ? initialFeedback : null
	);
	let nextId = 0;
	let pending = $state(false);
	let feedback = $state<RichMessageFeedback | null>(initial);
	let chatId = $state(initial?.fields?.chatId ?? '');
	let drafts = $state<BlockDraft[]>(restoreDrafts(initial?.fields?.blocks));
	let isRtl = $state(initial?.fields?.isRtl === 'true');
	let skipEntityDetection = $state(initial?.fields?.skipEntityDetection === 'true');
	let replyMarkup = $state<TelegramReplyMarkup | undefined>(
		restoreReplyMarkup(initial?.fields?.replyMarkup)
	);
	const blocks = $derived(drafts.map(toInputBlock));
	const serializedBlocks = $derived(JSON.stringify(blocks));
	const requestPayload = $derived(
		buildSendRichMessagePayload({
			chatId,
			blocks,
			isRtl,
			skipEntityDetection,
			replyMarkup
		})
	);
	const sentMessage = $derived(messageResult(feedback?.response));

	const enhanceForm: SubmitFunction = () => {
		pending = true;
		feedback = null;
		return async ({ result, update }) => {
			try {
				feedback = getFeedback(result);
				if (result.type === 'success') drafts = [newDraft()];
				await update({ reset: false, invalidateAll: false });
			} finally {
				pending = false;
			}
		};
	};

	function newDraft(kind: BlockKind = 'paragraph', text = ''): BlockDraft {
		return {
			id: nextId++,
			kind,
			text,
			headingSize: 2,
			language: '',
			ordered: false,
			credit: '',
			url: '',
			tableHeader: true,
			bordered: true,
			striped: false
		};
	}

	function addBlock() {
		drafts.push(newDraft());
	}

	function removeBlock(index: number) {
		if (drafts.length > 1) drafts.splice(index, 1);
	}

	function moveBlock(index: number, direction: -1 | 1) {
		const destination = index + direction;
		if (destination < 0 || destination >= drafts.length) return;
		[drafts[index], drafts[destination]] = [drafts[destination], drafts[index]];
	}

	function toInputBlock(draft: BlockDraft): InputRichBlock {
		if (draft.kind === 'heading') {
			return { type: 'heading', text: draft.text, size: draft.headingSize };
		}
		if (draft.kind === 'pre') {
			return {
				type: 'pre',
				text: draft.text,
				...(draft.language.trim() ? { language: draft.language.trim() } : {})
			};
		}
		if (draft.kind === 'list') {
			return {
				type: 'list',
				items: draft.text
					.split('\n')
					.filter((item) => item.trim())
					.map((item, index) => ({
						blocks: [{ type: 'paragraph' as const, text: item }],
						...(draft.ordered ? { value: index + 1, type: '1' as const } : {})
					}))
			};
		}
		if (draft.kind === 'blockquote') {
			return {
				type: 'blockquote',
				blocks: [{ type: 'paragraph', text: draft.text }],
				...(draft.credit.trim() ? { credit: draft.credit } : {})
			};
		}
		if (draft.kind === 'link') {
			return {
				type: 'paragraph',
				text: { type: 'url', text: draft.text, url: draft.url }
			};
		}
		if (draft.kind === 'table') {
			return {
				type: 'table',
				cells: parseTable(draft.text).map((row, rowIndex) =>
					row.map((text) => ({
						...(text ? { text } : {}),
						...(draft.tableHeader && rowIndex === 0 ? { is_header: true as const } : {}),
						align: 'left' as const,
						valign: 'top' as const
					}))
				),
				...(draft.bordered ? { is_bordered: true as const } : {}),
				...(draft.striped ? { is_striped: true as const } : {})
			};
		}
		return { type: 'paragraph', text: draft.text };
	}

	function parseTable(value: string) {
		return value
			.split('\n')
			.filter((row) => row.trim())
			.map((row) => row.split(row.includes('\t') ? '\t' : '|').map((cell) => cell.trim()));
	}

	function restoreDrafts(value: string | undefined): BlockDraft[] {
		if (!value) return [newDraft()];
		try {
			const parsed = JSON.parse(value);
			if (!Array.isArray(parsed) || parsed.length === 0) return [newDraft()];
			return parsed.map(blockToDraft);
		} catch {
			return [newDraft()];
		}
	}

	function blockToDraft(block: InputRichBlock): BlockDraft {
		if (block.type === 'heading') {
			const draft = newDraft('heading', plainText(block.text));
			draft.headingSize = block.size;
			return draft;
		}
		if (block.type === 'pre') {
			const draft = newDraft('pre', plainText(block.text));
			draft.language = block.language ?? '';
			return draft;
		}
		if (block.type === 'list') {
			const draft = newDraft(
				'list',
				block.items.map((item) => nestedText(item.blocks)).join('\n')
			);
			draft.ordered = block.items.some((item) => item.value !== undefined);
			return draft;
		}
		if (block.type === 'blockquote') {
			const draft = newDraft('blockquote', nestedText(block.blocks));
			draft.credit = block.credit ? plainText(block.credit) : '';
			return draft;
		}
		if (block.type === 'table') {
			const draft = newDraft(
				'table',
				block.cells.map((row) => row.map((cell) => plainText(cell.text ?? '')).join(' | ')).join('\n')
			);
			draft.tableHeader = block.cells[0]?.some((cell) => cell.is_header) ?? false;
			draft.bordered = block.is_bordered === true;
			draft.striped = block.is_striped === true;
			return draft;
		}
		if (block.type === 'paragraph' && typeof block.text === 'object' && !Array.isArray(block.text) && block.text.type === 'url') {
			const draft = newDraft('link', plainText(block.text.text));
			draft.url = block.text.url;
			return draft;
		}
		return newDraft('paragraph', block.type === 'paragraph' ? plainText(block.text) : '');
	}

	function nestedText(blocks: InputRichBlock[]) {
		return blocks
			.map((block) =>
				block.type === 'paragraph' || block.type === 'heading' || block.type === 'pre'
					? plainText(block.text)
					: ''
			)
			.filter(Boolean)
			.join(' ');
	}

	function plainText(value: InputRichText): string {
		if (typeof value === 'string') return value;
		if (Array.isArray(value)) return value.map(plainText).join('');
		return plainText(value.text);
	}

	function blockError(index: number) {
		const errors = feedback?.fieldErrors ?? {};
		return Object.entries(errors).find(([path]) => path.startsWith(`blocks.${index}`))?.[1];
	}

	function getFeedback(result: ActionResult): RichMessageFeedback | null {
		if (result.type !== 'success' && result.type !== 'failure') return null;
		const value = result.data as RichMessageFeedback;
		return value.action === 'sendRichMessage' ? value : null;
	}

	function messageResult(response: unknown): { message_id: number; chat: { id: number } } | null {
		if (!response || typeof response !== 'object' || !('ok' in response) || response.ok !== true) return null;
		const result = 'result' in response ? response.result : null;
		if (!result || typeof result !== 'object' || !('message_id' in result) || !('chat' in result)) return null;
		const chat = result.chat;
		if (!chat || typeof chat !== 'object' || !('id' in chat)) return null;
		return result as { message_id: number; chat: { id: number } };
	}
</script>

<MethodLayout
	apiMethod="sendRichMessage"
	title="Rich message"
	description="Build and send structured Telegram content as explicit block objects."
	documentationUrl="https://core.telegram.org/bots/api#sendrichmessage"
>
	{#snippet request()}
		<RequestPanel titleId="send-rich-message-request-title" subtitle="Structured block parameters">
			<form method="POST" action="?/sendRichMessage" use:enhance={enhanceForm} aria-busy={pending}>
				<FormField label="chat_id" inputId="rich-message-chat-id" meta="String · required" help="Numeric chat ID or public channel username." error={feedback?.fieldErrors?.chatId}>
					{#snippet children({ describedBy, invalid })}
						<input id="rich-message-chat-id" name="chatId" type="text" placeholder="123456789 or @channel" bind:value={chatId} aria-describedby={describedBy} aria-invalid={invalid} />
					{/snippet}
				</FormField>

				<input type="hidden" name="blocks" value={serializedBlocks} />
				<section class="blocks" aria-labelledby="rich-message-blocks-title">
					<div class="blocks-heading">
						<div>
							<h3 id="rich-message-blocks-title">blocks</h3>
							<p>Each editor block maps directly to Telegram's structured block schema.</p>
						</div>
						<button type="button" onclick={addBlock} disabled={pending}>Add block</button>
					</div>
					{#if feedback?.fieldErrors?.blocks}<p class="block-error" role="alert">{feedback.fieldErrors.blocks}</p>{/if}

					{#each drafts as draft, index (draft.id)}
						<fieldset class="block-card">
							<legend>Block {index + 1}</legend>
							<div class="block-actions">
								<button type="button" onclick={() => moveBlock(index, -1)} disabled={index === 0 || pending} aria-label={`Move block ${index + 1} up`}>↑</button>
								<button type="button" onclick={() => moveBlock(index, 1)} disabled={index === drafts.length - 1 || pending} aria-label={`Move block ${index + 1} down`}>↓</button>
								<button type="button" onclick={() => removeBlock(index)} disabled={drafts.length === 1 || pending} aria-label={`Remove block ${index + 1}`}>Remove</button>
							</div>

							<label class="compact-field">
								<span>Block type</span>
								<select bind:value={draft.kind} aria-label={`Block ${index + 1} type`}>
									<option value="paragraph">Paragraph</option>
									<option value="heading">Heading</option>
									<option value="pre">Preformatted code</option>
									<option value="list">List</option>
									<option value="blockquote">Block quotation</option>
									<option value="link">Link</option>
									<option value="table">Table</option>
								</select>
							</label>

							{#if draft.kind === 'heading'}
								<label class="compact-field"><span>Heading size</span><select bind:value={draft.headingSize} aria-label={`Block ${index + 1} heading size`}>{#each [1, 2, 3, 4, 5, 6] as size (size)}<option value={size}>H{size}</option>{/each}</select></label>
							{/if}

							<label class="compact-field">
								<span>{draft.kind === 'table' ? 'Rows' : draft.kind === 'list' ? 'Items' : 'Text'}</span>
								<textarea rows={draft.kind === 'table' ? 5 : 3} bind:value={draft.text} aria-label={`Block ${index + 1} content`} placeholder={draft.kind === 'table' ? 'Name | Value\nStatus | Ready' : draft.kind === 'list' ? 'One item per line' : undefined}></textarea>
								{#if draft.kind === 'table'}<small>Separate cells with <code>|</code> or tabs.</small>{/if}
							</label>

							{#if draft.kind === 'pre'}
								<label class="compact-field"><span>Language</span><input type="text" bind:value={draft.language} aria-label={`Block ${index + 1} language`} placeholder="typescript" /></label>
							{:else if draft.kind === 'list'}
								<label class="check-field"><input type="checkbox" bind:checked={draft.ordered} /> Ordered list</label>
							{:else if draft.kind === 'blockquote'}
								<label class="compact-field"><span>Credit</span><input type="text" bind:value={draft.credit} aria-label={`Block ${index + 1} credit`} /></label>
							{:else if draft.kind === 'link'}
								<label class="compact-field"><span>URL</span><input type="url" bind:value={draft.url} aria-label={`Block ${index + 1} URL`} placeholder="https://example.com" /></label>
							{:else if draft.kind === 'table'}
								<div class="checks"><label><input type="checkbox" bind:checked={draft.tableHeader} /> First row is header</label><label><input type="checkbox" bind:checked={draft.bordered} /> Bordered</label><label><input type="checkbox" bind:checked={draft.striped} /> Striped</label></div>
							{/if}

							{#if blockError(index)}<p class="block-error" role="alert">{blockError(index)}</p>{/if}
						</fieldset>
					{/each}
				</section>

				<div class="checks">
					<label><input type="checkbox" name="isRtl" value="true" bind:checked={isRtl} /> Right-to-left layout</label>
					<label><input type="checkbox" name="skipEntityDetection" value="true" bind:checked={skipEntityDetection} /> Skip automatic entity detection</label>
				</div>

				<ReplyMarkupEditor bind:value={replyMarkup} errors={feedback?.replyMarkupErrors} idPrefix="send-rich-message-reply" />
				<PayloadPreview titleId="send-rich-message-payload-title" payload={requestPayload} />
				<SubmitButton {pending} />
			</form>
		</RequestPanel>
	{/snippet}

	{#snippet response()}
		<ResponsePanel titleId="send-rich-message-response-title" status={feedback?.response ? (feedback.success ? 'success' : 'error') : undefined} rawResponse={feedback?.response}>
			{#if feedback?.success && sentMessage}
				<Notice kind="success" title="Rich message sent"><p>Message <code>#{sentMessage.message_id}</code> was accepted for chat <code>{sentMessage.chat.id}</code>.</p></Notice>
			{:else if feedback?.error}
				<Notice kind="error" title="Request failed"><p>{feedback.error}</p></Notice>
			{:else}
				<EmptyResponse />
			{/if}
		</ResponsePanel>
	{/snippet}
</MethodLayout>

<style>
	form, .blocks { display: grid; gap: 1.15rem; }
	.blocks-heading { display: flex; align-items: start; justify-content: space-between; gap: 1rem; }
	h3, .blocks-heading p, .block-error { margin: 0; }
	h3 { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.72rem; }
	.blocks-heading p { margin-top: 0.25rem; color: var(--text-muted); font-size: 0.65rem; }
	.block-card { position: relative; display: grid; gap: 0.8rem; min-width: 0; margin: 0; border: 1px solid var(--border); border-radius: 0.45rem; padding: 0.9rem; }
	.block-card legend { padding: 0 0.3rem; font-size: 0.68rem; font-weight: 750; }
	.block-actions { position: absolute; top: -0.7rem; right: 0.6rem; display: flex; gap: 0.3rem; background: var(--surface); padding: 0 0.2rem; }
	.compact-field { display: grid; gap: 0.4rem; color: var(--text-muted); font-size: 0.68rem; font-weight: 650; }
	.compact-field small { font-weight: 400; }
	.checks { display: flex; flex-wrap: wrap; gap: 0.8rem; }
	.checks label, .check-field { display: flex; align-items: center; gap: 0.35rem; color: var(--text-muted); font-size: 0.68rem; }
	button { border: 1px solid var(--border-strong); border-radius: 0.32rem; background: var(--surface); padding: 0.38rem 0.55rem; color: var(--text); font: inherit; font-size: 0.62rem; font-weight: 700; cursor: pointer; }
	button:disabled { cursor: not-allowed; opacity: 0.45; }
	input[type='text'], input[type='url'], select, textarea { width: 100%; border: 1px solid var(--border-strong); border-radius: 0.4rem; background: var(--surface); padding: 0.65rem 0.7rem; color: var(--text); font: inherit; font-size: 0.74rem; }
	textarea { resize: vertical; line-height: 1.45; }
	input:focus, select:focus, textarea:focus, button:focus-visible { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(22, 138, 192, 0.1); outline: none; }
	.block-error { color: #b83f4c; font-size: 0.68rem; }
	@media (max-width: 560px) { .blocks-heading { align-items: stretch; flex-direction: column; } .blocks-heading button { align-self: start; } }
</style>
