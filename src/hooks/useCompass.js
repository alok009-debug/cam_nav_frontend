import { useState, useEffect } from 'react';

export const useCompass = () => {
  const [heading, setHeading] = useState(null);
  const [permission, setPermission] = useState('prompt');
  const [error, setError] = useState(null);

  const requestPermission = async () => {
    console.log('🧭 Requesting compass permission...');
    
    try {
      // iOS 13+ requires explicit permission
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        const response = await DeviceOrientationEvent.requestPermission();
        console.log('🧭 iOS permission response:', response);
        setPermission(response);
        if (response === 'granted') {
          startListening();
        } else {
          setError('Compass permission denied');
        }
      } else {
        // Android and other devices
        console.log('🧭 Compass permission auto-granted');
        setPermission('granted');
        startListening();
      }
    } catch (err) {
      console.error('❌ Compass permission error:', err);
      setError(err.message);
    }
  };

  const startListening = () => {
    console.log('🧭 Starting compass listener...');
    
    const handleOrientation = (event) => {
      let compass = null;
      
      // iOS uses webkitCompassHeading (absolute)
      if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
        compass = event.webkitCompassHeading;
      } else if (event.alpha !== null) {
        // Android: Convert to compass heading
        compass = 360 - event.alpha;
      }
      
      if (compass !== null) {
        setHeading(compass);
        // console.log('🧭 Compass heading:', compass);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      console.log('🧭 Removing compass listener');
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  };

  useEffect(() => {
    // Auto-request for non-iOS
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission !== 'function') {
      requestPermission();
    }
    
    return () => {
      window.removeEventListener('deviceorientation', () => {});
    };
  }, []);

  return { heading, permission, error, requestPermission };
};