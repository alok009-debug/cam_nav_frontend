import { useState, useEffect } from 'react';
import api from '../api/axios';
import './SimpleTest.css';

const SimpleTest = () => {
    // ============ STATE ============
    const [locations, setLocations] = useState([]);
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [gettingLocation, setGettingLocation] = useState(false);
    const [locationError, setLocationError] = useState('');
    
    // ============ ADD LOCATION FORM ============
    const [locationForm, setLocationForm] = useState({
        name: '',
        admin_id: 4,
        latitude: '',
        longitude: '',
        building: '',
        floor: '',
        is_indoor: false,
        create_node: true,
        description: ''
    });

    // ============ ADD NODE FORM ============
    const [nodeForm, setNodeForm] = useState({
        node_name: '',
        latitude: '',
        longitude: '',
        building: '',
        floor: '',
        is_indoor: false
    });

    // ============ CONNECT NODES FORM ============
    const [edgeForm, setEdgeForm] = useState({
        from_node_id: '',
        to_node_id: '',
        distance_meters: '',
        direction_hint: ''
    });

    // ============ PATH FINDING ============
    const [pathStart, setPathStart] = useState('');
    const [pathEnd, setPathEnd] = useState('');
    const [pathResult, setPathResult] = useState(null);
    const [pathLoading, setPathLoading] = useState(false);

    // ============ FETCH ALL DATA ============
    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [locRes, nodeRes, edgeRes] = await Promise.all([
                api.get('/admin/locations'),
                api.get('/admin/nodes'),
                api.get('/admin/edges')
            ]);
            setLocations(locRes.data || []);
            setNodes(nodeRes.data || []);
            setEdges(edgeRes.data || []);
            setError('');
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    // ============ FETCH LOCATIONS ONLY ============
    const fetchLocations = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/locations');
            setLocations(res.data || []);
            setSuccess(`✅ ${res.data.length} locations loaded`);
        } catch (err) {
            setError('Failed to fetch locations');
        } finally {
            setLoading(false);
        }
    };

    // ============ FETCH NODES ONLY ============
    const fetchNodes = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/nodes');
            setNodes(res.data || []);
            setSuccess(`✅ ${res.data.length} nodes loaded`);
        } catch (err) {
            setError('Failed to fetch nodes');
        } finally {
            setLoading(false);
        }
    };

    // ============ FETCH EDGES ONLY ============
    const fetchEdges = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/edges');
            setEdges(res.data || []);
            setSuccess(`✅ ${res.data.length} edges loaded`);
        } catch (err) {
            setError('Failed to fetch edges');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    // ============ GET CURRENT LOCATION ============
    const getCurrentLocation = (formType) => {
        setGettingLocation(true);
        setLocationError('');

        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser');
            setGettingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                console.log('📍 Location fetched:', { latitude, longitude });
                
                if (formType === 'location') {
                    setLocationForm({
                        ...locationForm,
                        latitude: latitude.toFixed(8),
                        longitude: longitude.toFixed(8),
                    });
                } else if (formType === 'node') {
                    setNodeForm({
                        ...nodeForm,
                        latitude: latitude.toFixed(8),
                        longitude: longitude.toFixed(8),
                    });
                }
                setSuccess(`📍 Location captured: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                setGettingLocation(false);
                setLocationError('');
            },
            (error) => {
                console.error('Geolocation error:', error);
                let errorMsg = 'Failed to get location';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = 'Location permission denied. Please allow location access.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMsg = 'Location request timed out. Please try again.';
                        break;
                    default:
                        errorMsg = 'Unknown location error occurred.';
                }
                setLocationError(errorMsg);
                setGettingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    };

    // ============ ADD LOCATION ============
    const handleAddLocation = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const data = {
                ...locationForm,
                latitude: parseFloat(locationForm.latitude),
                longitude: parseFloat(locationForm.longitude),
                floor: locationForm.floor ? parseInt(locationForm.floor) : null,
            };
            const res = await api.post('/admin/locations', data);
            setSuccess(`✅ Location "${locationForm.name}" added! Node: ${res.data.node?.nodeId || 'Not created'}`);
            setLocationForm({ ...locationForm, name: '', latitude: '', longitude: '', building: '', floor: '' });
            fetchAllData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add location');
        } finally {
            setLoading(false);
        }
    };

    // ============ ADD NODE ============
    const handleAddNode = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const data = {
                ...nodeForm,
                latitude: parseFloat(nodeForm.latitude),
                longitude: parseFloat(nodeForm.longitude),
                floor: nodeForm.floor ? parseInt(nodeForm.floor) : null,
                is_location: 0,
                admin_id: 4
            };
            await api.post('/admin/nodes', data);
            setSuccess(`✅ Node "${nodeForm.node_name}" added!`);
            setNodeForm({ ...nodeForm, node_name: '', latitude: '', longitude: '', building: '', floor: '' });
            fetchAllData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add node');
        } finally {
            setLoading(false);
        }
    };

    // ============ CONNECT NODES ============
    const handleConnectNodes = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await api.post('/admin/nodes/connect', {
                ...edgeForm,
                distance_meters: parseInt(edgeForm.distance_meters),
                edge_type: 'walkway'
            });
            setSuccess(`✅ Nodes connected!`);
            setEdgeForm({ from_node_id: '', to_node_id: '', distance_meters: '', direction_hint: '' });
            fetchAllData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to connect nodes');
        } finally {
            setLoading(false);
        }
    };

    // ============ FIND SHORTEST PATH ============
    const findPath = async () => {
        if (!pathStart || !pathEnd) {
            setError('Please select start and end locations');
            return;
        }

        setPathLoading(true);
        setError('');
        setPathResult(null);

        try {
            const res = await api.post('/navigation/shortest-path', {
                startId: parseInt(pathStart),
                endId: parseInt(pathEnd)
            });
            setPathResult(res.data);
            if (!res.data.success) {
                setError(res.data.message || 'No path found');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to find path');
        } finally {
            setPathLoading(false);
        }
    };

    return (
        <div className="simple-test">
            <h1>🧪 Simple Navigation Test</h1>

            {/* ============ FETCH BUTTONS ============ */}
            <div className="fetch-buttons">
                <button onClick={fetchAllData} className="fetch-all-btn">
                    🔄 Fetch All
                </button>
                <button onClick={fetchLocations} className="fetch-loc-btn">
                    📍 Fetch Locations
                </button>
                <button onClick={fetchNodes} className="fetch-node-btn">
                    🟢 Fetch Nodes
                </button>
                <button onClick={fetchEdges} className="fetch-edge-btn">
                    🔗 Fetch Edges
                </button>
            </div>

            {/* ============ ERROR / SUCCESS ============ */}
            {error && <div className="error-box">{error}</div>}
            {success && <div className="success-box">{success}</div>}

            {/* ============ THREE COLUMN LAYOUT ============ */}
            <div className="three-col">
                {/* ============ COLUMN 1: ADD LOCATION ============ */}
                <div className="card">
                    <h2>📍 Add Location</h2>
                    <form onSubmit={handleAddLocation}>
                        <input
                            type="text"
                            placeholder="Name *"
                            value={locationForm.name}
                            onChange={(e) => setLocationForm({...locationForm, name: e.target.value})}
                            required
                        />
                        
                        {/* Latitude Row with Location Button */}
                        <div className="row">
                            <div className="input-with-button">
                                <input
                                    type="number"
                                    placeholder="Latitude *"
                                    value={locationForm.latitude}
                                    onChange={(e) => setLocationForm({...locationForm, latitude: e.target.value})}
                                    step="any"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => getCurrentLocation('location')}
                                    disabled={gettingLocation}
                                    className="btn-location"
                                    title="Get your current location"
                                >
                                    {gettingLocation ? '⏳' : '📍'}
                                </button>
                            </div>
                            <div className="input-with-button">
                                <input
                                    type="number"
                                    placeholder="Longitude *"
                                    value={locationForm.longitude}
                                    onChange={(e) => setLocationForm({...locationForm, longitude: e.target.value})}
                                    step="any"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => getCurrentLocation('location')}
                                    disabled={gettingLocation}
                                    className="btn-location"
                                    title="Get your current location"
                                >
                                    {gettingLocation ? '⏳' : '📍'}
                                </button>
                            </div>
                        </div>

                        {locationError && (
                            <div className="form-error" style={{ marginBottom: '10px' }}>
                                ⚠️ {locationError}
                            </div>
                        )}
                        {gettingLocation && (
                            <div className="location-status">⏳ Fetching your location...</div>
                        )}

                        <input
                            type="text"
                            placeholder="Building (optional)"
                            value={locationForm.building}
                            onChange={(e) => setLocationForm({...locationForm, building: e.target.value})}
                        />
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={locationForm.create_node}
                                onChange={(e) => setLocationForm({...locationForm, create_node: e.target.checked})}
                            />
                            🗺️ Also create as node
                        </label>
                        <button type="submit" disabled={loading}>➕ Add Location</button>
                    </form>
                </div>

                {/* ============ COLUMN 2: ADD NODE ============ */}
                <div className="card">
                    <h2>📍 Add Node/Intersection</h2>
                    <form onSubmit={handleAddNode}>
                        <input
                            type="text"
                            placeholder="Node Name *"
                            value={nodeForm.node_name}
                            onChange={(e) => setNodeForm({...nodeForm, node_name: e.target.value})}
                            required
                        />
                        
                        {/* Latitude Row with Location Button */}
                        <div className="row">
                            <div className="input-with-button">
                                <input
                                    type="number"
                                    placeholder="Latitude *"
                                    value={nodeForm.latitude}
                                    onChange={(e) => setNodeForm({...nodeForm, latitude: e.target.value})}
                                    step="any"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => getCurrentLocation('node')}
                                    disabled={gettingLocation}
                                    className="btn-location"
                                    title="Get your current location"
                                >
                                    {gettingLocation ? '⏳' : '📍'}
                                </button>
                            </div>
                            <div className="input-with-button">
                                <input
                                    type="number"
                                    placeholder="Longitude *"
                                    value={nodeForm.longitude}
                                    onChange={(e) => setNodeForm({...nodeForm, longitude: e.target.value})}
                                    step="any"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => getCurrentLocation('node')}
                                    disabled={gettingLocation}
                                    className="btn-location"
                                    title="Get your current location"
                                >
                                    {gettingLocation ? '⏳' : '📍'}
                                </button>
                            </div>
                        </div>

                        {locationError && (
                            <div className="form-error" style={{ marginBottom: '10px' }}>
                                ⚠️ {locationError}
                            </div>
                        )}
                        {gettingLocation && (
                            <div className="location-status">⏳ Fetching your location...</div>
                        )}

                        <input
                            type="text"
                            placeholder="Building (optional)"
                            value={nodeForm.building}
                            onChange={(e) => setNodeForm({...nodeForm, building: e.target.value})}
                        />
                        <button type="submit" disabled={loading}>➕ Add Node</button>
                    </form>

                    {/* ============ CONNECT NODES ============ */}
                    <h3 style={{ marginTop: '20px' }}>🔗 Connect Nodes</h3>
                    <form onSubmit={handleConnectNodes}>
                        <select
                            value={edgeForm.from_node_id}
                            onChange={(e) => setEdgeForm({...edgeForm, from_node_id: e.target.value})}
                            required
                        >
                            <option value="">From Node</option>
                            {nodes.map(n => (
                                <option key={n.node_id} value={n.node_id}>{n.node_name}</option>
                            ))}
                        </select>
                        <select
                            value={edgeForm.to_node_id}
                            onChange={(e) => setEdgeForm({...edgeForm, to_node_id: e.target.value})}
                            required
                        >
                            <option value="">To Node</option>
                            {nodes.map(n => (
                                <option key={n.node_id} value={n.node_id}>{n.node_name}</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            placeholder="Distance (meters) *"
                            value={edgeForm.distance_meters}
                            onChange={(e) => setEdgeForm({...edgeForm, distance_meters: e.target.value})}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Direction hint (optional)"
                            value={edgeForm.direction_hint}
                            onChange={(e) => setEdgeForm({...edgeForm, direction_hint: e.target.value})}
                        />
                        <button type="submit" disabled={loading}>🔗 Connect</button>
                    </form>
                </div>

                {/* ============ COLUMN 3: PATH FINDER ============ */}
                <div className="card">
                    <h2>🛤️ Find Shortest Path</h2>
                    <select
                        value={pathStart}
                        onChange={(e) => setPathStart(e.target.value)}
                    >
                        <option value="">Select Start</option>
                        {locations.map(l => (
                            <option key={l.locId} value={l.locId}>{l.name}</option>
                        ))}
                        {nodes.filter(n => n.is_location).map(n => (
                            <option key={n.node_id} value={n.node_id}>{n.node_name} (node)</option>
                        ))}
                    </select>
                    <select
                        value={pathEnd}
                        onChange={(e) => setPathEnd(e.target.value)}
                    >
                        <option value="">Select End</option>
                        {locations.map(l => (
                            <option key={l.locId} value={l.locId}>{l.name}</option>
                        ))}
                        {nodes.filter(n => n.is_location).map(n => (
                            <option key={n.node_id} value={n.node_id}>{n.node_name} (node)</option>
                        ))}
                    </select>
                    <button onClick={findPath} disabled={pathLoading}>
                        {pathLoading ? '⏳ Finding...' : '🗺️ Find Path'}
                    </button>

                    {/* ============ PATH RESULT ============ */}
                    {pathResult && pathResult.success && (
                        <div className="path-result">
                            <h3>✅ Path Found!</h3>
                            <p><strong>From:</strong> {pathResult.from}</p>
                            <p><strong>To:</strong> {pathResult.to}</p>
                            <p><strong>Total Distance:</strong> {pathResult.totalDistance}m</p>
                            <div className="path-steps">
                                <h4>Directions:</h4>
                                {pathResult.directions?.map((dir, i) => (
                                    <div key={i} className="step">
                                        <span>{i+1}.</span>
                                        <span>{dir.direction}</span>
                                        <span className="dist">{dir.distance}m</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {pathResult && !pathResult.success && (
                        <div className="path-error">
                            ❌ {pathResult.message || 'No path found'}
                        </div>
                    )}
                </div>
            </div>

            {/* ============ DATA TABLES ============ */}
            <div className="data-tables">
                <div className="table-card">
                    <h3>📍 Locations ({locations.length})</h3>
                    <table>
                        <thead><tr><th>ID</th><th>Name</th><th>Lat</th><th>Lng</th></tr></thead>
                        <tbody>
                            {locations.map(l => (
                                <tr key={l.locId}>
                                    <td>{l.locId}</td>
                                    <td>{l.name}</td>
                                    <td>{parseFloat(l.latitude).toFixed(4)}</td>
                                    <td>{parseFloat(l.longitude).toFixed(4)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="table-card">
                    <h3>🟢 Nodes ({nodes.length})</h3>
                    <table>
                        <thead><tr><th>ID</th><th>Name</th><th>Lat</th><th>Lng</th><th>Is Loc?</th></tr></thead>
                        <tbody>
                            {nodes.map(n => (
                                <tr key={n.node_id}>
                                    <td>{n.node_id}</td>
                                    <td>{n.node_name}</td>
                                    <td>{parseFloat(n.latitude).toFixed(4)}</td>
                                    <td>{parseFloat(n.longitude).toFixed(4)}</td>
                                    <td>{n.is_location ? '✅' : '❌'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="table-card">
                    <h3>🔗 Edges ({edges.length})</h3>
                    <table>
                        <thead><tr><th>From</th><th>To</th><th>Distance</th></tr></thead>
                        <tbody>
                            {edges.map(e => {
                                const from = nodes.find(n => n.node_id === e.from_node_id);
                                const to = nodes.find(n => n.node_id === e.to_node_id);
                                return (
                                    <tr key={e.edge_id}>
                                        <td>{from?.node_name || e.from_node_id}</td>
                                        <td>{to?.node_name || e.to_node_id}</td>
                                        <td>{e.distance_meters}m</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SimpleTest;