## Description

MCP server for Gmail workflows. It lets Claude Desktip as the MCP client read unread emails, create draft replies and fetch writing style guidance knowledge.

### Tools
`get_unread_emails` - reads unread emails from Gmail inbox and returns sender, subject, date, snippet, full text body, message ID, and thread ID

`create_draft_reply` - creates a Gmail draft reply in the same thread using `In-Reply-To` and `References` headers for grouping

`get_style_guide` - loads markdown knowledge file and returns as context for writing email replies in preferred writing style

## Tech stack
- TypeScript
- Node.js (ESM)
- `@modelcontextprotocol/sdk`
- Google Gmail API (`googleapis`, `google-auth-library`)

## Prerequisites
- Node.js 18+
- Google Cloud OAuth app with Gmail scopes enabled
  - OAuth client set in `credentials.json` with redirect URI: http://localhost:3000/oauth2callback
  - Scopes: https://www.googleapis.com/auth/gmail.readonly snd https://www.googleapis.com/auth/gmail.compose
- `credentials.json` set and placed in the repository root

## How to

### Install

```bash
npm install
```

### Authenticate locally (first run)

```bash
npm run auth
```

- The app prints an authorization url
- Open it in your browser and approve access
- Google redirects to `http://localhost:3000/oauth2callback`
- The server stores tokens in `token.json`

### Build

```bash
npm run build
```

### Run server

```bash
npm run start
```

This starts the MCP server over stdio

### Test

#### Connect to Claude Desktop

<img width="400" alt="Screenshot1" src="https://github.com/user-attachments/assets/1f666488-ba69-4602-b106-37ba1e537f00" />


1. Open Claude Desktop config file: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
2. Add this MCP server entry under `mcpServers`:
```json
{
	"mcpServers": {
		"email-mcp": {
			"command": "node",
			"args": ["/Users/your-username/path/to/email-mcp/dist/index.js"]
		}
	}
}
```
3. Save the file and fully restart Claude Desktop

Note: If there are auth/token issues delete `token.json` and run `npm run auth` again

#### Test with MCP Inspector
When there's no Claude Desktop installed.
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

### Test prompts
#### Reading emails:
- Can you check my unread emails?
- Show me my latest 5 unread emails and summarise each one briefly.
#### Drafting replies with writing style preferences:
- Read my unread emails and draft a reply to the most recent one.
- Check my unread emails and draft a reply to the most recent one using my style guide.

<img width="400" alt="Screenshot2" src="https://github.com/user-attachments/assets/7f9ffc54-4e8e-4c9f-9911-b7f123794fd2" /> <img width="400" alt="Screenshot3" src="https://github.com/user-attachments/assets/3621dbe7-5b79-4168-aca5-bae9679f2984" />


## Knowledge files

The `get_style_guide` tool reads all markdown files from: `knowledge/`. You can add more markdown files there to expand context.
