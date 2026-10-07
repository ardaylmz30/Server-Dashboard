import { useEffect, useState } from "react";
import type { SyntheticEvent } from "react";
import { addServer, testServer } from "./api/dashboardApi";
import type { ServerInfo } from "./api/dashboardApi";
import "./Servers.css";

interface AddServerModalProps {
  onClose: () => void;
  onAdded: (server: ServerInfo) => void;
}

type TestState =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "ok"; latency: number }
  | { kind: "error"; message: string };

export default function AddServerModal({ onClose, onAdded }: AddServerModalProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [test, setTest] = useState<TestState>({ kind: "idle" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const ready = name.trim() !== "" && url.trim() !== "" && apiKey.trim() !== "";

  const runTest = async () => {
    setTest({ kind: "testing" });
    try {
      const result = await testServer({ name, url, api_key: apiKey });
      setTest({ kind: "ok", latency: result.latency_ms });
    } catch (error) {
      setTest({
        kind: "error",
        message: error instanceof Error ? error.message : "Connection test failed.",
      });
    }
  };

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const server = await addServer({ name, url, api_key: apiKey });
      onAdded(server);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Server could not be added.");
      setSaving(false);
    }
  };

  const invalidate = () => {
    setTest({ kind: "idle" });
    setSaveError(null);
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="server-modal" role="dialog" aria-modal="true" aria-labelledby="add-server-title">
        <div className="modal-header">
          <div>
            <h2 id="add-server-title">Add server</h2>
            <p className="server-modal-hint">
              Start the agent on the other device (<code>docker-compose.agent.yml</code>),
              then enter its address and API key.
            </p>
          </div>
          <button className="close-button" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form className="server-form" onSubmit={submit}>
          <label>
            <span>Name</span>
            <input
              type="text"
              value={name}
              maxLength={40}
              placeholder="Raspberry Pi"
              autoFocus
              onChange={(event) => { setName(event.target.value); invalidate(); }}
            />
          </label>

          <label>
            <span>Address</span>
            <input
              type="url"
              value={url}
              placeholder="http://192.168.1.20:8000"
              onChange={(event) => { setUrl(event.target.value); invalidate(); }}
            />
          </label>

          <label>
            <span>API key</span>
            <input
              type="password"
              value={apiKey}
              autoComplete="off"
              placeholder="DASHBOARD_API_KEY of that device"
              onChange={(event) => { setApiKey(event.target.value); invalidate(); }}
            />
          </label>

          {test.kind === "ok" && (
            <div className="server-feedback ok" role="status">
              Connected · {test.latency} ms
            </div>
          )}
          {test.kind === "error" && (
            <div className="server-feedback error" role="alert">{test.message}</div>
          )}
          {saveError && (
            <div className="server-feedback error" role="alert">{saveError}</div>
          )}

          <div className="server-form-actions">
            <button
              type="button"
              className="server-secondary-button"
              disabled={!ready || test.kind === "testing"}
              onClick={() => void runTest()}
            >
              {test.kind === "testing" ? "Testing…" : "Test connection"}
            </button>
            <button type="submit" className="server-primary-button" disabled={!ready || saving}>
              {saving ? "Adding…" : "Add server"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
