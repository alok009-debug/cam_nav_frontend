import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useGeolocation } from '../hooks/useGeolocation';
import { useCompass } from '../hooks/useCompass';
import { calculateBearing, calculateDistance } from '../utils/bearing';
import './RealTimeNavigation.css';

const RealTimeNavigation = () => {
  const [startId, setStartId] = useState('');
  const [endId, setEndId] = useState('');
  const [locations, setLocations] = useState([]);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [arrived, setArrived] = useState(false);

  const { location: gpsLocation } = useGeolocation();
  const { heading, permission, requestPermission } = useCompass();

  // Available locations for testing
  const testLocations = [
    { id: 26, name: 'Store room', lat: 23.67008250, lng: 85.51245900 },
    { id: 27, name: 'Mountains view', lat: 23.66818540, lng: 85.51991350 },
    { id: 28, name: 'Water tank', lat: 23.66746220, lng: 85.51979210 },
    { id: 29, name: 'T intersection', lat: 23.66833510, lng: 85.52051370 },
  ];

  useEffect(() => {
    setLocations(testLocations);
  }, []);

  const handleFindRoute = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRoute(null);
    setCurrentStepIndex(0);
    setArrived(false);

    try {
      const response = await api.post('/navigation/shortest-path', {
        startId: parseInt(startId),
        endId: parseInt(endId)
      });
      
      console.log('📍 Route found:', response.data);
      setRoute(response.data);
      setIsNavigating(true);
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
  };

  // Get current position
  const getCurrentPosition = () => {
    if (gpsLocation) {
      return { lat: gpsLocation.lat, lng: gpsLocation.lng };
    }
    // Fallback to start location if GPS not available
    if (route && route.start) {
      return { lat: parseFloat(route.start.latitude), lng: parseFloat(route.start.longitude) };
    }
    return null;
  };

  // Calculate distance to next waypoint
  const getDistanceToNext = () => {
    if (!route || !route.directions || currentStepIndex >= route.directions.length) {
      return null;
    }

    const currentPos = getCurrentPosition();
    if (!currentPos) return null;

    const currentStep = route.directions[currentStepIndex];
    const nextNode = route.pathNodes.find(n => n.node_id === currentStep.to);
    
    if (!nextNode) return null;

    const dist = calculateDistance(
      currentPos.lat, currentPos.lng,
      parseFloat(nextNode.latitude), parseFloat(nextNode.longitude)
    );

    return Math.round(dist);
  };

  // Get arrow direction
  const getArrowDirection = () => {
    if (!route || !route.directions || currentStepIndex >= route.directions.length) {
      return 0;
    }

    const currentPos = getCurrentPosition();
    if (!currentPos || heading === null) return 0;

    const currentStep = route.directions[currentStepIndex];
    const nextNode = route.pathNodes.find(n => n.node_id === currentStep.to);
    
    if (!nextNode) return 0;

    const bearing = calculateBearing(
      currentPos.lat, currentPos.lng,
      parseFloat(nextNode.latitude), parseFloat(nextNode.longitude)
    );

    let diff = bearing - heading;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff;
  };

  // Check if arrived at current waypoint
  useEffect(() => {
    if (!isNavigating || !route || arrived) return;

    const dist = getDistanceToNext();
    if (dist !== null && dist < 10) {
      // Move to next step
      if (currentStepIndex < route.directions.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
        console.log('✅ Reached waypoint, moving to next step');
      } else {
        setArrived(true);
        setIsNavigating(false);
        console.log('🎉 Arrived at destination!');
      }
    }
  }, [gpsLocation, heading, isNavigating, route, currentStepIndex, arrived]);

  const currentStep = route?.directions?.[currentStepIndex];
  const nextNode = currentStep ? route.pathNodes.find(n => n.node_id === currentStep.to) : null;
  const distanceToNext = getDistanceToNext();
  const arrowRotation = getArrowDirection();

  return (
    <div className="nav-container">
      <header className="nav-header">
        <h1>🧭 Real-time Navigation</h1>
        <p>Select your start and destination to begin</p>
      </header>

      {/* Route Finder */}
      {!isNavigating && !arrived && (
        <form onSubmit={handleFindRoute} className="route-form">
          <div className="form-row">
            <div className="form-group">
              <label>📍 Start Location</label>
              <select 
                value={startId} 
                onChange={(e) => setStartId(e.target.value)}
                required
              >
                <option value="">Select start</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>🎯 Destination</label>
              <select 
                value={endId} 
                onChange={(e) => setEndId(e.target.value)}
                required
              >
                <option value="">Select destination</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? '⏳ Finding route...' : '🚀 Start Navigation'}
          </button>
        </form>
      )}

      {error && <div className="error">{error}</div>}

      {/* Navigation View */}
      {isNavigating && route && !arrived && (
        <div className="nav-view">
          <div className="nav-header-bar">
            <div className="nav-info">
              <span className="destination">{route.to}</span>
              <button onClick={stopNavigation} className="stop-btn">✕ Stop</button>
            </div>
            <div className="progress">
              Step {currentStepIndex + 1} of {route.directions.length}
            </div>
          </div>

          {/* AR Arrow */}
          <div className="ar-container">
            <div 
              className="arrow-big" 
              style={{ transform: `rotate(${arrowRotation}deg)` }}
            >
              ⬆️
            </div>
            <p className="compass-hint">Point your phone in the direction of the arrow</p>
          </div>

          {/* Current Instruction */}
          <div className="instruction-card">
            <div className="instruction-icon">
              {currentStep?.direction?.includes('left') ? '↩️' :
               currentStep?.direction?.includes('right') ? '↪️' :
               currentStep?.direction?.includes('straight') ? '⬆️' : '📍'}
            </div>
            <div className="instruction-text">
              <div className="action">{currentStep?.direction || 'Continue'}</div>
              <div className="detail">
                {distanceToNext !== null ? `${distanceToNext}m to ${nextNode?.node_name}` : 'Calculating...'}
              </div>
            </div>
          </div>

          {/* Mini Map */}
          <div className="mini-map">
            <div className="path-visual">
              {route.pathNodes.map((node, index) => (
                <div key={node.node_id} className={`path-dot ${index <= currentStepIndex ? 'visited' : ''} ${index === currentStepIndex ? 'current' : ''}`}>
                  <span className="dot-label">{index + 1}</span>
                </div>
              ))}
            </div>
            <div className="path-labels">
              {route.pathNodes.map((node, index) => (
                <span key={node.node_id} className="label">
                  {node.node_name}
                </span>
              ))}
            </div>
          </div>

          {/* Compass Permission */}
          {permission === 'prompt' && (
            <button onClick={requestPermission} className="compass-btn">
              🧭 Enable Compass
            </button>
          )}
        </div>
      )}

      {/* Arrival View */}
      {arrived && (
        <div className="arrival-card">
          <div className="arrival-icon">🎉</div>
          <h2>You have arrived!</h2>
          <p>You've reached your destination: <strong>{route?.to}</strong></p>
          <button onClick={() => {
            setArrived(false);
            setRoute(null);
            setCurrentStepIndex(0);
          }} className="new-route-btn">
            🗺️ Plan New Route
          </button>
        </div>
      )}

      {/* Route Summary */}
      {route && !isNavigating && !arrived && (
        <div className="route-summary">
          <h3>📋 Route Summary</h3>
          <div className="summary-item">
            <span>From:</span>
            <strong>{route.from}</strong>
          </div>
          <div className="summary-item">
            <span>To:</span>
            <strong>{route.to}</strong>
          </div>
          <div className="summary-item">
            <span>Total Distance:</span>
            <strong>{route.totalDistance}m</strong>
          </div>
          <div className="directions-preview">
            {route.directions?.map((dir, idx) => (
              <div key={idx} className="dir-item">
                <span className="dir-num">{idx + 1}.</span>
                <span className="dir-text">{dir.direction}</span>
                <span className="dir-dist">({dir.distance}m)</span>
              </div>
            ))}
          </div>
          <button onClick={() => setIsNavigating(true)} className="start-nav-btn">
            🧭 Start Navigating
          </button>
        </div>
      )}
    </div>
  );
};

export default RealTimeNavigation;