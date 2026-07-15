# Telegram API Playground

A focused local web interface for testing Telegram Bot API methods. The first version supports checking a bot with `getMe` and sending plain-text messages with `sendMessage`.

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
2. Enter a numeric chat ID or public channel username.
3. Write a message and run `sendMessage`.

Telegram bots cannot initiate a private conversation with a user. The user must message the bot first before the bot can send a private reply.

## Supported methods

### `getMe`

Verifies the token and returns the connected bot's identity. The playground displays the bot name, username, ID, and the complete JSON response.

### `sendMessage`

Sends plain text using:

- `chat_id`: a numeric chat ID or public channel username such as `@example_channel`
- `text`: between 1 and 4,096 characters

Formatting modes, media, reply markup, webhooks, update polling, persistence, and request history are intentionally outside V1.

## Quality checks

```sh
npm run check
npm run lint
npm run test
npm run build
```
