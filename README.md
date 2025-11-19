# Qode - Skip the Line 🚀
> **The phone is the queue.** No apps, no registration, just scan and wait.

![Qode Concept](./assets/qode-concept.png)
*Physical waiting vs Digital freedom*

## 📖 About The Project
Qode is a modern, decentralized queue management system designed to democratize waiting. It eliminates the need for expensive hardware kiosks or proprietary apps.

### 🎯 Versatile Deployment Scenarios
* **🌲 Pop-up Events & Festivals:** Print the QR code **once**, stick it on a tree or a wall. No electricity or internet required at the entrance.
* **🍽️ Restaurants & Food Trucks:** Set up a tablet in "Kiosk Mode" facing the customer for a permanent digital queue point.
* **🏥 Clinics & Service:** Replace the "take a paper number" machine with a "scan to join" poster.

## 🛠️ Tech Stack
* **Backend:** Python (FastAPI), Async SQLAlchemy, SQLite (Atomic Locking).
* **Frontend:** React (Vite), Tailwind CSS.
* **Real-Time:** Native WebSockets (Push updates).
* **DevOps:** Docker-ready architecture.

## ⚡ How It Works
1.  **Host creates queue:** The manager starts a session on their phone or laptop.
2.  **Display entry QR:** Show the QR code on an iPad/phone, **or print it** for physical posting.
3.  **Guests scan & wait:** Visitors scan the code to grab a digital ticket.
4.  **Real-time Sync:** Guests see their position and ETA update live via WebSockets.
5.  **Verify:** Host scans the guest's ticket QR to verify entry (mobile scanner supported).

## 🚀 Running Locally
1.  `cd backend && pip install -r requirements.txt && uvicorn main:app --reload`
2.  `cd frontend && npm install && npm run dev -- --host`

## 📋 Features
* ✅ **No App Required:** Pure web-based, works on any device
* ✅ **Atomic Operations:** Race-condition-free ticket assignment (tested with 50 concurrent users)
* ✅ **Real-Time Updates:** WebSocket-powered live position and ETA
* ✅ **QR Code Entry:** Printable entry points for offline deployment
* ✅ **Mobile Pairing:** "Kiosk Mode" allows phones to act as mobile scanners
* ✅ **ETA Calculation:** Smart wait time estimation using Exponential Moving Average
* ✅ **No-Show Handling:** Mark absent guests without advancing the queue

## 🏗️ Architecture
See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details.

## 💡 Architecture & Design Decisions

This project was built with specific constraints in mind: **Zero Friction**, **Real-Time Reliability**, and **Future Scalability**.

### 1. Why Web App (PWA) instead of Native App?
* **Decision:** We chose a browser-based solution over dedicated iOS/Android apps.
* **Reasoning:** The barrier to entry for downloading a 50MB app for a 10-minute wait is too high. A QR code that instantly opens a URL reduces friction to near zero, significantly increasing user adoption in transient events like conventions or pop-up stores.

### 2. Why SQLite (with Atomic Locks) instead of PostgreSQL?
* **Decision:** We used SQLite with strict atomic increment logic for sequential ticket numbering.
* **Reasoning:**
    * **Simplicity & Rapid Deployment:** Keeps the deployment self-contained and significantly simplifies setup (no external database service required for MVP development or small-scale events).
    * **Performance:** For a single-instance event queue, SQLite is incredibly fast due to the absence of network latency and its efficient local file-based operations.
    * **Concurrency:** Robust handling of race conditions via database transactions ensures strict sequential ticket numbering without complex locking mechanisms.
    * **Future Scalability:** The use of SQLAlchemy (an ORM) makes the application largely database-agnostic. Migrating to a production-grade database like PostgreSQL would require minimal code changes (primarily updating the connection string), allowing seamless scaling if Qode gains traction.

### 3. Why WebSockets instead of Polling?
* **Decision:** Native FastAPI WebSockets are used to push real-time updates to clients.
* **Reasoning:**
    * **Superior User Experience:** Waiting in line causes anxiety. Seeing the number drop and ETA update in real-time (without manual refreshing) provides crucial psychological reassurance and transparency.
    * **Efficiency & Resource Management:** Polling (clients repeatedly asking the server for updates) would significantly drain user device batteries and overwhelm the server with redundant requests. WebSockets maintain a lightweight, persistent open channel, making the system highly efficient.

### 4. Why No Explicit User Accounts (Host is token-based)?
* **Decision:** Host authentication and guest identity are managed via unique, ephemeral tokens stored locally (localStorage).
* **Reasoning:** Forcing a user (especially a guest) to "Sign Up" or "Log In" creates significant friction. By using secure, randomized tokens, we maintain privacy, simplify the user flow, and enable rapid onboarding, critical for a temporary queuing system.

### 5. Security - SQL Injection Prevention
* **Decision:** All database interactions are managed through SQLAlchemy's powerful ORM (Object-Relational Mapper).
* **Reasoning:** SQLAlchemy automatically sanitizes and parametrizes all SQL queries. This critical abstraction layer ensures that user input cannot be maliciously injected into database commands, making the application inherently resistant to common SQL Injection vulnerabilities.

## 📝 License
MIT License - feel free to use this for your events!

## 🙏 Acknowledgments
Built with Claude Code - demonstrating the power of AI-assisted development.
