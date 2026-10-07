import type { ServerHealthMap, ServerInfo } from "./api/dashboardApi";
import "./Servers.css";

interface ServerSidebarProps {
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

export default function ServerSidebar({
  servers,
  health,
  activeId,
  onSelect,
  onAdd,
  onRemove,
}: ServerSidebarProps) {
  const checked = servers.filter((server) => health[server.id]).length;
  const online = servers.filter((server) => health[server.id]?.online).length;

  return (
    <aside className="server-sidebar" aria-label="Servers">
      <div className="server-sidebar-header">
        <h2>Servers</h2>
        {checked > 0 && (
          <span className="server-sidebar-count">
            {online} of {servers.length} online
          </span>
        )}
      </div>

      <ul className="server-list">
        {servers.map((server) => {
          const state = health[server.id];
          const status = !state ? "unknown" : state.online ? "online" : "offline";
          const active = server.id === activeId;

          return (
            <li key={server.id} className={`server-item ${active ? "active" : ""}`}>
              <button
                type="button"
                className="server-item-main"
                onClick={() => onSelect(server.id)}
                aria-current={active ? "true" : undefined}
                title={state?.online === false ? state.error : server.url || undefined}
              >
                <span className={`server-dot ${status}`} />
                <span className="server-item-text">
                  <span className="server-item-name">{server.name}</span>
                  <span className="server-item-meta">
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
                  className="server-item-remove"
                  onClick={() => onRemove(server)}
                  aria-label={`Remove ${server.name}`}
                  title="Remove this server"
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <button type="button" className="server-add-button" onClick={onAdd}>
        <span aria-hidden="true">+</span> Add server
      </button>
    </aside>
  );
}
