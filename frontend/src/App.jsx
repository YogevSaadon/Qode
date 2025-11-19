/**
 * Main App Component
 * Entry point for the Qode application with routing.
 */
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HealthCheck from './components/HealthCheck';
import HostDashboard from './pages/HostDashboard';
import GuestView from './pages/GuestView';
import PrintQR from './pages/PrintQR';

function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Qode</h1>
          <p className="text-gray-600">Queue Management System</p>
        </header>

        <main>
          <div className="mb-8">
            <HealthCheck />
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Welcome to Qode</h2>
            <p className="text-gray-700 mb-6">
              The phone is the queue. No apps, no registration, just scan and wait.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                to="/host"
                className="block p-6 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <h3 className="text-xl font-bold text-blue-900 mb-2">
                  🎯 Host Dashboard
                </h3>
                <p className="text-blue-700">
                  Create and manage your virtual queue
                </p>
              </Link>

              <div className="block p-6 bg-gray-50 border-2 border-gray-200 rounded-lg opacity-50">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  📱 Guest Join
                </h3>
                <p className="text-gray-700">
                  Scan QR code to join queue (Coming soon)
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">How it works</h3>
            <ol className="space-y-2 text-gray-700">
              <li>
                <strong>1. Host creates queue:</strong> Click "Host Dashboard" and start your queue
              </li>
              <li>
                <strong>2. Generate QR code:</strong> Display the QR code at your booth/location
              </li>
              <li>
                <strong>3. Guests scan & wait:</strong> Visitors scan the code and track their position
              </li>
              <li>
                <strong>4. Manage the line:</strong> Call next, mark done, keep everyone moving
              </li>
            </ol>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<HostDashboard />} />
        <Route path="/join/:queueId" element={<GuestView />} />
        <Route path="/print-qr/:queueId" element={<PrintQR />} />
      </Routes>
    </Router>
  );
}

export default App;
