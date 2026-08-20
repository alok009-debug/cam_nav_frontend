import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { useGeolocation } from '../hooks/useGeolocation';
import { useCompass } from '../hooks/useCompass';
import { calculateBearing, calculateDistance } from '../utils/bearing';
import './Navigation.css';

const Navigation = () => {
  const [locations, setLocations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [arrived, setArrived] = useState(false);
  const [qrScanned, setQrScanned] = useState(false);

  const { location: gpsLocation } = useGeolocation();
  const { heading, permission, requestPermission } = useCompass();

  const testLocations = [
    { locId: 30, name: 'Hostel stairs', latitude: 23.38236340, longitude: 85.33152920 },
    { locId: 31, name: 'Rooftop solars', latitude: 23.38236170, longitude: 85.33154330 },
    { locId: 32, name: 'Grass lands', latitude: 23.38231500, longitude: 85.33163000 },
  ];

  useEffect(() => {
    setLocations(testLocations);
  }, []);

  const handleManualLocation = (loc) => {
    setCurrentLocation({
      locId: loc.locId,
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
    });
    setQrScanned(true);
    setError('');
  };

  const handleDestinationSelect = (e) => {
    const locId = parseInt(e.target.value);
    const selected = locations.find(l => l.locId === locId);
    setDestination(selected);
    setError('');
  };

  const findRoute = async () => {
    if (!currentLocation || !destination) {
      setError('Please select both current location and destination');
      return;
    }

    setLoading(true);
    setError('');
    setRoute(null);
    setCurrentStepIndex(0);
    setArrived(false);

    try {
      const response = await api.post('/navigation/shortest-path', {
        startId: currentLocation.locId,
        endId: destination.locId
      });
      
      console.log('📍 API Response:', response.data);

      if (response.data.success) {
        setRoute(response.data);
        setIsNavigating(true);
        console.log('✅ Route found!');
      } else {
        setError('Failed to find path');
      }
    } catch (err) {
      console.error('❌ Navigation error:', err);
      setError(err.response?.data?.error || 'Failed to find path');
    } finally {
      setLoading(false);
    }
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setRoute(null);
    setCurrentStepIndex(0);
    setArrived(false);
  };

  const getCurrentPosition = () => {
    if (gpsLocation && gpsLocation.lat && gpsLocation.lng) {
      return { lat: gpsLocation.lat, lng: gpsLocation.lng };
    }
    if (currentLocation) {
      return { lat: currentLocation.latitude, lng: currentLocation.longitude };
    }
    return null;
  };

  const getDistanceToDestination = () => {
    if (!destination) return null;
    const currentPos = getCurrentPosition();
    if (!currentPos) return null;

    return calculateDistance(
      currentPos.lat, currentPos.lng,
      destination.latitude, destination.longitude
    );
  };

  const currentStep = route?.directions?.[currentStepIndex];
  const distanceToFinal = getDistanceToDestination();

  return (
    <div className="nav-container">
      <header className="nav-header">
        <h1>🧭 Campus Navigation</h1>
        <p>Select your current location and destination</p>
      </header>

      {!isNavigating && !arrived && (
        <div className="location-section">
          <div className="current-location">
            <h3>📍 Your Current Location</h3>
            {!qrScanned ? (
              <div className="location-buttons">
                {locations.map(loc => (
                  <button
                    key={loc.locId}
                    onClick={() => handleManualLocation(loc)}
                    className="location-btn"
                  >
                    📍 {loc.name}
                  </button>
                ))}
                <p className="hint">Select your current location</p>
              </div>
            ) : (
              <div className="selected-location">
                ✅ Current: <strong>{currentLocation?.name}</strong>
                <button onClick={() => {
                  setQrScanned(false);
                  setCurrentLocation(null);
                }} className="change-btn">
                  Change
                </button>
              </div>
            )}
          </div>

          <div className="destination-select">
            <h3>🎯 Select Destination</h3>
            <select
              onChange={handleDestinationSelect}
              className="dropdown"
              defaultValue=""
            >
              <option value="">-- Choose destination --</option>
              {locations.map(loc => (
                <option key={loc.locId} value={loc.locId}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={findRoute}
            disabled={!qrScanned || !destination || loading}
            className="find-route-btn"
          >
            {loading ? '⏳ Finding path...' : '🗺️ Find Path'}
          </button>

          {error && <div className="error">{error}</div>}
        </div>
      )}

      {/* ✅ NAVIGATION VIEW - Simplified condition */}
      {isNavigating && route && (
        <div className="nav-view">
          <div className="nav-header-bar">
            <div className="nav-info">
              <span className="destination">🚶 {route.to || destination?.name || 'Navigating'}</span>
              <button onClick={stopNavigation} className="stop-btn">✕ Stop</button>
            </div>
            <div className="progress">
              Step {currentStepIndex + 1} of {route.directions?.length || 0}
            </div>
          </div>

          <div className="ar-container">
            <div className="arrow-big">⬆️</div>
            <p className="compass-hint">Point your phone in the direction of the arrow</p>
            {heading !== null && (
              <p className="compass-reading">🧭 Heading: {Math.round(heading)}°</p>
            )}
          </div>

          <div className="instruction-card">
            <div className="instruction-icon">
              {currentStep?.direction?.includes('left') ? '↩️' :
               currentStep?.direction?.includes('right') ? '↪️' :
               currentStep?.direction?.includes('stairs') ? '🪜' : '⬆️'}
            </div>
            <div className="instruction-text">
              <div className="action">{currentStep?.direction || 'Continue walking'}</div>
              <div className="detail">
                {distanceToFinal !== null ? `${Math.round(distanceToFinal)}m to ${destination?.name}` : 'Calculating...'}
              </div>
            </div>
          </div>

          <div className="nav-stats">
            <div className="stat">
              <span className="stat-label">Total Distance</span>
              <span className="stat-value">{route.totalDistance || 0}m</span>
            </div>
            <div className="stat">
              <span className="stat-label">Remaining</span>
              <span className="stat-value">
                {distanceToFinal !== null ? `${Math.round(distanceToFinal)}m` : '...'}
              </span>
            </div>
          </div>

          <div className="mini-map">
            <div className="path-visual">
              {route.pathNodes?.map((node, index) => (
                <div 
                  key={node.node_id} 
                  className={`path-dot ${index <= currentStepIndex ? 'visited' : ''} ${index === currentStepIndex ? 'current' : ''}`}
                >
                  <span className="dot-label">{index + 1}</span>
                </div>
              ))}
            </div>
            <div className="path-labels">
              {route.pathNodes?.map((node, index) => (
                <span key={node.node_id} className={`label ${index === currentStepIndex ? 'active' : ''}`}>
                  {node.node_name}
                </span>
              ))}
            </div>
          </div>

          {permission === 'prompt' && (
            <button onClick={requestPermission} className="compass-btn">
              🧭 Enable Compass
            </button>
          )}

          {/* 🔍 DEBUG INFO */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '10px',
            borderRadius: '8px',
            marginTop: '15px',
            fontSize: '11px',
            fontFamily: 'monospace',
            overflow: 'auto',
            maxHeight: '200px'
          }}>
            <p><strong>🔍 Debug:</strong></p>
            <p>isNavigating: {isNavigating ? '✅' : '❌'}</p>
            <p>route: {route ? '✅' : '❌'}</p>
            <p>directions: {route?.directions?.length || 0}</p>
            <p>currentStepIndex: {currentStepIndex}</p>
            <p>heading: {heading !== null ? `${Math.round(heading)}°` : '❌'}</p>
            <p>distance: {distanceToFinal !== null ? `${Math.round(distanceToFinal)}m` : '❌'}</p>
            <pre style={{ color: '#ecf0f1', fontSize: '10px', maxHeight: '100px', overflow: 'auto' }}>
              {route ? JSON.stringify(route, null, 2) : 'No route'}
            </pre>
          </div>
        </div>
      )}

      {arrived && (
        <div className="arrival-card">
          <div className="arrival-icon">🎉</div>
          <h2>You have arrived!</h2>
          <p>You've reached <strong>{destination?.name}</strong></p>
          <button onClick={() => {
            setArrived(false);
            setRoute(null);
            setCurrentStepIndex(0);
            setQrScanned(false);
            setCurrentLocation(null);
            setDestination(null);
          }} className="new-route-btn">
            🗺️ Plan New Route
          </button>
        </div>
      )}
    </div>
  );
};

export default Navigation;