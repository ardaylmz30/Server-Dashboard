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

async function extractErrorDetail(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = await response.json().catch(() => null);
  return body?.detail || fallback;
}

export async function fetchSystemInfo(): Promise<SystemInfo> {
  const response = await fetch(
    `${API_URL}/api/system`,
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

export async function fetchContainers(): Promise<Container[]> {
  const response = await fetch(
    `${API_URL}/api/docker`,
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
): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/docker/${encodeURIComponent(containerName)}/${action}`,
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
): Promise<LogData> {
  const response = await fetch(
    `${API_URL}/api/docker/${encodeURIComponent(containerName)}/logs`,
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

export async function fetchContainerStats(containerName: string): Promise<ContainerStats> {
  const response = await fetch(`${API_URL}/api/docker/${encodeURIComponent(containerName)}/stats`, { headers: authHeaders });
  if (!response.ok) throw new Error(await extractErrorDetail(response, "Container metrics API error"));
  return response.json();
}