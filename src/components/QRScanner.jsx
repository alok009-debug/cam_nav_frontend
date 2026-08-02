import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const QRScanner = ({ onScanSuccess, onScanError, stopScanner, cameraReady }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const isMounted = useRef(true);
  const hasScanned = useRef(false);
  const initialized = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    hasScanned.current = false;

    // If stopScanner is true, cleanup
    if (stopScanner) {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (e) {}
        scannerRef.current = null;
        initialized.current = false;
      }
      setIsScanning(false);
      return;
    }

    // Don't start if camera is not ready
    if (!cameraReady) {
      console.log('⏳ Waiting for camera permission...');
      return;
    }

    // Don't re-initialize if already scanning
    if (initialized.current) {
      console.log('Scanner already initialized, skipping...');
      return;
    }

    const startScanner = async () => {
      try {
        console.log('📷 Initializing scanner...');
        
        const element = document.getElementById('qr-reader');
        if (!element) {
          console.error('QR reader element not found');
          return;
        }

        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        initialized.current = true;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (hasScanned.current || !isMounted.current) return;
            
            console.log('✅ QR scanned:', decodedText);
            hasScanned.current = true;
            setIsScanning(false);
            
            if (scannerRef.current) {
              try {
                scannerRef.current.stop();
                scannerRef.current.clear();
              } catch (e) {}
              scannerRef.current = null;
              initialized.current = false;
            }
            
            onScanSuccess(decodedText);
          },
          (errorMessage) => {
            // Ignore common errors
            if (!errorMessage) return;
            if (errorMessage.includes('No QR code found')) return;
            if (errorMessage.includes('not running')) return;
            if (errorMessage.includes('play')) return;
            if (errorMessage.includes('permission')) {
              setError('Please allow camera access');
              onScanError('Camera permission denied');
            }
          }
        );

        if (isMounted.current) {
          setIsScanning(true);
          setError(null);
          console.log('✅ Scanner active');
        }
      } catch (error) {
        console.error('Scanner error:', error);
        let msg = 'Camera access denied';
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          msg = 'Please allow camera access in browser settings';
        } else if (error.name === 'NotFoundError') {
          msg = 'No camera found on this device';
        }
        setError(msg);
        onScanError(msg);
        initialized.current = false;
      }
    };

    const timer = setTimeout(startScanner, 500);

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (e) {}
        scannerRef.current = null;
        initialized.current = false;
      }
    };
  }, [onScanSuccess, onScanError, stopScanner, cameraReady]);

  return (
    <div>
      <div 
        id="qr-reader" 
        style={{ 
          width: '100%', 
          maxWidth: '400px', 
          margin: '0 auto',
          minHeight: '250px',
          background: '#000',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      />
      {!cameraReady && (
        <p style={{ textAlign: 'center', marginTop: '10px', color: '#f39c12' }}>
          ⏳ Waiting for camera permission...
        </p>
      )}
      {isScanning && !stopScanner && !error && cameraReady && (
        <p style={{ textAlign: 'center', marginTop: '10px', color: '#2ecc71', fontSize: '14px' }}>
          📷 Camera active - Point at QR code
        </p>
      )}
      {stopScanner && (
        <p style={{ textAlign: 'center', marginTop: '10px', color: '#3498db', fontSize: '14px' }}>
          ✅ QR Code scanned successfully!
        </p>
      )}
      {error && (
        <div style={{ 
          textAlign: 'center', 
          marginTop: '10px', 
          padding: '12px',
          background: '#fde8e8',
          borderRadius: '8px',
          color: '#e74c3c',
        }}>
          ⚠️ {error}
          <br />
          <button 
            onClick={() => {
              setError(null);
              initialized.current = false;
              window.location.reload();
            }}
            style={{
              marginTop: '10px',
              padding: '8px 20px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default QRScanner;