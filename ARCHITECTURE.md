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
* `completed_count` (Integer) - Number of verified tickets. Used for ETA calculation threshold (must be >= 10).
* `avg_wait_time` (Integer) - Seconds (Exponential Moving Average). Defaults to 0 (displays as "Calculating...").
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
* `src/pages/PrintQR.jsx`: Print-optimized QR code poster page.
* `src/components/QRScanner.jsx`: Camera-based QR code scanner component.
* **Libraries Added:**
    * `qrcode.react`: For rendering Entry & Ticket QRs.
    * `@zxing/library`: For the camera scanning interface.
    * `react-hot-toast`: For UI notifications.
* **New Logic Flows:**
    * **Kiosk Mode:** Auto-login via URL parameters (`?token=...&id=...`) for quick mobile host pairing.
    * **Print Utility:** Dedicated print-optimized page with auto-print trigger for physical QR posters.

## 5. Critical Implementation Rules
1.  **Race Conditions:** Use **Database Transactions** (e.g., `with db.begin()`) and Atomic reads when creating a ticket to ensure `position_number` is unique and sequential.
2.  **Security:** * Host Tokens must be generated using `secrets.token_urlsafe(32)`.
    * Validate input strings (names, etc.) to prevent injection.
3.  **ETA Logic:**
    * Calculated in Backend (`eta_service.py`).
    * Formula: `(YourPosition - CurrentPosition) * AvgWaitTime`.
    * Shows "Calculating..." until 10 people have been verified to ensure meaningful data.
    * Uses Exponential Moving Average (EMA): `new_avg = old_avg * 0.7 + delta * 0.3`.

## 6. Key Workflows (Updated)
* **Queue Creation:** Host creates queue -> Backend generates secure token using `secrets.token_urlsafe(32)` -> Token stored in localStorage for persistent access.
* **Guest Join:** Guest scans QR -> Backend atomically increments `last_number_issued` using raw SQL `UPDATE ... RETURNING` -> Position assigned -> WebSocket connection established for real-time updates.
* **Ticket Verification:** Host scans guest ticket QR -> Backend updates ticket status to COMPLETED -> Calculates time delta -> Updates EMA -> Broadcasts new position/ETA to all connected clients via WebSocket.
* **Pairing (Kiosk Mode):** Host laptop displays pairing QR with embedded credentials -> Host phone scans -> Phone auto-logs in via URL parameters (`?token=...&id=...`) -> Credentials saved to localStorage -> URL cleaned for security -> Phone becomes mobile scanner.
* **No-Show Handling:** Host marks waiting ticket as skipped -> Status updates to `NO_SHOW` -> Ticket removed from active queue calculations -> ETA recalculates for everyone behind -> WebSocket broadcast sent.
* **Print Utility:** Host clicks "Print QR Code" -> New window opens with print-optimized page -> Auto-print dialog triggers after 500ms -> Page displays large QR (400x400px) with instructions optimized for A4 portrait.
