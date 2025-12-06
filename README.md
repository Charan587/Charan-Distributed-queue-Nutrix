# Distributed Job Processing System

This project implements a prototype-scale distributed task queue and job processing system. It leverages **Python (FastAPI)** for the backend API, **SQLite** for data persistence, and **React** for the user interface.

## 📖 System Overview

### 1. Core Concept
In many modern applications, certain operations can be time-consuming (e.g., generating large reports, resizing media files, sending mass emails). Executing these tasks synchronously can lead to unresponsive user interfaces and poor user experience.

**Our Solution:** A **Task Queue System**.
Instead of immediate processing, the system accepts a request (referred to as a "Job"), queues it for later execution, and provides an immediate response to the user. Dedicated background processes, known as "Workers," retrieve and process these jobs, ensuring the application remains responsive.

### 2. Architectural Components
The system is composed of three interconnected primary components:

#### A. Frontend (React Dashboard)
*   **Role:** User Interaction Layer.
*   **Functionality:**
    *   Enables users to submit new jobs (e.g., "Email Report").
    *   Displays the current status of jobs in the queue (Pending, Processing, Completed, Failed).
    *   Periodically polls the backend API (every 2 seconds) to reflect real-time job updates.

#### B. Backend API (Python / FastAPI)
*   **Role:** Central Command and Data Management.
*   **Functionality:**
    *   Receives and validates job submission requests.
    *   Implements critical business logic such as Rate Limiting (e.g., restricting job submissions to 10 per minute per tenant).
    *   Ensures data integrity and prevents duplicate job creation through Idempotency mechanisms.
    *   Persists job details into the database.
    *   Provides API endpoints for the Frontend to retrieve job lists and statistics.

#### C. Worker (Python Script)
*   **Role:** Asynchronous Job Execution Engine.
*   **Functionality:**
    *   Operates continuously in the background.
    *   **Polls** the database for jobs with a `PENDING` status.
    *   **Leases** a job: Atomically locks a job to prevent multiple workers from processing the same task.
    *   **Processes** the job: Simulates work using a delay to represent actual task execution.
    *   **Error Handling and Retries**: If a job fails, it is automatically retried up to 3 times. Should it consistently fail, the job is moved to a "Dead Letter Queue" (DLQ) for further investigation or manual intervention.

### 3. Job Workflow
1.  **Submission**: A user submits a new job via the Frontend. The API receives it, validates, and stores it in the database with a `PENDING` status.
2.  **Acquisition**: An available Worker discovers a `PENDING` job, marks it as `PROCESSING` (leasing it), and begins execution.
3.  **Execution**: The Worker performs the designated task (simulated by a delay).
4.  **Completion/Failure**: Upon successful completion, the Worker updates the job status to `COMPLETED`. If an error occurs, the job status is set to `FAILED` and potentially retried. If retries are exhausted, it moves to `DEAD_LETTER`.
5.  **Monitoring**: The Frontend continuously fetches updates, visually representing the job's journey through its various states.

### 4. Codebase Structure

#### Backend (`/server` directory)
*   **`main.py`**: The primary **FastAPI application**. Defines API routes for job submission (`POST /jobs`), retrieval (`GET /jobs`), and includes rate limiting logic.
*   **`worker.py`**: The **background job processor**. Contains the continuous loop responsible for polling, leasing, and executing jobs.
*   **`models.py`**: **Data model definitions**. Utilizes SQLModel/Pydantic to define the structure of a "Job" entity (e.g., ID, status, payload, tenant_id).
*   **`database.py`**: **Database interaction layer**. Manages the connection to the SQLite database file (`jobs.db`).
*   **`requirements.txt`**: Lists all necessary Python dependencies (FastAPI, SQLModel, Uvicorn, etc.).

#### Frontend (`/client` directory)
*   **`src/main.tsx`**: The **application entry point**. Initializes and mounts the React application.
*   **`src/App.jsx`**: The **main application container**. Manages overall layout, orchestrates data fetching from the backend API, and distributes data to child components.
*   **`src/components/JobForm.jsx`**: **Job submission interface**. A React component allowing users to define and submit new jobs.
*   **`src/components/JobDashboard.jsx`**: **Job listing display**. A table-based component showcasing the status of all jobs in the queue.
*   **`src/components/Stats.jsx`**: **Real-time metrics display**. Presents aggregate statistics for jobs (e.g., counts of pending, completed, failed jobs).

---

## 🚀 Getting Started (Windows)

To run the complete system, you will need to open **3 separate command prompt or PowerShell windows**.

### Prerequisites
*   **Python 3.8+** installed.
*   **Node.js** installed.
*   **Git** installed.

### Terminal 1: Backend API Server
This terminal will host the FastAPI web server, which handles incoming job requests.

1.  Navigate to the server directory:
    ```powershell
    cd server
    ```
2.  Create a virtual environment (if not already done) and activate it:
    ```powershell
    python -m venv .venv
    .venv\Scripts\activate
    ```
3.  Install the required Python packages:
    ```powershell
    pip install -r requirements.txt
    ```
4.  Start the FastAPI server:
    ```powershell
    uvicorn main:app --reload --port 8000
    ```
    *Confirmation: You should see output indicating `Uvicorn running on http://127.0.0.1:8000`*

### Terminal 2: Job Worker
This terminal will run the background process responsible for executing the jobs.

1.  Navigate to the server directory:
    ```powershell
    cd server
    ```
2.  Activate the virtual environment:
    ```powershell
    .venv\Scripts\activate
    ```
3.  Start the worker script:
    ```powershell
    python worker.py
    ```
    *Confirmation: You should see messages like `[UUID] Worker started. Polling for jobs...`*

    > **Tip:** You can launch multiple instances of the worker in separate terminals to simulate a distributed worker pool and observe parallel processing.

### Terminal 3: Frontend Development Server
This terminal will serve the React user interface.

1.  Navigate to the client directory:
    ```powershell
    cd client
    ```
2.  Install frontend dependencies (run once):
    ```powershell
    npm install
    ```
3.  Start the React development server:
    ```powershell
    npm run dev
    ```
4.  Access the application in your web browser at: **http://localhost:3000**

---

## 📈 Scalability and Deployment

This system is inherently designed for **horizontal scalability**. Since the worker processes are stateless and only interact with the database, you can effortlessly scale processing capacity by running more worker instances.

### Implementing Multiple Workers
To increase job processing throughput, simply initiate additional worker script instances.
*   **Local Simulation**: Open several terminal windows and execute `python worker.py` in each.
*   **Observed Outcome**: The dashboard will display multiple distinct Worker IDs, and jobs will be processed concurrently at an accelerated rate.

### Production Deployment Strategies (Docker / Kubernetes)
In a production environment, worker processes would typically be deployed as containers.

1.  **Containerization**: Create a `Dockerfile` that packages the Python dependencies and defines the command to run `python worker.py`.
2.  **Orchestration**: Utilize container orchestration platforms:
    *   **Kubernetes**: Define a `Deployment` for the worker, specifying a desired number of `replicas` (e.g., `replicas: 5`). Kubernetes will manage the creation and lifecycle of these independent worker pods.
    *   **Docker Compose**: Configure `deploy: replicas: 5` within your `docker-compose.yml` file for multi-instance deployment.
3.  **Dynamic Scaling**: Implement a Horizontal Pod Autoscaler (HPA) in Kubernetes or similar auto-scaling features to automatically adjust the number of worker pods based on metrics like CPU utilization or the current length of the job queue.
