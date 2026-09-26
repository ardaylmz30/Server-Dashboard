import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchSystemInfo,
  fetchContainers as fetchContainersApi,
  runContainerAction,
  fetchContainerLogs,
<<<<<<< HEAD
=======
  fetchContainerStats,
>>>>>>> a8a63ec (Dcoker metrik sayfası eklendi)
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

<<<<<<< HEAD
=======
interface ContainerStats {
  name: string; status: string; running: boolean; cpu_percent: number; memory_percent: number;
  memory_usage_mb: number; memory_limit_mb: number; network_rx_mb: number; network_tx_mb: number;
  block_read_mb: number; block_write_mb: number; pids: number;
}

interface ContainerHistoryPoint {
  time: string;
  cpu: number;
  memory: number;
}

>>>>>>> a8a63ec (Dcoker metrik sayfası eklendi)
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
<<<<<<< HEAD
=======
  const [selectedContainer, setSelectedContainer] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get("container"),
  );
>>>>>>> a8a63ec (Dcoker metrik sayfası eklendi)
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
<<<<<<< HEAD
        setError("Backend sunucusuna bağlanılamadı.");
=======
        setError("Could not connect to the backend server.");
>>>>>>> a8a63ec (Dcoker metrik sayfası eklendi)
      }
    }, []);
  const fetchContainers = useCallback(async () => {
  try {
    const data = await fetchContainersApi();

    setContainers(data);
    setError(null);
  } catch {
<<<<<<< HEAD
    setError("Docker bilgileri alınamadı.");
=======
    setError("Docker information could not be retrieved.");
>>>>>>> a8a63ec (Dcoker metrik sayfası eklendi)
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
<<<<<<< HEAD
            : "Docker işlemi gerçekleştirilemedi.",
=======
            : "The Docker operation could not be performed.",
>>>>>>> a8a63ec (Dcoker metrik sayfası eklendi)
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
<<<<<<< HEAD
            : "Container logları alınamadı.",
=======
            : "Container logs could not be retrieved.",
>>>>>>> a8a63ec (Dcoker metrik sayfası eklendi)
        );
      } finally {
        setLogsLoading(false);
      }
    };

