import GetMeMethod from '$lib/components/methods/GetMeMethod.svelte';
import SendMessageMethod from '$lib/components/methods/SendMessageMethod.svelte';
import SendPhotoMethod from '$lib/components/methods/SendPhotoMethod.svelte';
import SendDocumentMethod from '$lib/components/methods/SendDocumentMethod.svelte';
import SendVoiceMethod from '$lib/components/methods/SendVoiceMethod.svelte';
import SendAudioMethod from '$lib/components/methods/SendAudioMethod.svelte';
import SendVideoMethod from '$lib/components/methods/SendVideoMethod.svelte';
import SendVideoNoteMethod from '$lib/components/methods/SendVideoNoteMethod.svelte';
import SendAnimationMethod from '$lib/components/methods/SendAnimationMethod.svelte';
import SendContactMethod from '$lib/components/methods/SendContactMethod.svelte';
import SendLocationMethod from '$lib/components/methods/SendLocationMethod.svelte';
import SendVenueMethod from '$lib/components/methods/SendVenueMethod.svelte';
import SendPollMethod from '$lib/components/methods/SendPollMethod.svelte';
import SendDiceMethod from '$lib/components/methods/SendDiceMethod.svelte';
import SendMediaGroupMethod from '$lib/components/methods/SendMediaGroupMethod.svelte';
import SendRichMessageMethod from '$lib/components/methods/SendRichMessageMethod.svelte';
import AnswerCallbackQueryMethod from '$lib/components/methods/AnswerCallbackQueryMethod.svelte';
import EditMessageReplyMarkupMethod from '$lib/components/methods/EditMessageReplyMarkupMethod.svelte';
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
	},
	{
		id: 'sendAudio',
		label: 'Audio',
		apiMethod: 'sendAudio',
		group: 'Messages',
		component: SendAudioMethod
	},
	{
		id: 'sendVideo',
		label: 'Video',
		apiMethod: 'sendVideo',
		group: 'Messages',
		component: SendVideoMethod
	},
	{
		id: 'sendVideoNote',
		label: 'Video note',
		apiMethod: 'sendVideoNote',
		group: 'Messages',
		component: SendVideoNoteMethod
	},
	{
		id: 'sendAnimation',
		label: 'Animation',
		apiMethod: 'sendAnimation',
		group: 'Messages',
		component: SendAnimationMethod
	},
	{
		id: 'sendContact',
		label: 'Contact',
		apiMethod: 'sendContact',
		group: 'Messages',
		component: SendContactMethod
	},
	{
		id: 'sendLocation',
		label: 'Location',
		apiMethod: 'sendLocation',
		group: 'Messages',
		component: SendLocationMethod
	},
	{
		id: 'sendVenue',
		label: 'Venue',
		apiMethod: 'sendVenue',
		group: 'Messages',
		component: SendVenueMethod
	},
	{
		id: 'sendPoll',
		label: 'Poll / quiz',
		apiMethod: 'sendPoll',
		group: 'Messages',
		component: SendPollMethod
	},
	{
		id: 'sendDice',
		label: 'Dice',
		apiMethod: 'sendDice',
		group: 'Messages',
		component: SendDiceMethod
	},
	{
		id: 'sendMediaGroup',
		label: 'Media group',
		apiMethod: 'sendMediaGroup',
		group: 'Messages',
		component: SendMediaGroupMethod
	},
	{
		id: 'sendRichMessage',
		label: 'Rich message',
		apiMethod: 'sendRichMessage',
		group: 'Messages',
		component: SendRichMessageMethod
	},
	{
		id: 'answerCallbackQuery',
		label: 'Answer callback',
		apiMethod: 'answerCallbackQuery',
		group: 'Inline keyboards',
		component: AnswerCallbackQueryMethod
	},
	{
		id: 'editMessageReplyMarkup',
		label: 'Edit keyboard',
		apiMethod: 'editMessageReplyMarkup',
		group: 'Inline keyboards',
		component: EditMessageReplyMarkupMethod
	}
] satisfies PlaygroundMethod[];

const groupLabels: PlaygroundMethod['group'][] = ['Bot', 'Messages', 'Inline keyboards'];

export const methodGroups: MethodGroup[] = groupLabels.map((label) => ({
	label,
	methods: methods.filter((method) => method.group === label)
}));

export function isMethodId(value: unknown): value is MethodId {
	return methods.some((method) => method.id === value);
}
