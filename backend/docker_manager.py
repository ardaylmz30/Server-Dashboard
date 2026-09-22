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
<<<<<<< HEAD
            "image": container.attrs.get("Config", {}).get("Image", "unknown"),
=======
            "image": container.image.tags[0] if container.image.tags else "unknown",
>>>>>>> 6efa73d05c972ef1197a6d88dccd3c49f2239d5b
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