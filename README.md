# ContextCraft — AI Chat Context Extractor

Turn shared Claude chats into structured `.md` context files to use in new conversations.

## What it does

Paste a public Claude share link → the app:
1. Fetches and parses the conversation
2. Sends it to Claude API for structured summarization
3. Returns a markdown file with: main problem, solutions tried, failures, next steps, key decisions, and code snippets

---

## Setup

### Prerequisites
- Node.js 18+
- An Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com))

### Install & Run

```bash
# 1. Install dependencies for both server and client
npm run setup

# 2a. Start server (port 3001) in one terminal
npm run server

# 2b. Start client (port 5173) in another terminal
npm run client
```

Then open **http://localhost:5173**

---

## How to use

1. In Claude, open a chat and click **Share** → make it public → copy the link
2. In ContextCraft, paste the link and your Anthropic API key
3. Click **Extract Context**
4. Download the `.md` file and paste it as context into any new chat

---

## Project Structure

```
chat-context-extractor/
├── server/
│   ├── index.js        # Express server: scrapes Claude links, calls Anthropic API
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.jsx     # Main React app
│   │   ├── App.css     # Styles
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
└── README.md
```

---

## Expanding to other platforms (future)

- **ChatGPT**: Needs Playwright (headless browser) since it's a Next.js SPA
- **Gemini**: No native share links yet; may need browser extension approach
- **Perplexity**: Playwright + custom parser

To add a platform, add a new scraper function in `server/index.js` and update the URL validation check.

---

## Notes

- Your API key is stored in `localStorage` only — never sent to any third party
- The server only talks to `claude.ai` and `api.anthropic.com`
- Claude shared links must be **public** (not team/enterprise restricted)
