import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api/config';
import QRScanner from '../components/QRScanner';
import CameraPermission from '../components/CameraPermission';
import { useGeolocation } from '../hooks/useGeolocation';
import { useCompass } from '../hooks/useCompass';
import { calculateBearing, calculateDistance } from '../utils/bearing';
import './Home.css';

const Home = () => {
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [currentLocation, setCurrentLocation] = useState(null);
    const [destination, setDestination] = useState(null);
    const [isNavigating, setIsNavigating] = useState(false);
    const [qrScanned, setQrScanned] = useState(false);
    const [stopScanner, setStopScanner] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [navigationData, setNavigationData] = useState(null);
    const [arrived, setArrived] = useState(false);

    const { location: gpsLocation } = useGeolocation();
    const { heading, permission, requestPermission } = useCompass();

    // Fetch locations
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/navigation/locations`);
                setLocations(res.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching locations:', err);
                setError('Failed to load locations');
                setLoading(false);
            }
        };
        fetchLocations();
    }, []);

    // Handle camera permission
    const handleCameraPermissionGranted = () => {
        console.log('✅ Camera permission granted');
        setCameraReady(true);
    };

    const handleCameraPermissionDenied = (error) => {
        console.error('❌ Camera permission denied:', error);
        setError('Camera access is required to scan QR codes. Please allow camera access in your browser settings.');
        setCameraReady(false);
    };

    // Handle QR scan
    const handleQRScan = useCallback(async (qrHash) => {
        try {
            const res = await axios.post(`${API_BASE_URL}/navigation/validate-qr`, { qrHash });
            if (res.data.success) {
                setCurrentLocation({
                    lat: res.data.location.latitude,
                    lng: res.data.location.longitude,
                    name: res.data.location.name,
                    locId: res.data.location.locId,
                });
                setQrScanned(true);
                setStopScanner(true);
                setShowScanner(false);
                setError('');
            }
        } catch (err) {
            setError('Invalid QR code');
            setQrScanned(false);
            setStopScanner(false);
        }
    }, []);

    // Manual location selection
    const handleManualLocation = useCallback((loc) => {
        setCurrentLocation({
            lat: loc.latitude,
            lng: loc.longitude,
            name: loc.name,
            locId: loc.locId,
        });
        setQrScanned(true);
        setStopScanner(true);
        setShowScanner(false);
        setError('');
    }, []);

    // Handle destination selection
    const handleDestinationSelect = useCallback((e) => {
        const locId = e.target.value;
        if (locId) {
            const selected = locations.find(l => l.locId === parseInt(locId));
            setDestination(selected);
            setSelectedLocation(locId);
            setError('');
        } else {
            setDestination(null);
            setSelectedLocation('');
        }
    }, [locations]);

    // Start navigation
    const startNavigation = () => {
        if (!destination) {
            setError('Please select a destination');
            return;
        }
        if (!currentLocation) {
            setError('Please scan your current location first');
            return;
        }
        setIsNavigating(true);
        setError('');
        setArrived(false);
    };

    // Navigation updates
    useEffect(() => {
        if (!isNavigating || !destination || !currentLocation) return;

        const updateNavigation = () => {
            const startLat = gpsLocation?.lat || currentLocation.lat;
            const startLng = gpsLocation?.lng || currentLocation.lng;

            const bearing = calculateBearing(
                startLat, startLng,
                destination.latitude, destination.longitude
            );
            const distance = calculateDistance(
                startLat, startLng,
                destination.latitude, destination.longitude
            );

            let arrowRotation = 0;
            if (heading !== null) {
                let diff = bearing - heading;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                arrowRotation = diff;
            }

            if (distance < 5 && !arrived) {
                setArrived(true);
                setIsNavigating(false);
                alert(`🎉 You have arrived at ${destination.name}!`);
            }

            setNavigationData({ bearing, distance, arrowRotation });
        };

        updateNavigation();
        const interval = setInterval(updateNavigation, 1000);
        return () => clearInterval(interval);
    }, [isNavigating, destination, currentLocation, gpsLocation, heading, arrived]);

    if (loading) return <div className="loading">Loading campus locations...</div>;

    // Mock GPS for testing
    const mockGPS = () => {
        // Simulate GPS update
        const mockLat = 28.613939 + (Math.random() - 0.5) * 0.001;
        const mockLng = 77.209021 + (Math.random() - 0.5) * 0.001;
        console.log('📍 Mock GPS:', mockLat, mockLng);
        // You'll need to manually set this in state
    };

    // Mock Compass for testing
    const mockCompass = () => {
        const mockHeading = Math.random() * 360;
        console.log('🧭 Mock Compass:', mockHeading);
        // You'll need to manually set this in state
    };


    return (
        <div className="home-container">
            <header className="header">
                <h1>🏛️ Campus Navigation</h1>
                <p>Scan QR or select destination to start</p>
            </header>

            {/* Current Location */}
            <section className="section">
                <h2>📍 Your Current Location</h2>

                {!qrScanned ? (
                    <div>
                        <button
                            onClick={() => {
                                setShowScanner(true);
                                setStopScanner(false);
                                setError('');
                            }}
                            className="scan-btn"
                        >
                            📷 Scan QR Code
                        </button>

                        {/* <div style={{ marginTop: '10px' }}>
                            <p style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>— OR select manually —</p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
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
                        </div> */}

                        {error && <p className="error">{error}</p>}
                    </div>
                ) : (
                    <div className="location-confirmed">
                        <span>✅ Current: {currentLocation?.name}</span>
                        <button
                            onClick={() => {
                                setQrScanned(false);
                                setStopScanner(false);
                                setShowScanner(false);
                                setCurrentLocation(null);
                                setIsNavigating(false);
                                setNavigationData(null);
                            }}
                            className="rescan-btn"
                        >
                            Change
                        </button>
                    </div>
                )}

                {showScanner && !qrScanned && (
                    <div style={{ marginTop: '15px' }}>
                        {!cameraReady && (
                            <CameraPermission
                                onPermissionGranted={handleCameraPermissionGranted}
                                onPermissionDenied={handleCameraPermissionDenied}
                            />
                        )}

                        {cameraReady && (
                            <>
                                <QRScanner
                                    onScanSuccess={handleQRScan}
                                    onScanError={(err) => setError(err)}
                                    stopScanner={stopScanner}
                                    cameraReady={cameraReady}
                                />
                                <button
                                    onClick={() => {
                                        setShowScanner(false);
                                        setStopScanner(true);
                                    }}
                                    className="close-scanner-btn"
                                >
                                    ❌ Close Scanner
                                </button>
                            </>
                        )}
                    </div>
                )}
            </section>

            {/* Destination */}
            <section className="section">
                <h2>🎯 Select Destination</h2>
                <select
                    value={selectedLocation}
                    onChange={handleDestinationSelect}
                    className="dropdown"
                >
                    <option value="">-- Choose a destination --</option>
                    {locations.map(loc => (
                        <option key={loc.locId} value={loc.locId}>
                            {loc.name} {loc.building ? `(${loc.building})` : ''}
                        </option>
                    ))}
                </select>

                <button
                    onClick={startNavigation}
                    disabled={!selectedLocation || !qrScanned}
                    className="nav-btn"
                >
                    🧭 Start Navigation
                </button>
            </section>

            {/* Compass Permission - Show prominently */}
            {permission !== 'granted' && (
                <section className="section">
                    <h2>🧭 Compass Access Required</h2>
                    <p style={{ color: '#666', fontSize: '14px' }}>
                        Compass is needed for the AR arrow to point in the right direction
                    </p>
                    <button
                        onClick={requestPermission}
                        className="compass-btn"
                        style={{
                            padding: '14px 30px',
                            background: '#f39c12',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            width: '100%',
                        }}
                    >
                        🧭 Enable Compass
                    </button>
                    {error && <p className="error">{error}</p>}
                </section>
            )}

            {/* Debug Info */}
            <div style={{
                fontSize: '12px',
                color: '#888',
                marginTop: '20px',
                padding: '15px',
                background: '#f5f5f5',
                borderRadius: '8px',
                border: '1px solid #ddd',
            }}>
                <p><strong>🔍 Debug Info:</strong></p>
                <p>📷 Camera Ready: {cameraReady ? '✅' : '❌'}</p>
                <p>🧭 Compass: {heading !== null ? `${heading.toFixed(1)}°` : '❌ Waiting...'}</p>
                <p>📍 GPS: {gpsLocation ? `${gpsLocation.lat.toFixed(6)}, ${gpsLocation.lng.toFixed(6)}` : '❌ Waiting...'}</p>
                <p>🎯 Destination: {destination ? destination.name : '❌ None'}</p>
                <p>🚶 Navigating: {isNavigating ? '✅' : '❌'}</p>
                <p>📱 Device: {/Mobi|Android|iPhone/i.test(navigator.userAgent) ? '📱 Mobile' : '💻 Desktop'}</p>
                <p style={{ fontSize: '10px', color: '#aaa', marginTop: '5px' }}>
                    🔄 Arrow rotation: {navigationData ? `${navigationData.arrowRotation.toFixed(1)}°` : '0°'}
                </p>
                // Add to debug info
                <p>🎯 Distance: {navigationData ? `${Math.round(navigationData.distance)} m` : '0 m'}</p>
                <p>📍 Bearing: {navigationData ? `${Math.round(navigationData.bearing)}°` : '0°'}</p>
            </div>

            {/* Navigation */}
            {isNavigating && destination && navigationData && (
                <section className="nav-section">
                    <h2>🚶 Navigating to: {destination.name}</h2>
                    <div className="nav-info">
                        <div className="distance">
                            <span>Distance:</span>
                            <span>{Math.round(navigationData.distance)} m</span>
                        </div>
                        <div className="bearing">
                            <span>Direction:</span>
                            <span>{Math.round(navigationData.bearing)}°</span>
                        </div>
                        <div className="arrow-container">
                            <div
                                className="arrow"
                                style={{ transform: `rotate(${navigationData.arrowRotation}deg)` }}
                            >
                                ⬆️
                            </div>
                            <p>Point your phone in the direction of the arrow</p>
                        </div>
                        <button onClick={() => setIsNavigating(false)} className="stop-btn">
                            Stop Navigation
                        </button>
                    </div>
                </section>
            )}

            {/* Compass Permission */}
            {permission === 'prompt' && (
                <section className="section">
                    <h2>🧭 Compass Access</h2>
                    <button onClick={requestPermission} className="compass-btn">
                        🧭 Enable Compass for AR
                    </button>
                </section>
            )}
        </div>
    );


};

export default Home;