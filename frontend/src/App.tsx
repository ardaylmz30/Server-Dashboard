import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchSystemInfo,
  fetchContainers as fetchContainersApi,
  runContainerAction,
  fetchContainerLogs,
} from "./api/dashboardApi";
import { createPortal } from "react-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";

interface SystemInfo {
  cpu: number;
  ram: number;
  ram_total_gb?: number;
  disk: number;
}

interface Container {
  name: string;
  status: string;
  image: string;
}

interface HistoryPoint {
  time: string;
  cpu: number;
  ram: number;
}

interface LogData {
  name: string;
  logs: string;
}

const SYSTEM_POLL_MS = 2000;
const CONTAINER_POLL_MS = 10000;
const MAX_HISTORY = 30;

type ContainerAction = "start" | "stop" | "restart";

function App() {
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [logs, setLogs] = useState<LogData | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const portalMenuRef = useRef<HTMLDivElement | null>(null);
  type ConnectionStatus = "connecting" | "connected" | "disconnected";

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");

  const fetchSystem = useCallback(async () => {
      try {
        const data = await fetchSystemInfo();

        setSystem(data);
        setLastUpdated(new Date());
        setError(null);

        setConnectionStatus("connected");

        setHistory((previous) => [
          ...previous,
          {
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            cpu: data.cpu,
            ram: data.ram,
          },
        ].slice(-MAX_HISTORY));
      } catch {
        setConnectionStatus("disconnected");
        setError("Backend sunucusuna bağlanılamadı.");
      }
    }, []);
  const fetchContainers = useCallback(async () => {
  try {
    const data = await fetchContainersApi();

    setContainers(data);
    setError(null);
  } catch {
    setError("Docker bilgileri alınamadı.");
  }
}, []);

  useEffect(() => {
    void fetchSystem();
    void fetchContainers();

    const systemInterval = window.setInterval(() => void fetchSystem(), SYSTEM_POLL_MS);
    const containerInterval = window.setInterval(() => void fetchContainers(), CONTAINER_POLL_MS);

    return () => {
      window.clearInterval(systemInterval);
      window.clearInterval(containerInterval);
    };
  }, [fetchSystem, fetchContainers]);

 useEffect(() => {
  const handlePointerDown = (event: MouseEvent) => {
    const target = event.target as Node;

    const clickedInsideTrigger =
      menuRef.current?.contains(target) ?? false;

    const clickedInsidePortalMenu =
      portalMenuRef.current?.contains(target) ?? false;

    if (!clickedInsideTrigger && !clickedInsidePortalMenu) {
      setOpenMenu(null);
      setMenuPosition(null);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      setOpenMenu(null);
      setMenuPosition(null);
    }
  };

  document.addEventListener("mousedown", handlePointerDown);
  document.addEventListener("keydown", handleKeyDown);

  return () => {
    document.removeEventListener("mousedown", handlePointerDown);
    document.removeEventListener("keydown", handleKeyDown);
  };
}, []);
  const handleContainerAction = async (
      containerName: string,
      action: ContainerAction,
    ) => {
      setActionLoading(`${containerName}:${action}`);
      setOpenMenu(null);
      setError(null);

      try {
        await runContainerAction(containerName, action);

        await fetchContainers();
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Docker işlemi gerçekleştirilemedi.",
        );
      } finally {
        setActionLoading(null);
      }
    };

  const openLogs = async (containerName: string) => {
      setOpenMenu(null);
      setLogsLoading(true);
      setLogsError(null);
      setLogs({ name: containerName, logs: "" });

      try {
        const data = await fetchContainerLogs(containerName);
        setLogs(data);
      } catch (logError) {
        setLogsError(
          logError instanceof Error
            ? logError.message
            : "Container logları alınamadı.",
        );
      } finally {
        setLogsLoading(false);
      }
    };

  const runningCount = useMemo(
    () => containers.filter((container) => container.status === "running").length,
    [containers],
  );

  const memoryTotalGb = system?.ram_total_gb ?? 0;
  const memoryGb = system
    ? ((system.ram / 100) * memoryTotalGb).toFixed(1)
    : "—";


  return (
    <div className="app-shell">
      <main className="dashboard">
        <header className="page-header">
          <div>
            <div className="eyebrow">OPERATIONS</div>
            <h1>Server Dashboard</h1>
            <p>System monitoring and container management</p>
          </div>

          <div className={`connection-status ${connectionStatus}`}>
              <span className="status-indicator" />

              <span>
                {connectionStatus === "connecting" && "Connecting..."}
                {connectionStatus === "connected" && "Connected"}
                {connectionStatus === "disconnected" && "Disconnected"}
              </span>
            </div>
        </header>

        {error && (
          <div className="alert" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Close error">
              ×
            </button>
          </div>
        )}

        <section className="metrics-grid" aria-label="System metrics">
          <MetricCard label="CPU" value={system ? `${system.cpu.toFixed(1)}%` : "—"} percent={system?.cpu ?? 0} />
          <MetricCard label="Memory" value={system ? `${system.ram.toFixed(1)}%` : "—"} percent={system?.ram ?? 0} detail={system ? `${memoryGb} GB of ${memoryTotalGb.toFixed(1)} GB` : "Waiting for data"} />
          <MetricCard label="Storage" value={system ? `${system.disk.toFixed(1)}%` : "—"} percent={system?.disk ?? 0} />
        </section>

        <section className="panel performance-panel">
          <div className="panel-header">
            <div>
              <h2>Performance</h2>
              <p>CPU and memory utilization over the last 30 samples</p>
            </div>
            <span className="updated-text">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Waiting for data"}
            </span>
          </div>

          <div className="chart-wrap">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={history} margin={{ top: 10, right: 40, left: 5, bottom: 10 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="2 4" vertical={false} />
                  <XAxis
                      dataKey="time"
                      tick={{ fill: "#737a86", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={30}
                      padding={{ left: 8, right: 8 }}
                    />
                  <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "#737a86", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}%`}
                      width={42}
                    />
                  <Tooltip
                    contentStyle={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${Number(value ?? 0).toFixed(1)}%`]}
                  />
                  <Line type="monotone" dataKey="cpu" name="CPU" stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="ram" name="Memory" stroke="#64748b" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">Collecting system data…</div>
            )}
          </div>

          <div className="chart-legend">
            <span><i className="legend-dot cpu" /> CPU</span>
            <span><i className="legend-dot memory" /> Memory</span>
          </div>
        </section>

        <section className="panel containers-panel">
          <div className="panel-header containers-heading">
            <div>
              <h2>Containers</h2>
              <p>Docker workloads on this host</p>
            </div>
            <div className="container-summary">
              <strong>{runningCount}</strong> running <span>·</span> {containers.length} total
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>IMAGE</th>
                  <th>STATUS</th>
                  <th className="actions-column">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {containers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-row">No Docker containers found.</td>
                  </tr>
                ) : (
                  containers.map((container) => (
                    <ContainerRow
                      key={container.name}
                      container={container}
                      actionLoading={actionLoading}
                      openMenu={openMenu}
                      setOpenMenu={setOpenMenu}
                      menuRef={menuRef}
                      menuPosition={menuPosition}
                      setMenuPosition={setMenuPosition}
                      onAction={handleContainerAction}
                      onLogs={openLogs}
                      portalMenuRef={portalMenuRef}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="footer">
          <span>Server Dashboard</span>
          <span>System polling {SYSTEM_POLL_MS / 1000}s · Docker polling {CONTAINER_POLL_MS / 1000}s</span>
        </footer>
      </main>

      {logs && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setLogs(null);
        }}>
          <div className="logs-modal" role="dialog" aria-modal="true" aria-labelledby="logs-title">
            <div className="modal-header">
              <div>
                <div className="eyebrow">CONTAINER LOGS</div>
                <h2 id="logs-title">{logs.name}</h2>
              </div>
              <button className="close-button" type="button" onClick={() => setLogs(null)} aria-label="Close logs">×</button>
            </div>
            {logsLoading ? (
              <div className="logs-state">Loading logs…</div>
            ) : logsError ? (
              <div className="logs-state error-state">{logsError}</div>
            ) : (
              <pre className="logs-output">{logs.logs || "No logs returned."}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  percent: number;
  detail?: string;
}

function MetricCard({ label, value, percent, detail }: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-track" aria-hidden="true">
        <div className="metric-fill" style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }} />
      </div>
      <div className="metric-detail">{detail || (percent < 80 ? "Normal utilization" : "High utilization")}</div>
    </article>
  );
}

