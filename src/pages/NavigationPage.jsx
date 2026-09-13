import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useGeolocation } from '../hooks/useGeolocation';
import { useCompass } from '../hooks/useCompass';
import { calculateBearing, calculateDistance } from '../utils/bearing';
import QRScanner from '../components/QRScanner';
import './NavigationPage.css';
import "remixicon/fonts/remixicon.css";
import ARArrow from '../components/ARArrow';
import { smoothAngle } from '../utils/smoothing';

const NavigationPage = () => {
    // ============ STATE ============
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
    const [isScanning, setIsScanning] = useState(false);
    const [navigationMode, setNavigationMode] = useState('text');
    const [fetchingLocations, setFetchingLocations] = useState(true);
    const [smoothedHeading, setSmoothedHeading] = useState(null);

    // ============ HOOKS ============
    const { location: gpsLocation } = useGeolocation();
    const { heading, permission, requestPermission } = useCompass();
    useEffect(() => {
        if (heading === null) return;
        setSmoothedHeading(prev => smoothAngle(prev, heading, 0.15));
    }, [heading]);


    // ============ FETCH LOCATIONS ============
    const fetchLocations = async () => {
        try {
            setFetchingLocations(true);
            const adminId = localStorage.getItem('campusAdminId');
            const url = adminId
                ? `/navigation/locations?admin_id=${adminId}`
                : '/navigation/public-locations';

            const res = await api.get(url);
            console.log('📍 All locations:', res.data);
            setLocations(res.data);
        } catch (err) {
            console.error('Error fetching locations:', err);
            setError('Failed to load locations');
        } finally {
            setFetchingLocations(false);
        }
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    // ============ START SCANNING ============
    const startScanning = () => {
        setShowScanner(true);
        setStopScanner(false);
        setIsScanning(true);
        setError('');
    };

    const cancelScanning = () => {
        setShowScanner(false);
        setStopScanner(true);
        setIsScanning(false);
    };

    // ============ QR SCAN HANDLER ============
    const handleQRScan = async (qrHash) => {
        console.log('📱 QR Scanned:', qrHash);
        try {
            const response = await api.post('/navigation/validate-qr', { qrHash });
            console.log('📡 QR Validation Response:', response.data);

            if (response.data.success) {
                const adminId = response.data.adminId || response.data.location?.admin_id;
                if (adminId) {
                    localStorage.setItem('campusAdminId', adminId);
                    await fetchLocations();
                }

                const loc = locations.find(l => l.locId === response.data.location.locId);
                if (loc) {
                    setCurrentLocation({
                        locId: loc.locId,
                        name: loc.name,
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                    });
                } else {
                    setCurrentLocation({
                        locId: response.data.location.locId,
                        name: response.data.location.name,
                        latitude: response.data.location.latitude,
                        longitude: response.data.location.longitude,
                    });
                }
                setQrScanned(true);
                setShowScanner(false);
                setStopScanner(true);
                setIsScanning(false);
                setError('');
            }
        } catch (err) {
            console.error('QR validation error:', err);
            setError('Invalid QR code. Please try again.');
            setQrScanned(false);
        }
    };

    // ============ MANUAL LOCATION SELECTION ============
    const handleManualLocation = (loc) => {
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

    const resetLocation = () => {
        setCurrentLocation(null);
        setQrScanned(false);
        setShowScanner(false);
        setError('');
    };

    // ============ DESTINATION SELECTION ============
    const handleDestinationSelect = (e) => {
        const locId = parseInt(e.target.value);
        const selected = locations.find(l => l.locId === locId);
        setDestination(selected);
        setError('');
    };

    // ============ FIND ROUTE (FIXED for new API structure) ============
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

            console.log('📡 Full API Response:', response.data);

            if (response.data.success) {
                const data = response.data;

                // ✅ NORMALIZE the response to match frontend expectations
                const normalizedRoute = {
                    // Basic info
                    from: data.path?.[0]?.name || currentLocation.name,
                    to: data.path?.[data.path.length - 1]?.name || destination.name,
                    totalDistance: data.totalDistanceMeters || 0,
                    estimatedTime: data.estimatedWalkTimeMinutes || 0,

                    // Path nodes (array of node objects)
                    pathNodes: (data.path || []).map(node => ({
                        node_id: node.nodeId,
                        node_name: node.name,
                        latitude: node.latitude,
                        longitude: node.longitude,
                        building: node.building,
                        floor: node.floor
                    })),

                    // Directions (normalized from new structure)
                    directions: (data.directions || []).map(dir => ({
                        from: dir.fromNodeId,
                        to: dir.toNodeId,
                        direction: dir.instruction || 'Continue walking',
                        distance: 0 // Not provided by new API; can be calculated if needed
                    })),

                    // Raw data for debugging
                    raw: data
                };

                console.log('✅ Normalized route:', normalizedRoute);
                setRoute(normalizedRoute);
                setIsNavigating(true);
            } else {
                setError(response.data.message || 'No path found');
            }
        } catch (err) {
            console.error('Navigation error:', err);
            setError(err.response?.data?.message || err.response?.data?.error || 'Failed to find path');
        } finally {
            setLoading(false);
        }
    };

    // ============ STOP NAVIGATION ============
    const stopNavigation = () => {
        setIsNavigating(false);
        setRoute(null);
        setCurrentStepIndex(0);
        setArrived(false);
    };

    // ============ GET POSITION ============
    const getCurrentPosition = () => {
        if (gpsLocation) {
            return { lat: gpsLocation.lat, lng: gpsLocation.lng };
        }
        if (currentLocation) {
            return { lat: currentLocation.latitude, lng: currentLocation.longitude };
        }
        return null;
    };

    // ============ DISTANCE TO DESTINATION ============
    const getDistanceToDestination = () => {
        if (!destination) return null;
        const currentPos = getCurrentPosition();
        if (!currentPos) return null;
        return calculateDistance(
            currentPos.lat, currentPos.lng,
            destination.latitude, destination.longitude
        );
    };
    const getArrowRotation = () => {
        if (!route || !destination || smoothedHeading === null) return 0;
        const currentPos = getCurrentPosition();
        if (!currentPos) return 0;

        const bearing = calculateBearing(
            currentPos.lat, currentPos.lng,
            destination.latitude, destination.longitude
        );

        let diff = bearing - smoothedHeading;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        return diff;
    };

    // ============ GET CURRENT STEP ============
    const getCurrentStep = () => {
        if (!route || !route.directions || currentStepIndex >= route.directions.length) {
            return null;
        }
        return route.directions[currentStepIndex];
    };

    // ============ CHECK ARRIVAL ============
    useEffect(() => {
        if (!isNavigating || !route || arrived) return;

        const dist = getDistanceToDestination();

        // ✅ Arrival check (15 m threshold)
        if (dist !== null && dist < 15) {
            if (currentStepIndex < route.directions.length - 1) {
                setCurrentStepIndex(prev => prev + 1);
                // ✅ Buzz when moving to next waypoint
                if ('vibrate' in navigator) navigator.vibrate(100);
            } else {
                setArrived(true);
                setIsNavigating(false);
                // ✅ Buzz pattern on arrival
                if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
            }
        }
    }, [gpsLocation, heading, isNavigating, route, currentStepIndex, arrived]);

    const distanceToFinal = getDistanceToDestination();
    const arrowRotation = getArrowRotation();

    if (fetchingLocations) {
        return <div className="loading">Loading locations...</div>;
    }

    return (

        <div>
            <div className="nav-page">
                {/* HEADER */}
                <header className="nav-header">
                    <h1>🧭 Directions</h1>
                    <p>Start: {currentLocation?.name || 'Not selected'}</p>
                    <p>End: {destination?.name || 'Not selected'}</p>
                </header>

                {/* LOCATION SELECTION */}
                {!isNavigating && !arrived && (
                    <div className="location-section">
                        <div className="qr-section">
                            {!qrScanned ? (
                                <>
                                    {!showScanner ? (
                                        <button onClick={startScanning} className="scan-btn">
                                            📷 Scan QR Code
                                        </button>
                                    ) : (
                                        <div className="scanner-container">
                                            <div className="scanner-header">
                                                <span>📷 Scanning...</span>
                                                <button onClick={cancelScanning} className="cancel-scan-btn">
                                                    ✕ Cancel
                                                </button>
                                            </div>
                                            <QRScanner
                                                onScanSuccess={handleQRScan}
                                                onScanError={(err) => setError(err)}
                                                stopScanner={stopScanner}
                                            />
                                        </div>
                                    )}
                                    <div className="divider">— OR —</div>
                                </>
                            ) : (
                                <div className="location-confirmed">
                                    <span>✅ Current: <strong>{currentLocation?.name}</strong></span>
                                    <div className="location-actions">
                                        <button onClick={resetLocation} className="change-btn">
                                            Rescan
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="manual-select">
                            <label>📍 Your Location</label>
                            <select
                                onChange={(e) => {
                                    const loc = locations.find(l => l.locId === parseInt(e.target.value));
                                    if (loc) handleManualLocation(loc);
                                }}
                                className="dropdown"
                                value={currentLocation?.locId || ""}
                            >
                                <option value="">-- Select Current Location --</option>
                                {locations.map(loc => (
                                    <option key={loc.locId} value={loc.locId}>
                                        {loc.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="dest-select">
                            <label>🎯 Destination</label>
                            <select
                                onChange={handleDestinationSelect}
                                className="dropdown"
                                value={destination?.locId || ""}
                            >
                                <option value="">-- Select Destination --</option>
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
                            className="find-btn"
                        >
                            {loading ? '⏳ Finding path...' : '🗺️ Find Path'}
                        </button>

                        {error && <div className="error">{error}</div>}
                    </div>
                )}

                {/* NAVIGATION VIEW */}
                {isNavigating && route && !arrived && (
                    <div className="nav-view">
                        {/* MODE SWITCH */}
                        <div className="mode-switch">
                            <button
                                className={navigationMode === 'text' ? 'active' : ''}
                                onClick={() => setNavigationMode('text')}
                            >
                                📝 Text
                            </button>
                            <button
                                className={navigationMode === 'ar' ? 'active' : ''}
                                onClick={() => setNavigationMode('ar')}
                            >
                                🧭 AR Arrow
                            </button>
                        </div>

                        {/* TEXT DIRECTIONS */}
                        {navigationMode === 'text' && (
                            <div className="text-directions">
                                <div className="route-header">
                                    <span className="route-from">📍 {route.from}</span>
                                    <span className="route-arrow">→</span>
                                    <span className="route-to">🎯 {route.to}</span>
                                </div>

                                <div className="directions-list">
                                    {route.directions && route.directions.length > 0 ? (
                                        route.directions.map((dir, index) => (
                                            <div
                                                key={index}
                                                className={`direction-step ${index === currentStepIndex ? 'active' : ''} ${index < currentStepIndex ? 'completed' : ''}`}
                                            >
                                                <span className="step-num">{index + 1}</span>
                                                <div className="step-content">
                                                    <span className="step-icon">
                                                        {dir.direction?.toLowerCase().includes('left') ? '↩️' :
                                                            dir.direction?.toLowerCase().includes('right') ? '↪️' :
                                                                dir.direction?.toLowerCase().includes('straight') ? '⬆️' : '🚶'}
                                                    </span>
                                                    <span className="step-text">{dir.direction}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="no-directions">
                                            ⚠️ No directions available
                                        </div>
                                    )}
                                </div>

                                <div className="route-summary">
                                    <div className="summary-item">
                                        <span>Total Distance</span>
                                        <span>{route.totalDistance}m</span>
                                    </div>
                                    <div className="summary-item">
                                        <span>Remaining</span>
                                        <span>
                                            {distanceToFinal !== null ? `${Math.round(distanceToFinal)}m` : '...'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* AR ARROW VIEW */}
                        {navigationMode === 'ar' && (
                            <div className="ar-view">
                                {/* ✅ 3D AR Arrow */}
                                <ARArrow
                                    rotation={arrowRotation}
                                    distance={distanceToFinal}
                                    isClose={distanceToFinal !== null && distanceToFinal < 30}
                                />

                                <p className="ar-hint">Point your phone in the direction of the arrow</p>

                                {smoothedHeading !== null && (
                                    <p className="ar-heading">🧭 Heading: {Math.round(smoothedHeading)}°</p>
                                )}

                                <div className="ar-info">
                                    <div className="ar-dest">
                                        <span>Destination</span>
                                        <strong>{destination?.name}</strong>
                                    </div>
                                    <div className="ar-dist">
                                        <span>Distance</span>
                                        <strong>
                                            {distanceToFinal !== null ? `${Math.round(distanceToFinal)}m` : '...'}
                                        </strong>
                                    </div>
                                </div>

                                {permission === 'prompt' && (
                                    <button onClick={requestPermission} className="compass-btn">
                                        🧭 Enable Compass
                                    </button>
                                )}
                            </div>
                        )}

                        {/* STOP BUTTON */}
                        <button onClick={stopNavigation} className="stop-btn">
                            ✕ Stop Navigation
                        </button>
                    </div>
                )}

                {/* ARRIVAL VIEW */}
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
        </div>

    );

};

export default NavigationPage;