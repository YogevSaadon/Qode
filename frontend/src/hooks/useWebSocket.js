/**
 * useWebSocket Hook
 * Manages WebSocket connection with exponential backoff reconnection.
 */
import { useState, useEffect, useRef } from 'react';

const useWebSocket = (queueId) => {
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  const MAX_RECONNECT_DELAY = 30000; // 30 seconds max
  const INITIAL_DELAY = 1000; // 1 second

  const connect = () => {
    if (!queueId) return;

    // Determine WebSocket URL based on environment
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_WS_URL || '192.168.1.11:8000';
    const wsUrl = `${protocol}//${host}/api/ws/${queueId}`;

    console.log(`[WS] Connecting to ${wsUrl}...`);
    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected successfully');
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0; // Reset counter on successful connection
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WS] Message received:', data);
          setLastMessage(data);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        setConnectionStatus('error');
      };

      ws.onclose = () => {
        console.log('[WS] Connection closed');
        setConnectionStatus('disconnected');
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        scheduleReconnect();
      };

    } catch (error) {
      console.error('[WS] Failed to create WebSocket:', error);
      setConnectionStatus('error');
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    // Calculate exponential backoff delay
    const delay = Math.min(
      INITIAL_DELAY * Math.pow(2, reconnectAttemptsRef.current),
      MAX_RECONNECT_DELAY
    );

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})...`);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current += 1;
      connect();
    }, delay);
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionStatus('disconnected');
  };

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [queueId]);

  return {
    lastMessage,
    connectionStatus,
    reconnect: connect
  };
};

export default useWebSocket;
