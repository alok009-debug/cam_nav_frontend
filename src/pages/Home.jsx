import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useGeolocation } from '../hooks/useGeolocation';
import { useCompass } from '../hooks/useCompass';
import { calculateBearing, calculateDistance } from '../utils/bearing';
import QRScanner from '../components/QRScanner';
import './Home.css';

const Home = () => {
  const [locations, setLocations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [stopScanner, setStopScanner] = useState(false);
  const [qrScanned, setQrScanned] = useState(false);
  const [fetchingLocations, setFetchingLocations] = useState(true);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [arrived, setArrived] = useState(false);
  const { location: gpsLocation } = useGeolocation()
  const { heading, permission, requestPermission } = useCompass();

  // Handle QR scan success
  const handleQRScan = async (qrHash) => {
    try {
      const response = await api.post('/navigation/validate-qr', { qrHash });
      console.log('📡 QR Response:', response.data);

      if (response.data.success) {
        // Store admin_id in localStorage
        const adminId = response.data.adminId || response.data.location?.admin_id;
        if (adminId) {
          localStorage.setItem('campusAdminId', adminId);
          console.log('Admin ID stored:', adminId);
        }

        // Find the location in our list
        const loc = locations.find(l => l.locId === response.data.location.locId);
        if (loc) {
          setCurrentLocation({
            locId: loc.locId,
            name: loc.name,
            latitude: loc.latitude,
            longitude: loc.longitude,
            admin_id: loc.admin_id || adminId,
          });
        } else {
          // If not in list, use response data
          setCurrentLocation({
            locId: response.data.location.locId,
            name: response.data.location.name,
            latitude: response.data.location.latitude,
            longitude: response.data.location.longitude,
            admin_id: response.data.location.admin_id || adminId,
          });
        }

        //Store the location data as well
        localStorage.setItem('currentLocation', JSON.stringify({
          locId: response.data.location.locId,
          name: response.data.location.name,
        }));

        setQrScanned(true);
        setStopScanner(true);
        setShowScanner(false);
        setError('');
      }
    } catch (err) {
      console.error(' QR validation error:', err);
      setError('Invalid QR code. Please try again.');
      setQrScanned(false);
      setStopScanner(false);
    }
  };

  // Manual location selection from dropdown
  const handleCurrentLocationSelect = (e) => {
    const locId = parseInt(e.target.value);
    if (locId) {
      const selected = locations.find(l => l.locId === locId);
      if (selected) {
        setCurrentLocation({
          locId: selected.locId,
          name: selected.name,
          latitude: selected.latitude,
          longitude: selected.longitude,
        });
        setQrScanned(true);
        setShowScanner(false);
        setError('');
      }
    }
  };

  // Handle destination selection
  const handleDestinationSelect = (e) => {
    const locId = parseInt(e.target.value);
    if (locId) {
      const selected = locations.find(l => l.locId === locId);
      if (selected) {
        setDestination(selected);
        setError('');
      }
    } else {
      setDestination(null);
    }
  };

  // Fetch all locations from database
  useEffect(() => {
    const fetchAllLocations = async () => {
      try {
        setFetchingLocations(true);

        const adminId = localStorage.getItem('campusAdminId');
        //console.log(adminId, ": admin id");
        const url = adminId?
        `/navigation/locations?admin_id=${adminId}`
        :'/navigation/public-locations';

        console.log('Fetching locations from:', url);

        const response = await api.get(url);
        console.log(' Locations fetched:', response.data.length);
        setLocations(response.data);

      } catch (err) {
        console.error('Error fetching locations:', err);
        setError('Failed to load locations. Please refresh.');
      } finally {
        setFetchingLocations(false);
      }
    };
    fetchAllLocations();
  }, []);

  // Find route
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

      console.log(' API Response:', response.data);

      if (response.data.success) {
        setRoute(response.data);
        setIsNavigating(true);
        console.log('Route found!');
      } else {
        setError(response.data.message || 'No path found between these locations');
      }
    } catch (err) {
      console.error(' Navigation error:', err);
      if (err.response?.status === 404) {
        setError(err.response?.data?.message || 'No path found between these locations');
      } else {
        setError(err.response?.data?.error || 'Failed to find path');
      }
    } finally {
      setLoading(false);
    }
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setRoute(null);
  };

  // Get current position
  const getCurrentPosition = () => {
    if (gpsLocation) return { lat: gpsLocation.lat, lng: gpsLocation.lng };
    if (currentLocation) return { lat: currentLocation.latitude, lng: currentLocation.longitude };
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

  const getArrowDirection = () => {
    if (!route || !destination || heading === null) return 0;
    const currentPos = getCurrentPosition();
    if (!currentPos) return 0;

    const bearing = calculateBearing(
      currentPos.lat, currentPos.lng,
      destination.latitude, destination.longitude
    );

    let diff = bearing - heading;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff;
  };

  const distanceToFinal = getDistanceToDestination();
  const arrowRotation = getArrowDirection();

  if (fetchingLocations) {
    return <div className="loading">Loading locations...</div>;
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Campus Navigation</h1>
        <p>Find your way around campus</p>
      </header>

      {!isNavigating ? (
        <div className="home-section">
          {/* Current Location Dropdown */}
          <div className="location-section">
            <h3> Your Location</h3>
            {!qrScanned ? (
              <div>
                {/* QR Scanner Button */}
                <button
                  onClick={() => {
                    setShowScanner(true);
                    setStopScanner(false);
                  }}
                  className="scan-btn"
                >
                   Scan QR Code
                </button>

                {showScanner && (
                  <div style={{ marginTop: '10px' }}>
                    <QRScanner
                      onScanSuccess={handleQRScan}
                      onScanError={(err) => setError(err)}
                      stopScanner={stopScanner}
                    />
                    <button
                      onClick={() => {
                        setShowScanner(false);
                        setStopScanner(true);
                      }}
                      className="close-scanner-btn"
                    >
                       Close
                    </button>
                  </div>
                )}

                <p style={{ textAlign: 'center', margin: '10px 0', color: '#888' }}>
                  — OR select from dropdown —
                </p>

                <select
                  onChange={handleCurrentLocationSelect}
                  className="dropdown"
                  defaultValue=""
                >
                  <option value="">-- Select Current Location --</option>
                  {locations.map(loc => (
                    <option key={loc.locId} value={loc.locId}>
                      {loc.name} {loc.building ? `(${loc.building})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="selected-location">
                 {currentLocation?.name}
                <button onClick={() => {
                  setQrScanned(false);
                  setCurrentLocation(null);
                }} className="change-btn">
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Destination Dropdown */}
          <div className="destination-section">
            <h3> Destination</h3>
            <select
              onChange={handleDestinationSelect}
              className="dropdown"
              defaultValue=""
            >
              <option value="">-- Select Destination --</option>
              {locations.map(loc => (
                <option key={loc.locId} value={loc.locId}>
                  {loc.name} {loc.building ? `(${loc.building})` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={findRoute}
            disabled={!qrScanned || !destination || loading}
            className="find-route-btn"
          >
            {loading ? 'Finding...' : ' Navigate'}
          </button>

          {error && <div className="error">{error}</div>}
        </div>
      ) : (
        <div className="navigation-view">
          <div className="nav-header">
            <span>🚶 {destination?.name}</span>
            <button onClick={stopNavigation} className="stop-btn">✕</button>
          </div>

          <div className="arrow-container">
            <div
              className="arrow-big"
              style={{ transform: `rotate(${arrowRotation}deg)` }}
            >
              ⬆️
            </div>
            <p>Point your phone at the arrow</p>
          </div>

          <div className="info-card">
            <div className="instruction">
              {distanceToFinal !== null ? `${Math.round(distanceToFinal)}m to destination` : 'Calculating...'}
            </div>
            <div className="distance">
              Total: {route?.totalDistance || 0}m
            </div>
          </div>

          {permission === 'prompt' && (
            <button onClick={requestPermission} className="compass-btn">
               Enable Compass
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;