# Telegram API Playground

A focused local web interface for testing Telegram Bot API methods. Methods are organized in a typed registry so new request forms can be added incrementally.

## Prerequisites

- Node.js 20 or newer
- A Telegram bot created through [@BotFather](https://t.me/BotFather)
- The bot token provided by BotFather

## Setup

Install the project dependencies:

```sh
npm install
```

Create your local environment file from the checked-in example:

```sh
cp .env.example .env
```

Replace the placeholder in `.env` with your bot token:

```dotenv
TELEGRAM_BOT_TOKEN=123456789:your-real-bot-token
```

The token is read only by SvelteKit server modules. It is never included in page data or browser-side requests, and `.env` is ignored by Git.

## Development

Start the local server:

```sh
npm run dev
```

Open the URL printed by Vite, normally [http://localhost:5173](http://localhost:5173).

1. Run `getMe` to verify the configured bot token.
2. Choose a send method from the sidebar.
3. Enter a numeric chat ID or public channel username and the method parameters.

Telegram bots cannot initiate a private conversation with a user. The user must message the bot first before the bot can send a private reply.

## Supported methods

### `getMe`

Verifies the token and returns the connected bot's identity. The playground displays the bot name, username, ID, and the complete JSON response.

### `sendMessage`

Sends plain text using:

- `chat_id`: a numeric chat ID or public channel username such as `@example_channel`
- `text`: between 1 and 4,096 characters

### `sendPhoto`

Sends a photo from a local upload, HTTP URL, or Telegram `file_id`, with an optional plain-text caption and media spoiler.

### `sendDocument`

Sends a document from a local upload, HTTP URL, or Telegram `file_id`, with an optional plain-text caption. Local uploads preserve the file's name and MIME type.

### `sendVoice`

Sends a voice note from a local upload, HTTP URL, or Telegram `file_id`, with an optional plain-text caption and duration.

Formatting modes, reply markup, webhooks, update polling, persistence, and request history remain out of scope.

## Quality checks

```sh
npm run check
npm run lint
npm run test
npm run build
```
