export interface SystemInfo {
  cpu: number;
  ram: number;
  ram_total_gb?: number;
  disk: number;
}

export interface Container {
  name: string;
  status: string;
  image: string;
}

export interface LogData {
  name: string;
  logs: string;
}

export type ContainerAction = "start" | "stop" | "restart";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

const authHeaders: HeadersInit | undefined = API_KEY
  ? { "X-API-Key": API_KEY }
  : undefined;

export const LOCAL_SERVER_ID = "local";

// Yerel sunucu eski /api/... uçlarını, uzak sunucular /api/servers/<id>/...
// vekil uçlarını kullanır.
function apiBase(serverId: string): string {
  return serverId === LOCAL_SERVER_ID
    ? `${API_URL}/api`
    : `${API_URL}/api/servers/${encodeURIComponent(serverId)}`;
}

async function extractErrorDetail(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = await response.json().catch(() => null);
  return body?.detail || fallback;
}

export async function fetchSystemInfo(
  serverId: string = LOCAL_SERVER_ID,
): Promise<SystemInfo> {
  const response = await fetch(
    `${apiBase(serverId)}/system`,
    {
      headers: authHeaders,
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorDetail(response, "System API error"),
    );
  }

  return response.json();
}

export async function fetchContainers(
  serverId: string = LOCAL_SERVER_ID,
): Promise<Container[]> {
  const response = await fetch(
    `${apiBase(serverId)}/docker`,
    {
      headers: authHeaders,
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorDetail(response, "Docker API error"),
    );
  }

  return response.json();
}

export async function runContainerAction(
  containerName: string,
  action: ContainerAction,
  serverId: string = LOCAL_SERVER_ID,
): Promise<void> {
  const response = await fetch(
    `${apiBase(serverId)}/docker/${encodeURIComponent(containerName)}/${action}`,
    {
      method: "POST",
      headers: authHeaders,
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorDetail(
        response,
        "Container işlemi başarısız.",
      ),
    );
  }
}

export async function fetchContainerLogs(
  containerName: string,
  serverId: string = LOCAL_SERVER_ID,
): Promise<LogData> {
  const response = await fetch(
    `${apiBase(serverId)}/docker/${encodeURIComponent(containerName)}/logs`,
    {
      headers: authHeaders,
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorDetail(
        response,
        "Container logları alınamadı.",
      ),
    );
  }

  return response.json();
}

export interface ContainerStats {
  name: string; status: string; running: boolean; cpu_percent: number; memory_percent: number;
  memory_usage_mb: number; memory_limit_mb: number; network_rx_mb: number; network_tx_mb: number;
  block_read_mb: number; block_write_mb: number; pids: number;
}

export async function fetchContainerStats(
  containerName: string,
  serverId: string = LOCAL_SERVER_ID,
): Promise<ContainerStats> {
  const response = await fetch(`${apiBase(serverId)}/docker/${encodeURIComponent(containerName)}/stats`, { headers: authHeaders });
  if (!response.ok) throw new Error(await extractErrorDetail(response, "Container metrics API error"));
  return response.json();
}

export interface ServerInfo {
  id: string;
  name: string;
  url: string;
  is_local: boolean;
}

export interface ServerHealth {
  online: boolean;
  cpu?: number;
  ram?: number;
  disk?: number;
  latency_ms?: number;
  error?: string;
}

export type ServerHealthMap = Record<string, ServerHealth>;

export interface NewServer {
  name: string;
  url: string;
  api_key: string;
}

const jsonHeaders: HeadersInit = {
  ...(authHeaders ?? {}),
  "Content-Type": "application/json",
};

export async function fetchServers(): Promise<ServerInfo[]> {
  const response = await fetch(`${API_URL}/api/servers`, { headers: authHeaders });
  if (!response.ok) throw new Error(await extractErrorDetail(response, "Servers could not be loaded."));
  return response.json();
}

export async function fetchServersHealth(): Promise<ServerHealthMap> {
  const response = await fetch(`${API_URL}/api/servers/health`, { headers: authHeaders });
  if (!response.ok) throw new Error(await extractErrorDetail(response, "Server status could not be loaded."));
  return response.json();
}

export async function testServer(server: NewServer): Promise<{ latency_ms: number }> {
  const response = await fetch(`${API_URL}/api/servers/test`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(server),
  });
  if (!response.ok) throw new Error(await extractErrorDetail(response, "Connection test failed."));
  return response.json();
}

export async function addServer(server: NewServer): Promise<ServerInfo> {
  const response = await fetch(`${API_URL}/api/servers`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(server),
  });
  if (!response.ok) throw new Error(await extractErrorDetail(response, "Server could not be added."));
  return response.json();
}

export async function removeServer(serverId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/servers/${encodeURIComponent(serverId)}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  if (!response.ok) throw new Error(await extractErrorDetail(response, "Server could not be removed."));
}
