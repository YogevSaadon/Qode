/**
 * QR Scanner Component
 * Uses device camera to scan QR codes for ticket verification.
 */
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

const QRScanner = ({ onScan, onClose }) => {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [codeReader, setCodeReader] = useState(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    setCodeReader(reader);

    const startScanning = async () => {
      try {
        // Request camera permission and start scanning
        const videoInputDevices = await reader.listVideoInputDevices();

        if (videoInputDevices.length === 0) {
          setError('No camera found on this device');
          return;
        }

        // Use first camera (usually back camera on mobile)
        const selectedDeviceId = videoInputDevices[0].deviceId;

        reader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, error) => {
            if (result) {
              console.log('[QR Scanner] Scanned:', result.getText());
              onScan(result.getText());
            }
            // Ignore errors (happens frequently when no QR code is visible)
          }
        );

      } catch (err) {
        console.error('[QR Scanner] Error:', err);
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      }
    };

    startScanning();

    // Cleanup on unmount
    return () => {
      if (reader) {
        reader.reset();
      }
    };
  }, [onScan]);

  const handleClose = () => {
    if (codeReader) {
      codeReader.reset();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Scan Guest Ticket</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
          >
            ×
          </button>
        </div>

        {error ? (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 text-center">
            <div className="text-5xl mb-3">❌</div>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={handleClose}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        ) : (
          <div>
            <div className="relative bg-black rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                className="w-full h-auto"
                style={{ maxHeight: '400px' }}
              />
              <div className="absolute inset-0 border-4 border-green-500 opacity-50 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 border-4 border-green-400"></div>
                </div>
              </div>
            </div>

            <p className="text-center text-gray-600 mb-4">
              Position the QR code within the frame
            </p>

            <button
              onClick={handleClose}
              className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScanner;
