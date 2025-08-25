"""
suppress the docstring
"""

import docker
from docker.errors import NotFound

client = docker.from_env()

SERVER_HOST = "fl_server"
CLIENT_IMAGE = "fl_client_image"


def spawn_client(client_id: int):
    """
    function docstring
    """
    container_name = f"fl_client_{client_id}"
    print(f"Spawning client: {container_name}")

    container = client.containers.run(
        CLIENT_IMAGE,
        name=container_name,
        environment={"SERVER_HOST": SERVER_HOST, "CLIENT_ID": str(client_id)},
        detach=True,
        network="fl_network",
    )
    return container


def remove_client(client_id: int):
    """
    function docstring
    """

    container_name = f"fl_client_{client_id}"
    print(f"Removing client: {container_name}")

    try:
        container = client.containers.get(container_name)
        container.stop()
        container.remove()
    except NotFound:
        print(f"Client {container_name} not found")


def list_clients():
    """
    function docstring
    """

    all_containers = client.containers.list(filters={"name": "fl_client"})
    for c in all_containers:
        print(f"{c.name} - {c.status}")


if __name__ == "__main__":
    spawn_client(1)
    spawn_client(2)
    spawn_client(3)
    list_clients()
