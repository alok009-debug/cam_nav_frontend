// src/hooks/useCompass.js
import { useState, useEffect, useRef, useCallback } from 'react';

export const useCompass = () => {
  const [heading, setHeading] = useState(null);
  const [permission, setPermission] = useState('prompt');
  const [error, setError] = useState(null);

  const handlerRef = useRef(null);
  const attachedEventRef = useRef(null);

  // ---- Cleanup helper ----
  const detach = useCallback(() => {
    if (handlerRef.current && attachedEventRef.current) {
      window.removeEventListener(attachedEventRef.current, handlerRef.current, true);
      handlerRef.current = null;
      attachedEventRef.current = null;
    }
  }, []);

  // ---- Attach helper ----
  const startListening = useCallback(() => {
    detach();

    const handleOrientation = (event) => {
      let compass = null;

      if (typeof event.webkitCompassHeading === 'number' &&
        !Number.isNaN(event.webkitCompassHeading)) {
        compass = event.webkitCompassHeading;
      }
      // Android absolute: alpha decreases as we rotate clockwise, so invert
      else if (event.absolute === true && typeof event.alpha === 'number') {
        compass = 360 - event.alpha;
      }
      
      else if (typeof event.alpha === 'number') {
        compass = 360 - event.alpha;
      }

      if (compass !== null && !Number.isNaN(compass)) {
        const normalized = ((compass % 360) + 360) % 360;
        setHeading(normalized);
      }
    };

    handlerRef.current = handleOrientation;

    // Prefer the absolute event when the browser supports it.
    if ('ondeviceorientationabsolute' in window) {
      attachedEventRef.current = 'deviceorientationabsolute';
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    }
     else {
      attachedEventRef.current = 'deviceorientation';
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    console.log(' Compass listener attached to', attachedEventRef.current);
  }, [detach]);

  // ---- Permission + auto-start ----
  const requestPermission = useCallback(async () => {
    console.log('Requesting compass permission...');
    try {
      // iOS 13+ requires explicit permission
      if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
        const response = await DeviceOrientationEvent.requestPermission();
        console.log('iOS permission response:', response);
        setPermission(response);
        if (response === 'granted') {
          startListening();
        } else {
          setError('Compass permission denied');
        }
      } else {
        // Android and desktop: no explicit permission needed
        setPermission('granted');
        startListening();
      }
    } catch (err) {
      console.error(' Compass permission error:', err);
      setError(err.message);
      setPermission('denied');
    }
  }, [startListening]);

  // ---- Lifecycle ----
  useEffect(() => {
    const needsPermission =
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function';

    if (!needsPermission) {
      // Auto-start on Android / desktop
      requestPermission();
    }

    return () => {
      detach();
    };
  }, [requestPermission, detach]);

  return { heading, permission, error, requestPermission };
};