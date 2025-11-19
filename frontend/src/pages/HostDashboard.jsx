/**
 * Host Dashboard - Queue Creation and Management
 * Allows hosts to create and manage their queues.
 */
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import QRScanner from '../components/QRScanner';

const HostDashboard = () => {
  const [queueCreated, setQueueCreated] = useState(false);
  const [queueData, setQueueData] = useState(null);
  const [queueName, setQueueName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ticket management
  const [tickets, setTickets] = useState([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  // QR Scanner
  const [showScanner, setShowScanner] = useState(false);

  // Check if user already has a queue in localStorage
  useEffect(() => {
    const savedQueueId = localStorage.getItem('qode_queue_id');
    const savedHostToken = localStorage.getItem('qode_host_token');

    if (savedQueueId && savedHostToken) {
      // Load existing queue
      loadQueue(savedQueueId, savedHostToken);
    }
  }, []);

  const loadQueue = async (queueId, hostToken) => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/queues/${queueId}`, {
        headers: {
          'x-host-token': hostToken,
        },
      });

      setQueueData({
        ...response.data,
        host_token: hostToken, // Add back the token for display
      });
      setQueueCreated(true);
      setError(null);

      // Load tickets immediately after loading queue
      fetchTickets(queueId, hostToken);
    } catch (err) {
      console.error('Failed to load queue:', err);
      // Clear invalid data
      localStorage.removeItem('qode_queue_id');
      localStorage.removeItem('qode_host_token');
      setError('Failed to load saved queue. Please create a new one.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTickets = async (queueId, hostToken) => {
    try {
      setIsLoadingTickets(true);
      const response = await api.get(`/api/queues/${queueId}/tickets`, {
        headers: {
          'x-host-token': hostToken,
        },
      });

      setTickets(response.data);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const handleVerifyTicket = async (ticketId) => {
    if (!queueData) return;

    try {
      const response = await api.post(
        `/api/tickets/${ticketId}/verify`,
        {},
        {
          headers: {
            'x-host-token': queueData.host_token,
          },
        }
      );

      console.log('Ticket verified:', response.data);

      // Show success toast
      toast.success(`✅ Verified Ticket #${response.data.broadcast.current_position}!`, {
        duration: 3000,
        style: {
          background: '#10b981',
          color: '#fff',
          fontSize: '16px',
          fontWeight: 'bold',
        },
      });

      // Refresh tickets list
      fetchTickets(queueData.id, queueData.host_token);
    } catch (err) {
      console.error('Failed to verify ticket:', err);
      toast.error(err.response?.data?.detail || 'Failed to verify ticket', {
        duration: 4000,
      });
    }
  };

  const handleScanQR = async (ticketId) => {
    console.log('[QR Scan] Scanned ticket ID:', ticketId);
    setShowScanner(false);

    // Verify the scanned ticket
    await handleVerifyTicket(ticketId);
  };

  const handleNoShow = async (ticketId) => {
    if (!queueData) return;

    if (!confirm('Mark this ticket as No Show? The guest will need to see you directly.')) {
      return;
    }

    try {
      await api.post(
        `/api/tickets/${ticketId}/noshow`,
        {},
        {
          headers: {
            'x-host-token': queueData.host_token,
          },
        }
      );

      toast.success('Ticket marked as No Show', {
        duration: 3000,
      });

      // Refresh tickets list
      fetchTickets(queueData.id, queueData.host_token);
    } catch (err) {
      console.error('Failed to mark no-show:', err);
      toast.error(err.response?.data?.detail || 'Failed to mark as no-show', {
        duration: 4000,
      });
    }
  };

  const handleCreateQueue = async (e) => {
    e.preventDefault();

    if (!queueName.trim()) {
      setError('Queue name cannot be empty');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/queues', {
        name: queueName.trim(),
      });

      const queue = response.data;

      // Save to localStorage (CRITICAL - includes host_token)
      localStorage.setItem('qode_queue_id', queue.id);
      localStorage.setItem('qode_host_token', queue.host_token);

      setQueueData(queue);
      setQueueCreated(true);
      setQueueName('');
    } catch (err) {
      console.error('Failed to create queue:', err);
      setError(err.response?.data?.detail || 'Failed to create queue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetQueue = () => {
    if (confirm('Are you sure you want to clear this queue and create a new one?')) {
      localStorage.removeItem('qode_queue_id');
      localStorage.removeItem('qode_host_token');
      setQueueCreated(false);
      setQueueData(null);
      setError(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (queueCreated && queueData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Host Dashboard</h1>
            <p className="text-gray-600">Manage your queue</p>
          </header>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {queueData.name}
                </h2>
                <p className="text-gray-500 text-sm">Queue ID: {queueData.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    queueData.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {queueData.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-semibold mb-1">
                  Current Position
                </div>
                <div className="text-3xl font-bold text-blue-900">
                  {queueData.current_position}
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-600 font-semibold mb-1">
                  Total Issued
                </div>
                <div className="text-3xl font-bold text-purple-900">
                  {queueData.last_number_issued}
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-sm text-orange-600 font-semibold mb-1">
                  Avg Wait Time
                </div>
                <div className="text-3xl font-bold text-orange-900">
                  {Math.round(queueData.avg_wait_time / 60)}m
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">QR Code Entry Point</h3>
              <p className="text-sm text-gray-600 mb-4">
                Display this QR code at your booth for guests to scan and join the queue.
              </p>
              <div className="bg-white p-8 rounded-lg border-2 border-gray-300 text-center">
                <QRCodeSVG
                  value={`${window.location.origin}/join/${queueData.id}`}
                  size={256}
                  level="H"
                  className="mx-auto"
                />
                <p className="text-xs text-gray-500 font-mono mt-4">
                  {window.location.origin}/join/{queueData.id}
                </p>
              </div>
            </div>

            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold mb-2 text-red-600">Security Token</h3>
              <p className="text-sm text-gray-600 mb-2">
                Save this token securely. You need it to manage this queue.
              </p>
              <div className="bg-yellow-50 border-2 border-yellow-400 p-3 rounded font-mono text-sm break-all">
                {queueData.host_token}
              </div>
            </div>
          </div>

          {/* Waiting Tickets List */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-900">Waiting Tickets</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowScanner(true)}
                  className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors font-semibold"
                >
                  📷 Scan Guest
                </button>
                <button
                  onClick={() => fetchTickets(queueData.id, queueData.host_token)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>

            {isLoadingTickets ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600 text-lg">No one in queue</p>
                <p className="text-gray-500 text-sm mt-2">Tickets will appear here when guests join</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between bg-gray-50 border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          #{ticket.position_number}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Joined: {new Date(ticket.created_at).toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Ticket ID: {ticket.id.substring(0, 8)}...
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerifyTicket(ticket.id)}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md"
                      >
                        ✅ Verify
                      </button>
                      <button
                        onClick={() => handleNoShow(ticket.id)}
                        className="px-4 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                        title="Mark as No Show"
                      >
                        🚫
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleResetQueue}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Clear Queue & Create New
          </button>

          {/* QR Scanner Modal */}
          {showScanner && (
            <QRScanner
              onScan={handleScanQR}
              onClose={() => setShowScanner(false)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Host Dashboard</h1>
          <p className="text-gray-600">Create your virtual queue</p>
        </header>

        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Start a New Queue</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateQueue}>
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                Queue Name
              </label>
              <input
                type="text"
                value={queueName}
                onChange={(e) => setQueueName(e.target.value)}
                placeholder="e.g., Anime Booth 1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={100}
                disabled={isLoading}
              />
              <p className="text-sm text-gray-500 mt-1">
                Choose a clear, recognizable name for your queue
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !queueName.trim()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Creating...' : 'Start Queue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;
