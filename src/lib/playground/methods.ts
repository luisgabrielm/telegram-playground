import GetMeMethod from '$lib/components/methods/GetMeMethod.svelte';
import SendMessageMethod from '$lib/components/methods/SendMessageMethod.svelte';
import SendPhotoMethod from '$lib/components/methods/SendPhotoMethod.svelte';
import SendDocumentMethod from '$lib/components/methods/SendDocumentMethod.svelte';
import SendVoiceMethod from '$lib/components/methods/SendVoiceMethod.svelte';
import type { MethodGroup, MethodId, PlaygroundMethod } from './types';

export const methods = [
	{
		id: 'getMe',
		label: 'Bot information',
		apiMethod: 'getMe',
		group: 'Bot',
		component: GetMeMethod
	},
	{
		id: 'sendMessage',
		label: 'Text message',
		apiMethod: 'sendMessage',
		group: 'Messages',
		component: SendMessageMethod
	},
	{
		id: 'sendPhoto',
		label: 'Photo',
		apiMethod: 'sendPhoto',
		group: 'Messages',
		component: SendPhotoMethod
	},
	{
		id: 'sendDocument',
		label: 'Document',
		apiMethod: 'sendDocument',
		group: 'Messages',
		component: SendDocumentMethod
	},
	{
		id: 'sendVoice',
		label: 'Voice note',
		apiMethod: 'sendVoice',
		group: 'Messages',
		component: SendVoiceMethod
	}
] satisfies PlaygroundMethod[];

const groupLabels: PlaygroundMethod['group'][] = ['Bot', 'Messages'];

export const methodGroups: MethodGroup[] = groupLabels.map((label) => ({
	label,
	methods: methods.filter((method) => method.group === label)
}));

export function isMethodId(value: unknown): value is MethodId {
	return methods.some((method) => method.id === value);
}
