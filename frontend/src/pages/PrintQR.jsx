/**
 * Print-Friendly QR Code Page
 * Optimized for printing physical queue entry posters
 */
import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

const PrintQR = () => {
  const { queueId } = useParams();
  const [searchParams] = useSearchParams();
  const queueName = searchParams.get('name') || 'Queue';

  useEffect(() => {
    // Auto-trigger print dialog when page loads
    const timer = setTimeout(() => {
      window.print();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white p-8 print:p-0">
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          @page {
            size: A4 portrait;
            margin: 2cm;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto text-center">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">Qode</h1>
          <p className="text-3xl text-gray-700 font-semibold">{queueName}</p>
        </div>

        {/* QR Code */}
        <div className="bg-white p-12 rounded-2xl border-8 border-gray-900 inline-block mb-12">
          <QRCodeSVG
            value={`${window.location.origin}/join/${queueId}`}
            size={400}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* Instructions */}
        <div className="space-y-8 mb-12">
          <div className="bg-blue-50 border-4 border-blue-400 rounded-xl p-8">
            <h2 className="text-4xl font-bold text-blue-900 mb-4">How to Join:</h2>
            <ol className="text-2xl text-blue-800 space-y-3 text-left max-w-2xl mx-auto">
              <li className="flex items-start">
                <span className="font-bold mr-3">1.</span>
                <span>Open your phone's camera app</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-3">2.</span>
                <span>Point at the QR code above</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-3">3.</span>
                <span>Tap the notification to join the queue</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-3">4.</span>
                <span>Wait anywhere - your phone will notify you!</span>
              </li>
            </ol>
          </div>

          <div className="bg-green-50 border-4 border-green-400 rounded-xl p-6">
            <p className="text-2xl font-bold text-green-900">
              ✓ No app download required
            </p>
            <p className="text-xl text-green-800 mt-2">
              Works with any smartphone camera
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-gray-500 text-lg space-y-2">
          <p className="font-mono">{window.location.origin}/join/{queueId}</p>
          <p className="font-semibold">Powered by Qode - Skip the Line</p>
        </div>

        {/* No-print buttons */}
        <div className="no-print mt-12 space-x-4">
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Print Again
          </button>
          <button
            onClick={() => window.close()}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintQR;
