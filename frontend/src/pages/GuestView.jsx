import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../lib/api';
import useWebSocket from '../hooks/useWebSocket';
import { Toaster, toast } from 'react-hot-toast';

// --- UUID Polyfill for HTTP Contexts ---
const generateUUID = () => {
  // Try native crypto first if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      console.warn('crypto.randomUUID failed, using fallback');
    }
  }
  // Fallback for non-secure HTTP
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
// ---------------------------------------

const GuestView = () => {
  const { queueId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use ref to prevent double-join in StrictMode
  const hasJoined = useRef(false);

  // WebSocket Connection
  const { lastMessage, connectionStatus } = useWebSocket(queueId);

  // Listen for real-time updates
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'queue_update' && ticket) {
       fetchTicketStatus(ticket.id);
    }
  }, [lastMessage]);

  const fetchTicketStatus = async (ticketId) => {
      try {
          const response = await api.get(`/tickets/${ticketId}`);
          setTicket(response.data);
      } catch (err) {
          console.error('Failed to update ticket:', err);
      }
  };

  // Initial Join
  useEffect(() => {
    const joinQueue = async () => {
      if (hasJoined.current) return;
      hasJoined.current = true;

      try {
        // 1. Get or Create Device Token
        let deviceToken = localStorage.getItem('qode_guest_token');
        if (!deviceToken) {
          deviceToken = generateUUID();
          localStorage.setItem('qode_guest_token', deviceToken);
        }

        // 2. Join API
        const response = await api.post(`/queues/${queueId}/join`, {}, {
          headers: { 'x-device-token': deviceToken }
        });

        setTicket(response.data);
        setLoading(false);
        toast.success("You're in line!");

      } catch (err) {
        console.error('Join Error:', err);
        // Handle 'Already in queue' gracefully if backend sends specific code, otherwise show error
        setError('Could not join queue. ' + (err.response?.data?.detail || err.message));
        setLoading(false);
      }
    };

    joinQueue();
  }, [queueId]);

  // --- Render Logic ---

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h1 className="text-2xl font-bold text-red-500 mb-2">Oops!</h1>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="mt-6 bg-blue-600 px-6 py-2 rounded-full">Try Again</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const isSkipped = ticket.people_ahead < 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">
      <Toaster position="top-center" />

      <div className="w-full max-w-md flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold">Qode</h1>
        <div className={`h-3 w-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
      </div>

      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md text-center shadow-2xl border border-gray-700">

        {ticket.status === 'COMPLETED' ? (
          <>
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-green-400 mb-2">You're In!</h2>
            <p className="text-gray-400">Have fun!</p>
          </>
        ) : (
          <>
            <h2 className="text-gray-400 uppercase tracking-wider text-sm mb-2">Your Position</h2>
            <div className="text-7xl font-bold text-blue-500 mb-2">#{ticket.position_number}</div>

            <div className="my-6 border-t border-gray-700"></div>

            {isSkipped ? (
               <div className="bg-red-900/50 p-4 rounded-lg border border-red-500/50">
                 <h3 className="text-red-400 font-bold text-lg mb-1">⚠️ Position Skipped</h3>
                 <p className="text-sm text-red-200">Please see the host directly.</p>
               </div>
            ) : (
               <>
                 <div className="grid grid-cols-2 gap-4 mb-6">
                   <div className="bg-gray-700/50 p-4 rounded-xl">
                     <div className="text-2xl font-bold text-white">{ticket.people_ahead}</div>
                     <div className="text-xs text-gray-400">People Ahead</div>
                   </div>
                   <div className="bg-gray-700/50 p-4 rounded-xl">
                     <div className="text-2xl font-bold text-orange-400">{ticket.eta || 'Calculating...'}</div>
                     <div className="text-xs text-gray-400">Est. Wait</div>
                   </div>
                 </div>

                 <div className="flex flex-col items-center bg-white p-4 rounded-xl">
                   <QRCodeSVG value={ticket.id} size={180} />
                   <p className="text-gray-500 text-xs mt-2 font-mono">{ticket.id.substring(0, 8)}...</p>
                 </div>
                 <p className="text-gray-500 text-sm mt-4">Show this QR to the host</p>
               </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GuestView;
