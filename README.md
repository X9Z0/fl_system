# Federated Learning System

Follow these steps to get the Federated Learning system up and running on your local machine.

### Prerequisites

Before starting, ensure you have **Docker** and **Docker Compose** installed:

- [Install Docker](https://docs.docker.com/get-docker/)
- [Install Docker Compose](https://docs.docker.com/compose/install/)

---

### Setup Instructions

#### 1. Build the Client Image

First, build the Docker image for the client node. This ensures all Python dependencies and configurations are baked into the image.

```bash
docker build -t fl_client_image -f client_node/Dockerfile client_node/

```

#### 2. Launch the System

Use Docker Compose to start the server, clients, and any associated services in detached mode.

```bash
docker compose up -d

```

---

### Monitoring & Logs

To monitor the activity of your nodes in real-time, use the following commands:

- **View Client Logs:**

```bash
docker logs fl_client_1 -f

```

- **View Server Logs:**

```bash
docker logs fl_server -f

```

---

### Accessing the Interface

Once the containers are running, you can access the dashboard/frontend via your browser:

🔗 **URL:** [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000)

---
