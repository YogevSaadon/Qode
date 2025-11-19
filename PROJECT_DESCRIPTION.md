Qode: Project Overview (MVP)
What is Qode?
Qode is a lightweight, web-based implementation of the "Virtual Queue" concept. It is a Proof of Concept (PoC) demonstrating how queue management can be handled entirely via mobile web browsers without app downloads.

How it Works (The Workflow)
The application serves two roles: Host (Manager) and Guest (Visitor).

1. The Host (Queue Creator)
Setup: The Host opens Qode and clicks "Create Queue."

The "Entry" QR: The system generates a unique QR code.

Management: The Host sees a dashboard of waiting users, handles the queue via "Call Next" and "Mark Done".

The "Gatekeeper": The Host scans the Guest's ticket to verify entry.

2. The Guest (Visitor)
Join: Guest scans the Entry QR.

Wait: Redirected to a status page showing position and ETA.

Notification: Screen changes visually when status becomes "CALLED".

Enter: Host scans the ticket (or Guest shows screen).

Design Philosophy
Web App vs. Native App
Friction: Downloading an app for a hotdog is too much friction.

Solution: A Universal Web App.

No Login / No Signup
Privacy: No emails or passwords.

Identity: Users identified via anonymous device tokens in localStorage.
