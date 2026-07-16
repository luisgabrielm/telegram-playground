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

5. [ ] **Audio / music — `sendAudio`**
   - Support title, performer, duration, thumbnail, and optional caption.

6. [ ] **Video — `sendVideo`**
   - Support caption, duration, dimensions, thumbnail, streaming, and media spoiler.

7. [ ] **Video note — `sendVideoNote`**
   - Support Telegram's short, round video-message format.

8. [ ] **Animation / GIF — `sendAnimation`**
   - Support MP4/GIF-style animation, caption, duration, dimensions, thumbnail, and spoiler.

9. [ ] **Sticker — `sendSticker`**
   - Support static, animated, and video stickers.

10. [ ] **Contact — `sendContact`**
    - Support phone number, first name, last name, and optional vCard.

11. [ ] **Location — `sendLocation`**
    - Support latitude, longitude, accuracy, heading, proximity alerts, and optional live period.

12. [ ] **Venue — `sendVenue`**
    - Support coordinates, title, address, and optional provider identifiers.

13. [ ] **Poll / quiz — `sendPoll`**
    - Support regular polls, quizzes, answer options, explanation, anonymity, and open period.

14. [ ] **Dice — `sendDice`**
    - Support dice, darts, basketball, football, bowling, and slot-machine emoji variants.

15. [ ] **Media group / album — `sendMediaGroup`**
    - Support compatible photo, video, audio, and document collections.

16. [ ] **Streaming text draft — `sendMessageDraft`**
    - Stream an ephemeral text preview and finalize it with `sendMessage`.

17. [ ] **Rich message — `sendRichMessage`**
    - Start with paragraphs, headings, lists, quotations, code, links, and tables.

18. [ ] **Streaming rich-message draft — `sendRichMessageDraft`**
    - Stream partial structured content and finalize it with `sendRichMessage`.
