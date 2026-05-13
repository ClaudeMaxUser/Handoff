import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// ─────────────────────────────────────────────
// Claude shared-link scraper
// ─────────────────────────────────────────────
async function scrapeClaudeChat(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch Claude link (${res.status})`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const messages = [];

  // Claude shared chats render messages in div[data-testid] blocks.
  // We look for human and assistant turns broadly.
  $("[data-testid='human-turn'], [data-testid='ai-turn']").each((_, el) => {
    const role = $(el).attr("data-testid") === "human-turn" ? "human" : "assistant";
    const text = $(el).text().trim();
    if (text) messages.push({ role, text });
  });

  // Fallback: try common class patterns if testids aren't present
  if (messages.length === 0) {
    $(".font-claude-message, .whitespace-pre-wrap").each((_, el) => {
      const text = $(el).text().trim();
      if (text) messages.push({ role: "assistant", text });
    });
  }

  // Second fallback: grab all paragraphs from main content area
  if (messages.length === 0) {
    $("main p, article p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 30) messages.push({ role: "unknown", text });
    });
  }

  if (messages.length === 0) {
    throw new Error(
      "Could not extract messages. The link may be private or the page structure has changed."
    );
  }

  return messages;
}

// ─────────────────────────────────────────────
// Summarize with Claude API
// ─────────────────────────────────────────────
async function summarizeChat(messages, apiKey) {
  const client = new Anthropic({ apiKey });

  const transcript = messages
    .map((m) => `[${m.role.toUpperCase()}]\n${m.text}`)
    .join("\n\n---\n\n");

  const prompt = `You are a technical assistant. Below is an AI chat transcript. Analyze it and produce a structured Markdown context document with these exact sections:

# Chat Context Summary

## Main Problem
A clear 2-3 sentence description of the core problem being solved.

## Context & Background
Key background info, constraints, tech stack, or environment mentioned.

## Solutions Tried
A numbered list of every approach attempted, with a brief outcome for each.

## What Failed & Why
For each failed approach, explain specifically why it didn't work.

## New Directions to Try
Concrete next steps or approaches not yet attempted, based on the conversation.

## Key Decisions Made
Important decisions or conclusions reached during the chat.

## Important Code / Config Snippets
Any critical code, commands, or config blocks referenced (include in code fences).

---

Only include sections that have real content. Be concise but specific. Do not invent information.

TRANSCRIPT:
${transcript}`;

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content[0].text;
}

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────

// Health check
app.get("/api/health", (_, res) => res.json({ ok: true }));

// Extract + summarize
app.post("/api/extract", async (req, res) => {
  const { url, apiKey } = req.body;

  if (!url || !apiKey) {
    return res.status(400).json({ error: "url and apiKey are required" });
  }

  // Validate it looks like a Claude share URL
  if (!url.includes("claude.ai/share") && !url.includes("claude.ai/chat")) {
    return res
      .status(400)
      .json({ error: "Only claude.ai shared links are supported right now" });
  }

  try {
    console.log(`Scraping: ${url}`);
    const messages = await scrapeClaudeChat(url);
    console.log(`Extracted ${messages.length} messages`);

    const markdown = await summarizeChat(messages, apiKey);
    console.log("Summarization complete");

    res.json({
      success: true,
      messageCount: messages.length,
      markdown,
      rawMessages: messages, // send raw too so frontend can show toggle
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
