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

    const handleQRScan = async (qrHash) => {
        try {
            const response = await api.post('/navigation/validate-qr', { qrHash });
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
            }
        } catch (err) {
            setError('Invalid QR code');
        }
    };

    const handleManualLocation = (loc) => {
        setCurrentLocation({
            locId: loc.locId,
            name: loc.name,
            latitude: loc.latitude,
            longitude: loc.longitude,
        });
        setQrScanned(true);
        setShowScanner(false);
    };

    const handleDestinationSelect = (e) => {
        const locId = parseInt(e.target.value);
        const selected = locations.find(l => l.locId === locId);
        setDestination(selected);
    };

    const findRoute = async () => {
        if (!currentLocation || !destination) {
            setError('Please select both current location and destination');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/navigation/shortest-path', {
                startId: currentLocation.locId,
                endId: destination.locId
            });
            setRoute(response.data);
            setIsNavigating(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to find path');
        } finally {
            setLoading(false);
        }
    };

    const stopNavigation = () => {
        setIsNavigating(false);
        setRoute(null);
    };

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

    return (
        <div className="home-container">
            <header className="home-header">
                <h1>🏛️ Campus Navigation</h1>
                <p>Find your way around campus</p>
            </header>

            {!isNavigating ? (
                <div className="home-section">
                    <div className="location-section">
                        <h3>📍 Your Location</h3>
                        {!qrScanned ? (
                            <div>
                                <button
                                    onClick={() => {
                                        setShowScanner(true);
                                        setStopScanner(false);
                                    }}
                                    className="scan-btn"
                                >
                                    📷 Scan QR Code
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
                                            ❌ Close
                                        </button>
                                    </div>
                                )}

                                <p style={{ textAlign: 'center', margin: '10px 0', color: '#888' }}>
                                    — OR —
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
                                ✅ {currentLocation?.name}
                                <button onClick={() => {
                                    setQrScanned(false);
                                    setCurrentLocation(null);
                                }} className="change-btn">
                                    Change
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="destination-section">
                        <h3>🎯 Destination</h3>
                        <select
                            onChange={handleDestinationSelect}
                            className="dropdown"
                            defaultValue=""
                        >
                            <option value="">-- Select --</option>
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
                        {loading ? 'Finding...' : '🧭 Navigate'}
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
                            🧭 Enable Compass
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default Home;