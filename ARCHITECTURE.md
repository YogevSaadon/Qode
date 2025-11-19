# Qode - Technical Architecture (v2.0 - Production Ready)

## 1. Technology Stack
* **Backend:** Python 3.10+ -> **FastAPI** -> SQLAlchemy (Async) -> **SQLite**.
* **Frontend:** **React** (Vite) -> **Tailwind CSS**.
* **Real-time:** Native **WebSockets**.

## 2. Data Schema (Updated)
### Table: `queues`
* `id` (UUID) - Primary Key.
* `name` (String)
* `host_token` (String) - **Secure Random String** (Not UUID). Secret key for admin actions.
* `active` (Boolean) - Is the queue open?
* `is_paused` (Boolean) - Host can pause the line.
* `current_position` (Integer) - The position number currently being served. Defaults to 0.
* `last_number_issued` (Integer) - Tracks total tickets created. Used for atomic increment.
* `avg_wait_time` (Integer) - Seconds (Moving Average).
* `created_at` (DateTime) - UTC.

### Table: `tickets`
* `id` (UUID) - The content of the QR code.
* `queue_id` (FK) - Indexed.
* `device_token` (String) - User identity. Indexed.
* `position_number` (Integer) - The user's spot in line.
* `status` (Enum) - Values: `WAITING`, `CALLED`, `SERVING`, `COMPLETED`, `NO_SHOW`, `CANCELLED`. Indexed.
* `created_at` (DateTime) - When joined.
* `called_at` (DateTime, nullable) - When host clicked "Next".
* `completed_at` (DateTime, nullable) - When verified.

## 3. Backend Structure (`backend/`)
* `config.py`: Environment variables (CORS, Secrets) & Rate Limiting setup.
* `database.py`: SQLite setup.
* `models.py`: SQLAlchemy tables with **Indexes** on frequently queried fields.
* `schemas.py`: Pydantic models (Request/Response).
* **`crud/` (Package)**:
    * `queues.py`: DB operations for Queues.
    * `tickets.py`: DB operations for Tickets.
* **`services/` (Package)**:
    * `queue_service.py`: Business logic (Token generation, initialization).
    * `ticket_service.py`: Business logic (**Race Condition Handling**, Duplicate checks).
    * `eta_service.py`: Time calculation logic.
* `manager.py`: WebSocket Manager.
* `routes.py`: API Endpoints.
* `main.py`: App entry & CORS.

## 4. Frontend Structure (`frontend/`)
* `src/lib/api.js`: Axios setup.
* `src/hooks/useWebSocket.js`: Real-time logic with **Exponential Backoff** reconnection.
* `src/pages/HostDashboard.jsx`: Manager view.
* `src/pages/GuestView.jsx`: User view.

## 5. Critical Implementation Rules
1.  **Race Conditions:** Use **Database Transactions** (e.g., `with db.begin()`) and Atomic reads when creating a ticket to ensure `position_number` is unique and sequential.
2.  **Security:** * Host Tokens must be generated using `secrets.token_urlsafe(32)`.
    * Validate input strings (names, etc.) to prevent injection.
3.  **ETA Logic:**
    * Calculated in Backend (`eta_service.py`).
    * Formula: `(YourPosition - CurrentPosition) * AvgWaitTime`.
