# Reply Markup Implementation Plan

## Goal

Add a shared `reply_markup` editor to every current send method:

- `sendMessage`
- `sendPhoto`
- `sendDocument`
- `sendVoice`

The editor must keep the payload preview synchronized with the form and support the following Telegram behaviors only:

1. Inline keyboards with URL and copy-text buttons.
2. Inline callback-data buttons.
3. Plain-text reply keyboards.
4. Reply-keyboard removal and forced replies.

`getMe` is unchanged.

## Scope

### Inline keyboards

Support multiple rows and multiple buttons per row. Each button has a required label and exactly one action:

- `url`: HTTP, HTTPS, or `tg://` URL.
- `copy_text`: text between 1 and 256 characters.
- `callback_data`: opaque data between 1 and 64 UTF-8 bytes.

The editor provides accessible controls to add, remove, and reorder rows and buttons. Drag-and-drop is not required.

Callback buttons can be sent, but receiving `CallbackQuery` updates and calling `answerCallbackQuery` are out of scope until webhook support exists.

### Reply keyboards

Support multiple rows of plain-text buttons and these keyboard options:

- `is_persistent`
- `resize_keyboard`
- `one_time_keyboard`
- `input_field_placeholder` between 1 and 64 characters when present

Request-contact, location, poll, user, chat, managed-bot, and Web App buttons are out of scope.

### Remove keyboard

Send only:

```json
{
  "remove_keyboard": true
}
```

### Force reply

Support `force_reply: true` and an optional `input_field_placeholder` between 1 and 64 characters.

The Telegram `selective` option is intentionally excluded from all modes.

## Domain contract

Create a shared, discriminated Telegram model:

```ts
type InlineKeyboardButton =
  | { text: string; url: string }
  | { text: string; copy_text: { text: string } }
  | { text: string; callback_data: string };

type TelegramReplyMarkup =
  | { inline_keyboard: InlineKeyboardButton[][] }
  | {
      keyboard: { text: string }[][];
      is_persistent?: boolean;
      resize_keyboard?: boolean;
      one_time_keyboard?: boolean;
      input_field_placeholder?: string;
    }
  | { remove_keyboard: true }
  | { force_reply: true; input_field_placeholder?: string };
```

Only the properties above are accepted. The server remains authoritative and rejects malformed JSON, unknown modes or properties, empty rows, empty labels, invalid action values, and limit violations.

## Interface

Add a reusable **Reply options** section with mutually exclusive modes:

- None
- Inline keyboard
- Reply keyboard
- Remove keyboard
- Force reply

Dynamic keyboard state uses stable client-only identifiers. A hidden `replyMarkup` field contains the normalized Telegram JSON submitted by the progressively enhanced form. If JavaScript is unavailable, the existing message form continues to work without reply markup.

Invalid submissions preserve the entire reply-markup configuration and focus the first invalid control. Successful sends preserve the keyboard configuration for repeated tests while retaining the existing behavior of clearing message text or captions.

The live payload preview shows the exact normalized `reply_markup` object. Multipart requests serialize the object as the `reply_markup` form-data field; JSON requests include it directly.

## Server and transport

- Parse and validate `replyMarkup` in every current send action.
- Add the normalized object to `sendMessage` JSON requests.
- Extend photo, document, and voice request preparers for JSON and multipart bodies.
- Preserve safe Telegram/network error handling and never include the bot token in errors.
- Keep requests without reply markup byte-for-byte compatible with current behavior.

## Validation and tests

Cover:

- URL, copy-text, and callback-data buttons.
- Multiple rows and buttons.
- UTF-8 byte counting for callback data.
- Copy-text and placeholder length limits.
- Invalid protocols, malformed JSON, unknown fields, empty labels, and empty rows.
- Exactly one inline action per button.
- Reply-keyboard options, keyboard removal, and forced replies.
- JSON and multipart serialization.
- Form value preservation after validation failure.
- Existing sends without `reply_markup`.
- Live payload updates, copy behavior, keyboard navigation, error focus, and responsive layout.

Run the Svelte autofixer on every changed Svelte component, followed by `npm run check`, `npm run lint`, `npm run test`, and `npm run build`.

## Explicitly out of scope

- `selective`
- Webhooks, polling, and received updates
- `answerCallbackQuery`
- `editMessageReplyMarkup`
- Contact, location, poll, user, chat, managed-bot, and Web App reply buttons
- Login, inline-mode switching, Mini App, game, and payment inline buttons
- Button styles and custom emoji
