# Telegram Playground Tasks

## Foundation

1. [x] **Extract a scalable method architecture**
   - Move each method form into its own component and drive navigation from a typed method registry.
   - Extract the shared request layout, submit state, validation display, response status, and raw JSON inspector.
   - Preserve the current `getMe` and `sendMessage` behavior while making each new method additive.

2. [x] **Preview and copy request payloads**
   - Show the payload that will be sent for every method so its structure is easy to inspect.
   - Keep the preview synchronized with the current form values before submission.
   - Provide a one-click copy action with clear success and failure feedback.
   - Represent multipart uploads safely with file metadata instead of reading or exposing file contents.

## Reply options

1. [x] **Inline URL and copy-text buttons**
   - Build reusable multi-row inline keyboards with URL and clipboard actions.

2. [x] **Inline callback-data buttons**
   - Support 1–64 byte callback payloads while deferring received callback handling to webhook work.

3. [x] **Plain-text reply keyboards**
   - Build multi-row text keyboards with persistence, resize, one-time, and placeholder options.

4. [x] **Remove keyboard and force reply**
   - Remove an existing reply keyboard or open Telegram's reply composer with an optional placeholder.

## Formatting and interactions

1. [x] **Parse mode — HTML and MarkdownV2**
   - Support Telegram's HTML and MarkdownV2 formatting modes for message text and media captions.

2. [x] **Replies and quotations**
   - Add `reply_parameters` with message targeting, quoted text, quote formatting, and quote-position controls.

3. [x] **Protected content**
   - Support `protect_content` to prevent sent messages from being forwarded or saved where Telegram permits it.

4. [x] **Silent messages**
   - Support `disable_notification` to deliver messages without notification sound.

5. [x] **Message effects**
   - Add `message_effect_id` for messages sent to private chats and expose the selected effect in the payload preview.

6. [x] **Message reactions**
   - Implement `setMessageReaction` with standard or custom emoji reactions and optional large animation.

7. [x] **Colored inline buttons**
   - Support the `primary`, `success`, and `danger` inline-button styles while preserving Telegram's default style.

8. [x] **Custom emoji button icons**
   - Add `icon_custom_emoji_id` to inline keyboard buttons and document Telegram's account and chat restrictions.

## Message types

1. [x] **Text message — `sendMessage`**
   - Plain text is implemented.
   - Add HTML and MarkdownV2 formatting, link preview options, replies, inline keyboards, and reply keyboards incrementally.

2. [x] **Photo — `sendPhoto`**
   - Support file upload, URL, or `file_id`, plus caption and media spoiler.

3. [x] **Document / file — `sendDocument`**
   - Preserve the filename and MIME type and support an optional caption.

4. [x] **Voice note — `sendVoice`**
   - Support Telegram's voice-message format and optional caption.

5. [x] **Audio / music — `sendAudio`**
   - Support title, performer, duration, thumbnail, and optional caption.

6. [x] **Video — `sendVideo`**
   - Support caption, duration, dimensions, thumbnail, streaming, and media spoiler.

7. [x] **Video note — `sendVideoNote`**
   - Support Telegram's short, round video-message format.

8. [x] **Animation / GIF — `sendAnimation`**
   - Support MP4/GIF-style animation, caption, duration, dimensions, thumbnail, and spoiler.

9. [ ] **Sticker — `sendSticker`**
   - Support static, animated, and video stickers.

10. [x] **Contact — `sendContact`**
    - Support phone number, first name, last name, and optional vCard.

11. [x] **Location — `sendLocation`**
    - Support latitude, longitude, accuracy, heading, proximity alerts, and optional live period.

12. [x] **Venue — `sendVenue`**
    - Support coordinates, title, address, and optional provider identifiers.

13. [x] **Poll / quiz — `sendPoll`**
    - Support regular polls, quizzes, answer options, explanation, anonymity, and open period.

14. [x] **Dice — `sendDice`**
    - Support dice, darts, basketball, football, bowling, and slot-machine emoji variants.

15. [x] **Media group / album — `sendMediaGroup`**
    - Support compatible photo, video, audio, and document collections.

16. [ ] **Streaming text draft — `sendMessageDraft`**
    - Stream an ephemeral text preview and finalize it with `sendMessage`.

17. [x] **Rich message — `sendRichMessage`**
    - Start with paragraphs, headings, lists, quotations, code, links, and tables.

18. [ ] **Streaming rich-message draft — `sendRichMessageDraft`**
    - Stream partial structured content and finalize it with `sendRichMessage`.
