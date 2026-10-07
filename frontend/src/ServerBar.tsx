import type { ServerHealthMap, ServerInfo } from "./api/dashboardApi";
import "./Servers.css";

interface ServerBarProps {
  servers: ServerInfo[];
  health: ServerHealthMap;
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (server: ServerInfo) => void;
}

function formatPercent(value: number | undefined) {
  return typeof value === "number" ? `${Math.round(value)}%` : "—";
}

export default function ServerBar({
  servers,
  health,
  activeId,
  onSelect,
  onAdd,
  onRemove,
}: ServerBarProps) {
  return (
    <nav className="server-bar" aria-label="Servers">
      <div className="server-chips">
        {servers.map((server) => {
          const state = health[server.id];
          const status = !state ? "unknown" : state.online ? "online" : "offline";
          const active = server.id === activeId;

          return (
            <div
              key={server.id}
              className={`server-chip ${active ? "active" : ""}`}
            >
              <button
                type="button"
                className="server-chip-main"
                onClick={() => onSelect(server.id)}
                aria-pressed={active}
                title={state?.online === false ? state.error : server.url || undefined}
              >
                <span className={`server-dot ${status}`} />
                <span className="server-chip-text">
                  <span className="server-chip-name">{server.name}</span>
                  <span className="server-chip-meta">
                    {status === "online"
                      ? `CPU ${formatPercent(state?.cpu)} · RAM ${formatPercent(state?.ram)}`
                      : status === "offline"
                        ? "Offline"
                        : "Checking…"}
                  </span>
                </span>
              </button>

              {active && !server.is_local && (
                <button
                  type="button"
                  className="server-chip-remove"
                  onClick={() => onRemove(server)}
                  aria-label={`Remove ${server.name}`}
                  title="Remove this server"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button type="button" className="server-add-button" onClick={onAdd}>
        <span aria-hidden="true">+</span> Add server
      </button>
    </nav>
  );
}
