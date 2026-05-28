# Docker Deployment & Development Guide

This guide explains how to build, run, and manage the backend NestJS application using Docker. 

---

## 🚦 Prerequisite
Make sure **Docker Desktop** is open and running on your system. You can verify it by running:
```bash
docker info
```

---

## 🚀 Option 1: Running the Full Stack (Highly Recommended)
Since the server depends on a PostgreSQL database and environment configurations, running it via **Docker Compose** is the most elegant way. It spins up the database, server, and client services together automatically.

> [!NOTE]
> Run these commands from the **project root folder** (`d:\Codes\fullstack\ai-meeting-assistent`).

### Start the Stack (Build and Run)
```bash
docker-compose up -d --build
```
* `-d`: Runs the containers in the background (detached mode).
* `--build`: Forces a rebuild of the Docker images to apply any recent code modifications.

### Stop the Stack
```bash
docker-compose down
```

---

## 📦 Option 2: Running the Server Container Individually
If you want to build and run the NestJS server container independently of the client and database.

> [!IMPORTANT]
> Run these commands from inside the **`/server`** folder.

### 1. Build the Server Image
```bash
docker build -t ai-meeting-assistant:latest .
```
*(Note the `.` at the end, which tells Docker to build using the current directory's context.)*

### 2. Run the Container
Since the application requires keys (OpenAI, Azure, DB credentials) to boot, you must pass your `.env` configuration file to the container:
```bash
docker run -d -p 4000:4000 --env-file .env --name meeting_server ai-meeting-assistant:latest
```

---

## 🛠️ Verification & Debugging Commands

### Check Running Containers
```bash
docker ps
```
Look for `meeting_assistant_server` or `meeting_server` to verify it is running and displays `(healthy)`.

### View Live Logs
To monitor the NestJS server boot sequence and check for any startup errors:
```bash
# For Docker Compose:
docker logs -f meeting_assistant_server

# For Individual Container:
docker logs -f meeting_server
```

### Test the Health Endpoint
Because the application uses a global `/api` prefix, verify that the server is working by hitting the health route:
```bash
curl http://localhost:4000/api/health
```

### Access Container Terminal (Shell)
If you need to inspect files inside the running container:
```bash
docker exec -it meeting_assistant_server sh
```
