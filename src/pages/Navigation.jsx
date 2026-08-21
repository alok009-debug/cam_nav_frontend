import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useGeolocation } from '../hooks/useGeolocation';
import { useCompass } from '../hooks/useCompass';
import { calculateBearing, calculateDistance } from '../utils/bearing';
import QRScanner from '../components/QRScanner';
import './Navigation.css';

const Navigation = () => {
    // State
    const [locations, setLocations] = useState([]);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [destination, setDestination] = useState(null);
    const [route, setRoute] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isNavigating, setIsNavigating] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [arrived, setArrived] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [stopScanner, setStopScanner] = useState(false);
    const [qrScanned, setQrScanned] = useState(false);

    // Hooks
    const { location: gpsLocation } = useGeolocation();
    const { heading, permission, requestPermission } = useCompass();

    // Available test locations
    const testLocations = [
        { locId: 30, name: 'Hostel stairs', latitude: 23.38236340, longitude: 85.33152920 },
        { locId: 31, name: 'Rooftop solars', latitude: 23.38236170, longitude: 85.33154330 },
        { locId: 32, name: 'Grass lands', latitude: 23.38231500, longitude: 85.33163000 },
    ];

    // Fetch locations on load
    useEffect(() => {
        setLocations(testLocations);
    }, []);

    // Handle QR scan success
    const handleQRScan = async (qrHash) => {
        console.log('📱 QR Scanned:', qrHash);

        try {
            const response = await api.post('/navigation/validate-qr', { qrHash });
            console.log('📡 QR Validation Response:', response.data);

            if (response.data.success) {
                setCurrentLocation({
                    locId: response.data.location.locId,
                    name: response.data.location.name,
                    latitude: response.data.location.latitude,
                    longitude: response.data.location.longitude,
                });
                setQrScanned(true);
                setStopScanner(true);
                setShowScanner(false);
                setError('');
                console.log('✅ QR Validated:', response.data.location.name);
            }
        } catch (err) {
            console.error('❌ QR validation error:', err);
            setError('Invalid QR code. Please try again.');
            setQrScanned(false);
            setStopScanner(false);
        }
    };

    // Manual location selection
    const handleManualLocation = (loc) => {
        console.log('📍 Manual location selected:', loc.name);
        setCurrentLocation({
            locId: loc.locId,
            name: loc.name,
            latitude: loc.latitude,
            longitude: loc.longitude,
        });
        setQrScanned(true);
        setShowScanner(false);
        setError('');
    };

    // Handle destination selection
    const handleDestinationSelect = (e) => {
        const locId = parseInt(e.target.value);
        const selected = locations.find(l => l.locId === locId);
        setDestination(selected);
        setError('');
    };

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
        setArrived(false);
    };

    // Get current position
    const getCurrentPosition = () => {
        if (gpsLocation) {
            return { lat: gpsLocation.lat, lng: gpsLocation.lng };
        }
        if (currentLocation) {
            return { lat: currentLocation.latitude, lng: currentLocation.longitude };
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
    const distanceToNext = getDistanceToNext();
    const arrowRotation = getArrowDirection();

    return (
        <div className="nav-container">
            <header className="nav-header">
                <h1>🧭 Campus Navigation</h1>
                <p>Select your current location and destination</p>
            </header>

            {/* Location Selection */}
            {!isNavigating && !arrived && (
                <div className="location-section">
                    <div className="current-location">
                        <h3>📍 Your Current Location</h3>
                        {!qrScanned ? (
                            <div>
                                {/* ✅ QR Scanner Button */}
                                <button
                                    onClick={() => {
                                        console.log('📷 Opening QR scanner...');
                                        setShowScanner(true);
                                        setStopScanner(false);
                                        setError('');
                                    }}
                                    className="scan-btn"
                                >
                                    📷 Scan QR Code
                                </button>

                                {/* ✅ QR Scanner Component */}
                                {showScanner && (
                                    <div style={{ marginTop: '15px' }}>
                                        <QRScanner
                                            onScanSuccess={handleQRScan}
                                            onScanError={(err) => {
                                                console.error('QR Error:', err);
                                                setError(err);
                                            }}
                                            stopScanner={stopScanner}
                                        />
                                        <button
                                            onClick={() => {
                                                console.log('❌ Closing scanner...');
                                                setShowScanner(false);
                                                setStopScanner(true);
                                            }}
                                            className="close-scanner-btn"
                                        >
                                            ❌ Close Scanner
                                        </button>
                                    </div>
                                )}

                                <p style={{ textAlign: 'center', margin: '10px 0', color: '#888' }}>
                                    — OR select manually —
                                </p>

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
                                </div>
                            </div>
                        ) : (
                            <div className="selected-location">
                                ✅ Current: <strong>{currentLocation?.name}</strong>
                                <button onClick={() => {
                                    setQrScanned(false);
                                    setCurrentLocation(null);
                                    setShowScanner(false);
                                }} className="change-btn">
                                    Change
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Destination Selection */}
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

                    {/* Find Route Button */}
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

            {/* Navigation View */}
            {isNavigating && route && !arrived && (
                <div className="nav-view">
                    <div className="nav-header-bar">
                        <div className="nav-info">
                            <span className="destination">🚶 {route.to}</span>
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
                        {heading !== null && (
                            <p className="compass-reading">🧭 Heading: {Math.round(heading)}°</p>
                        )}
                    </div>

                    {/* Instruction Card */}
                    <div className="instruction-card">
                        <div className="instruction-icon">
                            {currentStep?.direction?.includes('left') ? '↩️' :
                                currentStep?.direction?.includes('right') ? '↪️' :
                                currentStep?.direction?.includes('stairs') ? '🪜' : '⬆️'}
                        </div>
                        <div className="instruction-text">
                            <div className="action">{currentStep?.direction || 'Continue walking'}</div>
                            <div className="detail">
                                {distanceToNext !== null ? `${distanceToNext}m to next point` : 'Calculating...'}
                            </div>
                        </div>
                    </div>

                    {/* Distance & Bearing */}
                    <div className="nav-stats">
                        <div className="stat">
                            <span className="stat-label">Total Distance</span>
                            <span className="stat-value">{route.totalDistance}m</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Remaining</span>
                            <span className="stat-value">
                                {distanceToNext !== null ? `${distanceToNext}m` : '...'}
                            </span>
                        </div>
                    </div>

                    {/* Mini Map */}
                    <div className="mini-map">
                        <div className="path-visual">
                            {route.pathNodes.map((node, index) => (
                                <div
                                    key={node.node_id}
                                    className={`path-dot ${index <= currentStepIndex ? 'visited' : ''} ${index === currentStepIndex ? 'current' : ''}`}
                                >
                                    <span className="dot-label">{index + 1}</span>
                                </div>
                            ))}
                        </div>
                        <div className="path-labels">
                            {route.pathNodes.map((node, index) => (
                                <span key={node.node_id} className={`label ${index === currentStepIndex ? 'active' : ''}`}>
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

                    {/* Debug Info */}
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
                        <p>distance: {distanceToNext !== null ? `${distanceToNext}m` : '❌'}</p>
                    </div>
                </div>
            )}

            {/* Arrival View */}
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