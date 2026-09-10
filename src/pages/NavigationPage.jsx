import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useGeolocation } from '../hooks/useGeolocation';
import { useCompass } from '../hooks/useCompass';
import { calculateBearing, calculateDistance } from '../utils/bearing';
import QRScanner from '../components/QRScanner';
import './NavigationPage.css';

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

    // ============ HOOKS ============
    const { location: gpsLocation } = useGeolocation();
    const { heading, permission, requestPermission } = useCompass();

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

    // Initial fetch on mount
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

    // ============ CANCEL SCANNING ============
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
                    console.log('Admin ID stored:', adminId);
                    
                    // ✅ AFTER QR SCAN - RELOAD LOCATIONS
                    await fetchLocations();
                    console.log('🔄 Locations reloaded after QR scan');
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
                console.log('✅ QR Validated:', response.data.location.name);
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

    // ============ RESET LOCATION ============
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

    // ============ FIND ROUTE ============
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

            if (response.data.success) {
                setRoute(response.data);
                setIsNavigating(true);
            } else {
                setError(response.data.message || 'No path found');
            }
        } catch (err) {
            console.error('Navigation error:', err);
            setError(err.response?.data?.message || 'Failed to find path');
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

    // ============ ARROW ROTATION ============
    const getArrowRotation = () => {
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
        if (dist !== null && dist < 10) {
            if (currentStepIndex < route.directions.length - 1) {
                setCurrentStepIndex(prev => prev + 1);
            } else {
                setArrived(true);
                setIsNavigating(false);
            }
        }
    }, [gpsLocation, heading, isNavigating, route, currentStepIndex, arrived]);

    const distanceToFinal = getDistanceToDestination();
    const arrowRotation = getArrowRotation();
    const currentStep = getCurrentStep();

    if (fetchingLocations) {
        return <div className="loading">Loading locations...</div>;
    }

    return (
        <div className="nav-page">
            {/* ============ HEADER ============ */}
            <header className="nav-header">
                <h1>🧭 Directions</h1>
                <p>Start: {currentLocation?.name || 'Not selected'}</p>
                <p>End: {destination?.name || 'Not selected'}</p>
            </header>

            {/* ============ LOCATION SELECTION ============ */}
            {!isNavigating && !arrived && (
                <div className="location-section">
                    {/* ============ QR SCANNER SECTION ============ */}
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

                    {/* ============ MANUAL LOCATION SELECTION ============ */}
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

                    {/* ============ DESTINATION SELECTION ============ */}
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

            {/* ============ NAVIGATION VIEW ============ */}
            {isNavigating && route && !arrived && (
                <div className="nav-view">
                    {/* ============ MODE SWITCH ============ */}
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

                    {/* ============ TEXT DIRECTIONS ============ */}
                    {navigationMode === 'text' && (
                        <div className="text-directions">
                            <div className="route-header">
                                <span className="route-from">📍 {route.from}</span>
                                <span className="route-arrow">→</span>
                                <span className="route-to">🎯 {route.to}</span>
                            </div>

                            <div className="directions-list">
                                {route.directions?.map((dir, index) => (
                                    <div
                                        key={index}
                                        className={`direction-step ${index === currentStepIndex ? 'active' : ''} ${index < currentStepIndex ? 'completed' : ''}`}
                                    >
                                        <span className="step-num">{index + 1}</span>
                                        <div className="step-content">
                                            <span className="step-icon">
                                                {dir.direction?.includes('left') ? '↩️' :
                                                    dir.direction?.includes('right') ? '↪️' :
                                                        dir.direction?.includes('straight') ? '⬆️' : '📍'}
                                            </span>
                                            <span className="step-text">{dir.direction}</span>
                                            <span className="step-dist">{dir.distance}m</span>
                                        </div>
                                    </div>
                                ))}
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

                    {/* ============ AR ARROW VIEW ============ */}
                    {navigationMode === 'ar' && (
                        <div className="ar-view">
                            <div className="ar-container">
                                <div
                                    className="ar-arrow"
                                    style={{ transform: `rotate(${arrowRotation}deg)` }}
                                >
                                    ⬆️
                                </div>
                                <p className="ar-hint">Point your phone in the direction of the arrow</p>
                                {heading !== null && (
                                    <p className="ar-heading">🧭 Heading: {Math.round(heading)}°</p>
                                )}
                            </div>

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

                    {/* ============ STOP BUTTON ============ */}
                    <button onClick={stopNavigation} className="stop-btn">
                        ✕ Stop Navigation
                    </button>
                </div>
            )}

            {/* ============ ARRIVAL VIEW ============ */}
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

export default NavigationPage;