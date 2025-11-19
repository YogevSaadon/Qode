/**
 * HealthCheck Component
 * Displays backend connection status by calling /health endpoint.
 */
import { useState, useEffect } from 'react';
import api from '../lib/api';

const HealthCheck = () => {
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('Checking backend...');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await api.get('/health');
        if (response.data.status === 'ok') {
          setStatus('online');
          setMessage(`Backend Online - ${response.data.app}`);
        } else {
          setStatus('offline');
          setMessage('Backend returned unexpected response');
        }
      } catch (error) {
        setStatus('offline');
        setMessage(`Backend Offline - ${error.message}`);
      }
    };

    checkHealth();
  }, []);

  const statusStyles = {
    online: 'bg-green-100 text-green-800 border-green-300',
    offline: 'bg-red-100 text-red-800 border-red-300',
    checking: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  };

  const statusIcons = {
    online: '🟢',
    offline: '🔴',
    checking: '🟡',
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${statusStyles[status]}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{statusIcons[status]}</span>
        <span className="font-semibold">{message}</span>
      </div>
    </div>
  );
};

export default HealthCheck;
