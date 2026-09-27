import docker


def get_docker_client():
    return docker.from_env()


def get_containers():
    client = get_docker_client()

    containers = client.containers.list(all=True)

    return [
        {
            "name": container.name,
            "status": container.status,
            "image": container.attrs.get("Config", {}).get("Image", "unknown"),
        }
        for container in containers
    ]

def start_container(container_name: str):
    client = get_docker_client()

    container = client.containers.get(container_name)
    container.start()

    return {
        "message": f"{container_name} started successfully"
    }


def stop_container(container_name: str):
    client = get_docker_client()

    container = client.containers.get(container_name)
    container.stop()

    return {
        "message": f"{container_name} stopped successfully"
    }


def restart_container(container_name: str):
    client = get_docker_client()

    container = client.containers.get(container_name)
    container.restart()

    return {
        "message": f"{container_name} restarted successfully"
    }


def get_container_logs(container_name: str):
    client = get_docker_client()

    container = client.containers.get(container_name)

    logs = container.logs(tail=100).decode("utf-8", errors="replace")

    return {
        "name": container_name,
        "logs": logs
    }

def get_container_stats(container_name: str):
    client = get_docker_client()
    container = client.containers.get(container_name)

    if container.status != "running":
        return {
            "name": container.name,
            "status": container.status,
            "running": False,
            "cpu_percent": 0,
            "memory_percent": 0,
            "memory_usage_mb": 0,
            "memory_limit_mb": 0,
            "network_rx_mb": 0,
            "network_tx_mb": 0,
            "block_read_mb": 0,
            "block_write_mb": 0,
            "pids": 0,
        }

    stats = container.stats(stream=False)

    cpu_stats = stats.get("cpu_stats", {})
    precpu_stats = stats.get("precpu_stats", {})
    cpu_delta = cpu_stats.get("cpu_usage", {}).get("total_usage", 0) - precpu_stats.get("cpu_usage", {}).get("total_usage", 0)
    system_delta = cpu_stats.get("system_cpu_usage", 0) - precpu_stats.get("system_cpu_usage", 0)
    online_cpus = cpu_stats.get("online_cpus") or len(cpu_stats.get("cpu_usage", {}).get("percpu_usage") or []) or 1
    cpu_percent = (cpu_delta / system_delta * online_cpus * 100.0) if system_delta > 0 else 0.0

    memory_stats = stats.get("memory_stats", {})
    memory_usage = memory_stats.get("usage", 0)
    memory_limit = memory_stats.get("limit", 0)
    memory_percent = (memory_usage / memory_limit * 100.0) if memory_limit else 0.0

    network_rx = 0
    network_tx = 0
    for network in (stats.get("networks") or {}).values():
        network_rx += network.get("rx_bytes", 0)
        network_tx += network.get("tx_bytes", 0)

    block_read = 0
    block_write = 0
    for entry in stats.get("blkio_stats", {}).get("io_service_bytes_recursive") or []:
        op = (entry.get("op") or "").lower()
        value = entry.get("value", 0)
        if op == "read":
            block_read += value
        elif op == "write":
            block_write += value

    return {
        "name": container.name,
        "status": container.status,
        "running": True,
        "cpu_percent": round(cpu_percent, 2),
        "memory_percent": round(memory_percent, 2),
        "memory_usage_mb": round(memory_usage / (1024 ** 2), 1),
        "memory_limit_mb": round(memory_limit / (1024 ** 2), 1),
        "network_rx_mb": round(network_rx / (1024 ** 2), 2),
        "network_tx_mb": round(network_tx / (1024 ** 2), 2),
        "block_read_mb": round(block_read / (1024 ** 2), 2),
        "block_write_mb": round(block_write / (1024 ** 2), 2),
        "pids": stats.get("pids_stats", {}).get("current", 0) or 0,
    }
