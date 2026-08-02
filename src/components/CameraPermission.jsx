import { useState } from 'react';

const CameraPermission = ({ onPermissionGranted, onPermissionDenied }) => {
  const [permissionState, setPermissionState] = useState('prompt');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  const requestPermission = async () => {
    setLoading(true);
    setDebugInfo('Requesting camera permission...');
    
    try {
      console.log('📷 Requesting camera permission...');
      setDebugInfo('📷 Checking if getUserMedia is available...');
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg = 'getUserMedia not supported in this browser';
        console.error('❌', errorMsg);
        setDebugInfo(`❌ ${errorMsg}`);
        setPermissionState('denied');
        onPermissionDenied(errorMsg);
        setLoading(false);
        return;
      }
      
      setDebugInfo('📷 Requesting camera with getUserMedia...');
      console.log('📷 Calling getUserMedia...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      setDebugInfo('✅ Camera stream acquired!');
      console.log('✅ Camera stream acquired:', stream);
      
      // Stop all tracks
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind, track.label);
        track.stop();
      });
      
      console.log('✅ Camera permission granted');
      setDebugInfo('✅ Permission granted successfully!');
      setPermissionState('granted');
      onPermissionGranted();
      
    } catch (error) {
      console.error('❌ Camera error:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      
      let errorMsg = error.message || 'Unknown error';
      let debugMsg = `❌ ${error.name}: ${error.message}`;
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMsg = 'Camera permission denied in browser settings. Please allow camera access.';
        debugMsg = '❌ PermissionDeniedError: User denied camera access';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera found on this device.';
        debugMsg = '❌ NotFoundError: No camera detected';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMsg = 'Camera is in use by another application.';
        debugMsg = '❌ NotReadableError: Camera already in use';
      } else if (error.name === 'OverconstrainedError') {
        errorMsg = 'Camera constraints cannot be met.';
        debugMsg = '❌ OverconstrainedError: Camera not meeting requirements';
      }
      
      setDebugInfo(debugMsg);
      setPermissionState('denied');
      onPermissionDenied(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (permissionState === 'granted') {
    return (
      <div style={{
        textAlign: 'center',
        padding: '15px',
        background: '#e8f8f5',
        borderRadius: '8px',
        border: '2px solid #1abc9c',
      }}>
        ✅ Camera Permission Granted
      </div>
    );
  }

  return (
    <div>
      <div style={{
        textAlign: 'center',
        padding: '20px',
        background: '#f8f9fa',
        borderRadius: '8px',
        border: '2px solid #3498db',
      }}>
        <h3>📷 Camera Access Required</h3>
        <p style={{ color: '#666', fontSize: '14px' }}>
          This app needs camera access to scan QR codes
        </p>
        <button
          onClick={requestPermission}
          disabled={loading}
          style={{
            padding: '14px 30px',
            background: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? '⏳ Requesting...' : '📷 Allow Camera Access'}
        </button>
        
        {debugInfo && (
          <div style={{
            marginTop: '10px',
            padding: '10px',
            background: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#555',
            textAlign: 'left',
            wordBreak: 'break-all',
          }}>
            <strong>🔍 Debug:</strong> {debugInfo}
          </div>
        )}
        
        <p style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
          Your camera will only be used when scanning QR codes
        </p>
      </div>
    </div>
  );
};

export default CameraPermission;