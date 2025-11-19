"""
WebSocket Connection Manager
Manages real-time connections for queue updates.
"""
from typing import Dict, List
from fastapi import WebSocket
import json


class ConnectionManager:
    """
    Manages WebSocket connections for real-time queue updates.

    Connections are organized by queue_id, allowing broadcast messages
    to all guests watching a specific queue.
    """

    def __init__(self):
        # Dict[queue_id, List[WebSocket]]
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, queue_id: str, websocket: WebSocket):
        """
        Accept and register a new WebSocket connection for a queue.

        Args:
            queue_id: Queue UUID
            websocket: WebSocket connection instance
        """
        await websocket.accept()

        if queue_id not in self.active_connections:
            self.active_connections[queue_id] = []

        self.active_connections[queue_id].append(websocket)
        print(f"[WS] Client connected to queue {queue_id}. Total: {len(self.active_connections[queue_id])}")

    def disconnect(self, queue_id: str, websocket: WebSocket):
        """
        Remove a WebSocket connection from a queue.

        Args:
            queue_id: Queue UUID
            websocket: WebSocket connection instance
        """
        if queue_id in self.active_connections:
            if websocket in self.active_connections[queue_id]:
                self.active_connections[queue_id].remove(websocket)
                print(f"[WS] Client disconnected from queue {queue_id}. Remaining: {len(self.active_connections[queue_id])}")

            # Clean up empty lists
            if len(self.active_connections[queue_id]) == 0:
                del self.active_connections[queue_id]

    async def broadcast(self, queue_id: str, message: dict):
        """
        Broadcast a message to all connections in a queue.

        Args:
            queue_id: Queue UUID
            message: Dictionary to send as JSON
        """
        if queue_id not in self.active_connections:
            return

        # Convert message to JSON
        message_json = json.dumps(message)

        # Send to all active connections
        disconnected = []
        for connection in self.active_connections[queue_id]:
            try:
                await connection.send_text(message_json)
            except Exception as e:
                print(f"[WS] Error sending to client: {e}")
                disconnected.append(connection)

        # Clean up any disconnected clients
        for connection in disconnected:
            self.disconnect(queue_id, connection)

        print(f"[WS] Broadcast to queue {queue_id}: {message}")


# Global instance
manager = ConnectionManager()
