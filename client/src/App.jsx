import { useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

const STEPS = ["input", "loading", "result"];

function App() {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("cc_apikey") || "");
  const [showKey, setShowKey] = useState(false);
  const [step, setStep] = useState("input");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [viewRaw, setViewRaw] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  const loadingMessages = [
    "Fetching chat snapshot…",
    "Parsing conversation turns…",
    "Extracting context with Claude…",
    "Building your markdown…",
  ];

  async function handleExtract() {
    if (!url.trim()) return setError("Please enter a Claude share link.");
    if (!apiKey.trim()) return setError("Please enter your Anthropic API key.");

    setError("");
    setStep("loading");

    // Cycle loading messages
    let i = 0;
    setLoadingMsg(loadingMessages[0]);
    const interval = setInterval(() => {
      i = (i + 1) % loadingMessages.length;
      setLoadingMsg(loadingMessages[i]);
    }, 2200);

    try {
      localStorage.setItem("cc_apikey", apiKey);

      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), apiKey: apiKey.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Extraction failed");
      }

      setResult(data);
      setStep("result");
    } catch (err) {
      setError(err.message);
      setStep("input");
    } finally {
      clearInterval(interval);
    }
  }

  function handleDownload() {
    const blob = new Blob([result.markdown], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "context.md";
    a.click();
  }

  function handleReset() {
    setStep("input");
    setResult(null);
    setError("");
    setUrl("");
    setViewRaw(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(result.markdown);
  }

  return (
    <div className="app">
      {/* Background grid */}
      <div className="bg-grid" />
      <div className="bg-glow" />

      <header className="header">
        <div className="logo">
          <span className="logo-icon">⬡</span>
          <span className="logo-text">Handoff</span>
        </div>
        <p className="tagline">Turn AI chats into reusable context files</p>
      </header>

      <main className="main">
        {step === "input" && (
          <InputPanel
            url={url}
            setUrl={setUrl}
            apiKey={apiKey}
            setApiKey={setApiKey}
            showKey={showKey}
            setShowKey={setShowKey}
            error={error}
            onSubmit={handleExtract}
          />
        )}

        {step === "loading" && <LoadingPanel message={loadingMsg} />}

        {step === "result" && result && (
          <ResultPanel
            result={result}
            viewRaw={viewRaw}
            setViewRaw={setViewRaw}
            onDownload={handleDownload}
            onCopy={handleCopy}
            onReset={handleReset}
          />
        )}
      </main>

      <footer className="footer">
        <span>Claude links only · More platforms coming soon</span>
      </footer>
    </div>
  );
}

// ─── Input Panel ────────────────────────────────────────────────
function InputPanel({ url, setUrl, apiKey, setApiKey, showKey, setShowKey, error, onSubmit }) {
  return (
    <div className="panel input-panel">
      <div className="panel-header">
        <h1>Extract Chat Context</h1>
        <p>Paste a shared Claude chat link and get a structured <code>.md</code> context file.</p>
      </div>

      <div className="form">
        <div className="field">
          <label>Claude Share Link</label>
          <div className="input-row">
            <span className="input-prefix">🔗</span>
            <input
              type="url"
              placeholder="https://claude.ai/share/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              className="text-input"
            />
          </div>
          <p className="field-hint">Make sure the chat is set to public/shareable in Claude</p>
        </div>

        <div className="field">
          <label>
            Anthropic API Key
            <span className="field-badge">stored locally</span>
          </label>
          <div className="input-row">
            <span className="input-prefix">🔑</span>
            <input
              type={showKey ? "text" : "password"}
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="text-input mono"
            />
            <button
              className="toggle-btn"
              onClick={() => setShowKey((s) => !s)}
              title={showKey ? "Hide" : "Show"}
            >
              {showKey ? "👁" : "🙈"}
            </button>
          </div>
          <p className="field-hint">Used only for this request. Saved in localStorage.</p>
        </div>

        {error && (
          <div className="error-box">
            <span>⚠</span> {error}
          </div>
        )}

        <button className="cta-btn" onClick={onSubmit}>
          <span>Extract Context</span>
          <span className="btn-arrow">→</span>
        </button>
      </div>

      <div className="how-it-works">
        <p className="section-label">HOW IT WORKS</p>
        <div className="steps-row">
          {[
            { icon: "📋", title: "Paste link", desc: "Share your Claude chat publicly" },
            { icon: "⚙", title: "We parse it", desc: "Server fetches & extracts messages" },
            { icon: "🧠", title: "Claude summarizes", desc: "Structures problems, attempts & next steps" },
            { icon: "📄", title: "Download .md", desc: "Use it as context in any new chat" },
          ].map((s) => (
            <div className="step-card" key={s.title}>
              <span className="step-icon">{s.icon}</span>
              <strong>{s.title}</strong>
              <span>{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Loading Panel ───────────────────────────────────────────────
function LoadingPanel({ message }) {
  return (
    <div className="panel loading-panel">
      <div className="spinner-wrap">
        <div className="spinner" />
        <div className="spinner-inner" />
      </div>
      <p className="loading-msg">{message}</p>
      <p className="loading-sub">This may take 15–30 seconds</p>
    </div>
  );
}

// ─── Result Panel ────────────────────────────────────────────────
function ResultPanel({ result, viewRaw, setViewRaw, onDownload, onCopy, onReset }) {
  return (
    <div className="panel result-panel">
      <div className="result-header">
        <div className="result-meta">
          <span className="badge green">✓ Done</span>
          <span className="badge neutral">{result.messageCount} messages parsed</span>
        </div>
        <div className="result-actions">
          <button className="action-btn" onClick={() => setViewRaw((v) => !v)}>
            {viewRaw ? "📄 Formatted" : "📝 Raw"}
          </button>
          <button className="action-btn" onClick={onCopy}>
            📋 Copy
          </button>
          <button className="action-btn accent" onClick={onDownload}>
            ⬇ Download context.md
          </button>
          <button className="action-btn ghost" onClick={onReset}>
            ↩ New
          </button>
        </div>
      </div>

      <div className="result-body">
        {viewRaw ? (
          <pre className="raw-view">{result.markdown}</pre>
        ) : (
          <div className="markdown-body formatted-view">
            <ReactMarkdown>{result.markdown}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
