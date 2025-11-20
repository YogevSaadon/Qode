/**
 * Guest View - Join Queue and Track Position
 * Mobile-first interface for guests joining a queue.
 */
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../lib/api';
import useWebSocket from '../hooks/useWebSocket';

// UUID generator that works on HTTP (non-secure contexts)
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for non-HTTPS contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const GuestView = () => {
  const { queueId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real-time updates via WebSocket
  const { lastMessage, connectionStatus } = useWebSocket(queueId);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [avgWaitTime, setAvgWaitTime] = useState(0);

  // Prevent double-join in React StrictMode (dev only)
  const hasJoined = useRef(false);

  // Get or create device token
  const getDeviceToken = () => {
    let token = localStorage.getItem('qode_guest_token');

    if (!token) {
      // Generate new UUID for this device
      token = generateUUID();
      localStorage.setItem('qode_guest_token', token);
    }

    return token;
  };

  // Join the queue
  const joinQueue = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const deviceToken = getDeviceToken();

      const response = await api.post(
        `/api/queues/${queueId}/join`,
        {},
        {
          headers: {
            'x-device-token': deviceToken,
          },
        }
      );

      setTicket(response.data);
    } catch (err) {
      console.error('Failed to join queue:', err);

      if (err.response?.status === 400) {
        setError(err.response.data.detail || 'Queue is not available');
      } else if (err.response?.status === 404) {
        setError('Queue not found');
      } else {
        setError('Failed to join queue. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-join on mount (with StrictMode guard)
  useEffect(() => {
    if (queueId && !hasJoined.current) {
      hasJoined.current = true;
      joinQueue();
    } else if (!queueId) {
      setError('Invalid queue link');
      setIsLoading(false);
    }
  }, [queueId]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'queue_update') {
      setCurrentPosition(lastMessage.current_position || 0);
      setAvgWaitTime(lastMessage.avg_wait_time || 0);
    }
  }, [lastMessage]);

  // Calculate ETA string
  const calculateETA = () => {
    if (!ticket) return '';

    // If user's turn or past
    if (ticket.position_number <= currentPosition) {
      return "Your turn!";
    }

    // Cold start
    if (avgWaitTime === 0) {
      return "Calculating...";
    }

    // Calculate people ahead
    const peopleAhead = ticket.position_number - currentPosition;

    // Calculate total wait in seconds
    const totalSeconds = peopleAhead * avgWaitTime;

    // Convert to minutes (round up)
    const minutes = Math.ceil(totalSeconds / 60);

    if (minutes < 1) return "Less than 1 minute";
    if (minutes === 1) return "About 1 minute";
    if (minutes < 60) return `About ${minutes} minutes`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 1 && remainingMinutes === 0) return "About 1 hour";
    if (remainingMinutes === 0) return `About ${hours} hours`;
    return `About ${hours}h ${remainingMinutes}m`;
  };

  // Calculate people ahead (with skipped detection)
  const getPeopleAhead = () => {
    if (!ticket) return 0;
    const ahead = ticket.position_number - currentPosition;
    return ahead; // Can be negative if skipped
  };

  // Check if user was skipped
  const isSkipped = () => {
    if (!ticket) return false;
    return ticket.position_number < currentPosition;
  };

  // Status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'WAITING':
        return 'bg-blue-100 text-blue-800';
      case 'CALLED':
        return 'bg-green-100 text-green-800 animate-pulse';
      case 'SERVING':
        return 'bg-purple-100 text-purple-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Joining queue...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Oops!</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={joinQueue}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Success state - Display ticket
  if (ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <header className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">You're in Line!</h1>
            <p className="text-gray-600">Please wait for your turn</p>
          </header>

          {/* Main Ticket Display */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6 text-center">
            {/* Position Number - Big and Bold */}
            <div className="mb-6">
              <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide mb-2">
                Your Position
              </p>
              <div className="text-8xl font-bold text-blue-600 mb-2">
                #{ticket.position_number}
              </div>
            </div>

            {/* Status Badge */}
            <div className="mb-6">
              <span className={`inline-block px-6 py-3 rounded-full text-lg font-semibold ${getStatusColor(ticket.status)}`}>
                {ticket.status === 'WAITING' && '⏳ Waiting'}
                {ticket.status === 'CALLED' && '📢 You\'re Called!'}
                {ticket.status === 'SERVING' && '🎯 Being Served'}
                {ticket.status === 'COMPLETED' && '✅ Completed'}
              </span>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-6"></div>

            {/* QR Code for Host Scanning */}
            <div className="mb-6">
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-3 text-center">
                Show this to host for verification
              </p>
              <div className="flex justify-center bg-white p-4 rounded-lg border-2 border-gray-200">
                <QRCodeSVG value={ticket.id} size={200} level="H" />
              </div>
            </div>

            {/* Additional Info */}
            <div className="text-sm text-gray-500 space-y-2">
              <p>Queue ID: {queueId.substring(0, 8)}...</p>
              <p>Ticket ID: {ticket.id.substring(0, 8)}...</p>
              <p className="text-xs">Joined: {new Date(ticket.created_at).toLocaleTimeString()}</p>
            </div>
          </div>

          {/* Real-time ETA Display */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-center">Live Queue Status</h3>

            {isSkipped() ? (
              // Skipped User Warning
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mb-4">
                <div className="text-center">
                  <div className="text-5xl mb-3">⚠️</div>
                  <h4 className="text-xl font-bold text-red-900 mb-2">Position Skipped</h4>
                  <p className="text-red-700 mb-3">
                    The host has moved past your position.
                  </p>
                  <p className="text-sm text-red-600 font-semibold">
                    Please see the host directly.
                  </p>
                </div>
              </div>
            ) : (
              // Normal Status Display
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">People Ahead</p>
                  <p className="text-3xl font-bold text-purple-600">{getPeopleAhead()}</p>
                </div>

                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Estimated Wait</p>
                  <p className="text-lg font-semibold text-purple-600">{calculateETA()}</p>
                </div>
              </div>
            )}

            {/* Connection Status Indicator */}
            <div className="text-center">
              <span className={`inline-flex items-center text-xs ${
                connectionStatus === 'connected' ? 'text-green-600' : 'text-gray-500'
              }`}>
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`}></span>
                {connectionStatus === 'connected' ? 'Live updates active' : 'Reconnecting...'}
              </span>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
            <h3 className="font-semibold text-blue-900 mb-2">What to do:</h3>
            <ul className="text-blue-800 space-y-2 text-sm">
              <li>✓ Keep this page open</li>
              <li>✓ Updates automatically when position changes</li>
              <li>✓ You'll see when it's your turn</li>
            </ul>
          </div>

          {/* Refresh Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Refreshing the page is safe - you'll keep your position
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default GuestView;