interface ContainerRowProps {
  container: Container;
  actionLoading: string | null;
  openMenu: string | null;
  setOpenMenu: (name: string | null) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  portalMenuRef: React.RefObject<HTMLDivElement | null>;
  menuPosition: { top: number; left: number } | null;
  setMenuPosition: (position: { top: number; left: number } | null) => void;
  onAction: (name: string, action: ContainerAction) => void;
  onLogs: (name: string) => void;
}

function ContainerRow({
  container,
  actionLoading,
  openMenu,
  setOpenMenu,
  portalMenuRef,
  menuRef,
  menuPosition,
  setMenuPosition,
  onAction,
  onLogs,
}: ContainerRowProps) {
  const isRunning = container.status === "running";
  const busy = actionLoading?.startsWith(`${container.name}:`) ?? false;

  const toggleMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (busy) return;

    if (openMenu === container.name) {
      setOpenMenu(null);
      setMenuPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 148;
    const menuHeight = isRunning ? 124 : 84;
    const gap = 6;

    let left = rect.right - menuWidth;
    let top = rect.bottom + gap;

    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }
    if (top + menuHeight > window.innerHeight - 8) {
      top = rect.top - menuHeight - gap;
    }

    setMenuPosition({ top, left });
    setOpenMenu(container.name);
  };

  const closeMenu = () => {
    setOpenMenu(null);
    setMenuPosition(null);
  };

  return (
    <tr>
      <td>
        <div className="container-name">
          <span className={`container-marker ${isRunning ? "running" : "stopped"}`} />
          <span>{container.name}</span>
        </div>
      </td>
      <td className="image-cell" title={container.image}>{container.image}</td>
      <td>
        <span className={`status-pill ${isRunning ? "running" : "stopped"}`}>
          <span />
          {isRunning ? "Running" : "Stopped"}
        </span>
      </td>
      <td className="actions-column">
        <div className="action-wrapper" ref={openMenu === container.name ? menuRef : undefined}>
          {busy && <span className="row-spinner" aria-label="Processing" />}
          <button
            className="menu-button"
            type="button"
            onClick={toggleMenu}
            aria-label={`Actions for ${container.name}`}
            aria-expanded={openMenu === container.name}
            disabled={busy}
          >
            <span />
            <span />
            <span />
          </button>

          {openMenu === container.name && menuPosition && !busy && createPortal(
            <div
              ref={portalMenuRef}
              className="action-menu action-menu-portal"
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
              {isRunning ? (
                <button type="button" onClick={() => onAction(container.name, "restart")}>Restart</button>
              ) : (
                <button type="button" onClick={() => onAction(container.name, "start")}>Start</button>
              )}
              {isRunning && (
                <button className="danger-item" type="button" onClick={() => onAction(container.name, "stop")}>Stop</button>
              )}
              <button type="button" onClick={() => { closeMenu(); onLogs(container.name); }}>View logs</button>
            </div>,
            document.body,
          )}
        </div>
      </td>
    </tr>
  );
}

export default App;
