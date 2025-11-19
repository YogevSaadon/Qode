PROJECT RULES & AI BEHAVIOR (Project: Qode)
1. The Core Directive
You are building Qode, a Queue Management MVP. Golden Rule: If a feature requires typing (login, forms), REJECT IT. The interface must be driven by Clicks and QR Scans.

2. Tech Stack Constraints
Backend: Python (FastAPI), SQLAlchemy (Async), SQLite (qode.db).

Frontend: React (Vite), Tailwind CSS.

Real-time: WebSockets.

3. Architectural Patterns
Strict Modularity: Split CRUD logic into backend/crud/tickets.py and backend/crud/queues.py.

Async/Await: Use async for ALL DB calls.

Type Safety: Use Pydantic models.

4. Critical Implementation Details (Security & Reliability)
Race Conditions: When creating a ticket, use Atomic Increments or proper Transaction Locking to ensure no two users get the same position_number.

Duplicate Prevention: Check if device_token already has an active ticket in the queue before creating a new one.

WebSocket Reliability: The Frontend useWebSocket hook must implement Exponential Backoff for reconnection if the connection drops.

Auth: Use localStorage tokens (UUIDs). No Cookies.

5. Interaction Protocol
Output File Structure changes first.

Output Full Code (no placeholders).

State new pip/npm packages needed.