<<<<<<< HEAD
=======
  const openContainerDetails = useCallback((name: string) => {
    window.history.pushState({ container: name }, "", `?container=${encodeURIComponent(name)}`);
    setSelectedContainer(name);
  }, []);

  const closeContainerDetails = useCallback(() => {
    // Tarayıcının geri tuşuyla aynı davranışı üretir; state güncellemesi
    // aşağıdaki popstate dinleyicisi tarafından yapılır.
    window.history.back();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setSelectedContainer(new URLSearchParams(window.location.search).get("container"));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

>>>>>>> a8a63ec (Dcoker metrik sayfası eklendi)
  const runningCount = useMemo(
    () => containers.filter((container) => container.status === "running").length,
    [containers],
  );

  const memoryTotalGb = system?.ram_total_gb ?? 0;
  const memoryGb = system
    ? ((system.ram / 100) * memoryTotalGb).toFixed(1)
    : "—";


<<<<<<< HEAD
=======
  if (selectedContainer) {
    return (
      <ContainerDetails
        containerName={selectedContainer}
        onBack={closeContainerDetails}
        onAction={handleContainerAction}
        actionLoading={actionLoading}
      />
    );
  }

>>>>>>> a8a63ec (Dcoker metrik sayfası eklendi)
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
<<<<<<< HEAD
=======
                  <th className="metrics-column">METRICS</th>
>>>>>>> a8a63ec (Dcoker metrik sayfası eklendi)
                  <th className="actions-column">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {containers.length === 0 ? (
                  <tr>
<<<<<<< HEAD
                    <td colSpan={4} className="empty-row">No Docker containers found.</td>
=======
                    <td colSpan={5} className="empty-row">No Docker containers found.</td>
>>>>>>> a8a63ec (Dcoker metrik sayfası eklendi)
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
<<<<<<< HEAD
=======
                      onOpenDetails={openContainerDetails}
>>>>>>> a8a63ec (Dcoker metrik sayfası eklendi)
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

<<<<<<< HEAD
=======
interface ContainerDetailsProps {
  containerName: string;
  onBack: () => void;
  onAction: (name: string, action: ContainerAction) => void;
  actionLoading: string | null;
}

function ContainerDetails({ containerName, onBack, onAction, actionLoading }: ContainerDetailsProps) {
  const [stats, setStats] = useState<ContainerStats | null>(null);
  const [history, setHistory] = useState<ContainerHistoryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsText, setLogsText] = useState("");
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const MAX_CONTAINER_HISTORY = 30;
  const busy = actionLoading?.startsWith(`${containerName}:`) ?? false;

  const toggleLogs = async () => {
    if (logsOpen) {
      setLogsOpen(false);
      return;
    }

    setLogsOpen(true);
    setLogsLoading(true);
    setLogsError(null);

    try {
      const data = await fetchContainerLogs(containerName);
      setLogsText(data.logs);
    } catch (logError) {
      setLogsError(
        logError instanceof Error
          ? logError.message
          : "Container logs could not be retrieved.",
      );
    } finally {
      setLogsLoading(false);
    }
  };

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchContainerStats(containerName);
      setStats(data);
      setError(null);
      setLoading(false);
      setHistory((previous) => [
        ...previous,
        {
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          cpu: data.cpu_percent,
          memory: data.memory_percent,
        },
      ].slice(-MAX_CONTAINER_HISTORY));
    } catch (statsError) {
      setLoading(false);
      setError(statsError instanceof Error ? statsError.message : "Container metrics could not be retrieved.");
    }
  }, [containerName]);

  useEffect(() => {
    void loadStats();
    const interval = window.setInterval(() => void loadStats(), 2000);
    return () => window.clearInterval(interval);
  }, [loadStats]);

  const memoryUsage = stats?.memory_usage_mb ?? 0;
  const memoryLimit = stats?.memory_limit_mb ?? 0;

  return (
    <div className="app-shell">
      <main className="dashboard container-details-page">
        <header className="page-header">
          <div>
            <button type="button" className="back-button" onClick={onBack}>← Back to containers</button>
            <div className="eyebrow">CONTAINER METRICS</div>
            <h1>{containerName}</h1>
            <p>Live resource usage for this Docker container</p>
          </div>
          <div className="container-header-right">
            <div className={`container-live-status ${stats?.running ? "running" : "stopped"}`}>
              <span /> {stats?.running ? "Running" : "Stopped"}
            </div>
            <div className="container-detail-actions">
              {busy && <span className="row-spinner" aria-label="Processing" />}
              {stats?.running ? (
                <button type="button" className="detail-action-button" disabled={busy} onClick={() => onAction(containerName, "restart")}>Restart</button>
              ) : (
                <button type="button" className="detail-action-button" disabled={busy} onClick={() => onAction(containerName, "start")}>Start</button>
              )}
              {stats?.running && (
                <button type="button" className="detail-action-button danger" disabled={busy} onClick={() => onAction(containerName, "stop")}>Stop</button>
              )}
            </div>
          </div>
        </header>

        {error && <div className="alert" role="alert">{error}</div>}

        {!stats && loading ? (
          <section className="panel container-loading">Collecting container metrics…</section>
        ) : (
          <>
            <section className="metrics-grid container-metrics-grid">
              <MetricCard label="CPU" value={`${(stats?.cpu_percent ?? 0).toFixed(1)}%`} percent={stats?.cpu_percent ?? 0} detail="Current container CPU usage" />
              <MetricCard label="Memory" value={`${(stats?.memory_percent ?? 0).toFixed(1)}%`} percent={stats?.memory_percent ?? 0} detail={`${memoryUsage.toFixed(1)} MB of ${memoryLimit.toFixed(1)} MB`} />
              <MetricCard label="Processes" value={`${stats?.pids ?? 0}`} percent={0} detail="Active processes in container" />
            </section>

            <section className="panel performance-panel">
              <div className="panel-header">
                <div><h2>Resource usage</h2><p>CPU and memory utilization over the last 30 samples</p></div>
                <span className="updated-text">Updates every 2s</span>
              </div>
              <div className="chart-wrap">
                {history.length > 0 ? (
                  <ResponsiveContainer width="100%" height={340}>
                    <LineChart data={history} margin={{ top: 10, right: 40, left: 5, bottom: 10 }}>
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="2 4" vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: "#737a86", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={30} />
                      <YAxis domain={[0, "auto"]} tick={{ fill: "#737a86", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} width={42} />
                      <Tooltip formatter={(value) => [`${Number(value ?? 0).toFixed(1)}%`]} />
                      <Line type="monotone" dataKey="cpu" name="CPU" stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="memory" name="Memory" stroke="#64748b" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className="chart-empty">Collecting container data…</div>}
              </div>
              <div className="chart-legend"><span><i className="legend-dot cpu" /> CPU</span><span><i className="legend-dot memory" /> Memory</span></div>
            </section>

            <section className="container-io-grid">
              <DetailCard label="Network received" value={`${(stats?.network_rx_mb ?? 0).toFixed(2)} MB`} />
              <DetailCard label="Network sent" value={`${(stats?.network_tx_mb ?? 0).toFixed(2)} MB`} />
              <DetailCard label="Block read" value={`${(stats?.block_read_mb ?? 0).toFixed(2)} MB`} />
              <DetailCard label="Block write" value={`${(stats?.block_write_mb ?? 0).toFixed(2)} MB`} />
            </section>

            <section className="panel logs-panel">
              <button
                type="button"
                className="logs-toggle-button"
                onClick={() => void toggleLogs()}
                aria-expanded={logsOpen}
              >
                {logsOpen ? "▲ Hide Docker logs" : "▼ Show Docker logs"}
              </button>
              {logsOpen && (
                <div className="logs-panel-body">
                  {logsLoading ? (
                    <div className="logs-state">Loading logs…</div>
                  ) : logsError ? (
                    <div className="logs-state error-state">{logsError}</div>
                  ) : (
                    <pre className="logs-output">{logsText || "No logs returned."}</pre>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return <article className="detail-card"><div className="metric-label">{label}</div><strong>{value}</strong></article>;
}

>>>>>>> a8a63ec (Dcoker metrik sayfası eklendi)
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
<<<<<<< HEAD
=======
  onOpenDetails: (name: string) => void;
>>>>>>> a8a63ec (Dcoker metrik sayfası eklendi)
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
<<<<<<< HEAD
=======
  onOpenDetails,
>>>>>>> a8a63ec (Dcoker metrik sayfası eklendi)
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
<<<<<<< HEAD
        <div className="container-name">
          <span className={`container-marker ${isRunning ? "running" : "stopped"}`} />
          <span>{container.name}</span>
        </div>
=======
        <span className="container-name">
          <span className={`container-marker ${isRunning ? "running" : "stopped"}`} />
          <span>{container.name}</span>
        </span>
>>>>>>> a8a63ec (Dcoker metrik sayfası eklendi)
      </td>
      <td className="image-cell" title={container.image}>{container.image}</td>
      <td>
        <span className={`status-pill ${isRunning ? "running" : "stopped"}`}>
          <span />
          {isRunning ? "Running" : "Stopped"}
        </span>
      </td>
<<<<<<< HEAD
=======
      <td className="metrics-column">
        <a
          href={`?container=${encodeURIComponent(container.name)}`}
          className="metrics-link-button"
          title={`Open ${container.name} metrics`}
          onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
            // Sadece normal sol tık'ta SPA içi geçiş yapılır; orta tık,
            // Ctrl/Cmd+tık veya Shift+tık tarayıcının kendi "yeni sekmede/
            // pencerede aç" davranışına bırakılır (preventDefault çağrılmaz).
            if (
              event.button === 0 &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              event.preventDefault();
              onOpenDetails(container.name);
            }
          }}
        >
          See metrics
        </a>
      </td>
>>>>>>> a8a63ec (Dcoker metrik sayfası eklendi)
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

<<<<<<< HEAD
export default App;
=======
export default App;
>>>>>>> a8a63ec (Dcoker metrik sayfası eklendi)
