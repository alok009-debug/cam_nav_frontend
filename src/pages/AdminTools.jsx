import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './AdminTools.css';

const AdminTools = () => {

    const navigate = useNavigate();
    // ============ STATE ============
    const [locations, setLocations] = useState([]);
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [gettingLocation, setGettingLocation] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [actionLoading, setActionLoading] = useState('');  // tracks which button is loading

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

    // ============ NOTIFICATION HELPER ============
    const notify = (message, isError = false) => {
        if (isError) {
            setError(message);
            setSuccess('');
        } else {
            setSuccess(message);
            setError('');
        }
        setTimeout(() => {
            setSuccess('');
            setError('');
        }, 5000);
    };

    const fetchAllData = async () => {
        try {
            setLoading(true);

            // Pull admin_id from localStorage
            const adminDataString = localStorage.getItem('adminData');
            const adminData = adminDataString ? JSON.parse(adminDataString) : null;
            const adminId = adminData?.id;

            console.log('🔍 Fetching data for admin_id:', adminId);

            // Pass admin_id as a query param to locations
            const [locRes, nodeRes, edgeRes] = await Promise.all([
                api.get('/admin/locations', {
                    params: adminId ? { admin_id: adminId } : {}
                }),
                api.get('/admin/nodes'),
                api.get('/admin/edges')
            ]);

            setLocations(locRes.data || []);
            setNodes(nodeRes.data || []);
            setEdges(edgeRes.data || []);
        } catch (err) {
            console.error('Fetch error:', err);
            notify('Failed to fetch data', true);
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
                // ✅ Round to 6 decimals for stability
                const lat = parseFloat(latitude.toFixed(6));
                const lng = parseFloat(longitude.toFixed(6));

                setNodeForm(prev => ({
                    ...prev,
                    latitude: lat.toString(),
                    longitude: lng.toString()
                }));

                notify(`📍 Location captured: ${lat}, ${lng} (±${Math.round(position.coords.accuracy)}m)`);
                setGettingLocation(false);
                setLocationError('');
            },
            (error) => {
                let errorMsg = 'Failed to get location';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = 'Location permission denied.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = 'Location unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMsg = 'Location request timed out.';
                        break;
                    default:
                        errorMsg = 'Unknown location error.';
                }
                setLocationError(errorMsg);
                notify(errorMsg, true);
                setGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    // ============ ADD NODE ============
    const handleAddNode = async (e) => {
        e.preventDefault();
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
            notify(`✅ Node "${nodeForm.node_name}" added!`);
            setNodeForm({ node_name: '', latitude: '', longitude: '', building: '', floor: '', is_indoor: false });
            fetchAllData();
        } catch (err) {
            notify(err.response?.data?.error || 'Failed to add node', true);
        } finally {
            setLoading(false);
        }
    };

    // ============ CONNECT NODES ============
    const handleConnectNodes = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post('/admin/nodes/connect', {
                ...edgeForm,
                distance_meters: parseInt(edgeForm.distance_meters),
                edge_type: 'walkway'
            });
            notify(`✅ Nodes connected!`);
            setEdgeForm({ from_node_id: '', to_node_id: '', distance_meters: '', direction_hint: '' });
            fetchAllData();
        } catch (err) {
            notify(err.response?.data?.error || 'Failed to connect nodes', true);
        } finally {
            setLoading(false);
        }
    };

    // ============ FIND SHORTEST PATH ============
    const findPath = async () => {
        if (!pathStart || !pathEnd) {
            notify('Please select start and end locations', true);
            return;
        }

        setPathLoading(true);
        setPathResult(null);

        try {
            const res = await api.post('/navigation/shortest-path', {
                startId: parseInt(pathStart),
                endId: parseInt(pathEnd)
            });
            setPathResult(res.data);
            if (!res.data.success) {
                notify(res.data.message || 'No path found', true);
            }
        } catch (err) {
            notify(err.response?.data?.message || 'Failed to find path', true);
        } finally {
            setPathLoading(false);
        }
    };

    // ============ ADMIN TOOL: GENERATE MISSING NODES ============
    const generateMissingNodes = async () => {
        setActionLoading('generate');
        try {
            const res = await api.post('/admin/create-missing-nodes');
            notify(`✅ ${res.data.message}`);
            fetchAllData();
        } catch (err) {
            notify(err.response?.data?.error || 'Failed to generate missing nodes', true);
        } finally {
            setActionLoading('');
        }
    };

    // ============ ADMIN TOOL: CONNECT ALL NODES ============
    const connectAllNodes = async () => {
        setActionLoading('connect');
        try {
            const res = await api.post('/admin/connect-all');
            notify(`✅ ${res.data.message}`);
            fetchAllData();
        } catch (err) {
            notify(err.response?.data?.error || 'Failed to connect nodes', true);
        } finally {
            setActionLoading('');
        }
    };

    // ============ ADMIN TOOL: SMART CONNECT ============
    const smartConnect = async () => {
        setActionLoading('smart');
        try {
            const res = await api.post('/admin/smartconnect');
            notify(`${res.data.message}`);
            fetchAllData();
        } catch (err) {
            notify(err.response?.data?.error || 'Smart connect failed', true);
        } finally {
            setActionLoading('');
        }
    };

    return (
        <div className="admin-tools">
            {/* ============ HEADER WITH BACK BUTTON ============ */}
            <div className="tools-header">
                <h1>🛠️ Advanced Admin Tools</h1>
                <button
                    onClick={() => navigate('/admin/dashboard')}
                    className="btn-back"
                >
                    ← Back to Dashboard
                </button>
            </div>

            {/* ============ TOP: QUICK ACTION BUTTONS ============ */}
            <div className="fetch-buttons">
                <button
                    onClick={generateMissingNodes}
                    className="fetch-all-btn"
                    disabled={actionLoading !== ''}
                >
                    {actionLoading === 'generate' ? '⏳ Generating...' : '🟢 Generate Missing Nodes'}
                </button>

                <button
                    onClick={connectAllNodes}
                    className="fetch-loc-btn"
                    disabled={actionLoading !== ''}
                >
                    {actionLoading === 'connect' ? '⏳ Connecting...' : '🔗 Connect All Nodes'}
                </button>

                <button
                    onClick={smartConnect}
                    className="fetch-node-btn"
                    disabled={actionLoading !== ''}
                >
                    {actionLoading === 'smart' ? '⏳ Smart Connecting...' : '✨ Smart Connect'}
                </button>
            </div>

            {/* ============ NOTIFICATIONS ============ */}
            {error && <div className="error-box">⚠️ {error}</div>}
            {success && <div className="success-box">{success}</div>}

            {/* ============ MAIN LAYOUT: 2 COLUMNS ============ */}
            <div className="admin-tools-grid">

                {/* ===== LEFT COLUMN ===== */}
                <div className="card">
                    <h2>📍 Add Node / Intersection</h2>
                    <form onSubmit={handleAddNode}>
                        <input
                            type="text"
                            placeholder="Node Name *"
                            value={nodeForm.node_name}
                            onChange={(e) => setNodeForm({ ...nodeForm, node_name: e.target.value })}
                            required
                        />

                        <div className="row">
                            <div className="input-with-button">
                                <input
                                    type="number"
                                    placeholder="Latitude *"
                                    value={nodeForm.latitude}
                                    onChange={(e) => setNodeForm({ ...nodeForm, latitude: e.target.value })}
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
                                    onChange={(e) => setNodeForm({ ...nodeForm, longitude: e.target.value })}
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
                            <div className="form-error">⚠️ {locationError}</div>
                        )}

                        <input
                            type="text"
                            placeholder="Building (optional)"
                            value={nodeForm.building}
                            onChange={(e) => setNodeForm({ ...nodeForm, building: e.target.value })}
                        />

                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={nodeForm.is_indoor}
                                onChange={(e) => setNodeForm({ ...nodeForm, is_indoor: e.target.checked })}
                            />
                            🏠 Indoor Node
                        </label>

                        <button type="submit" disabled={loading}>
                            {loading ? '⏳ Adding...' : '➕ Add Node'}
                        </button>
                    </form>
                </div>

                {/* ===== RIGHT COLUMN ===== */}
                <div className="card">
                    <h2>🔗 Connect Nodes Manually</h2>
                    <form onSubmit={handleConnectNodes}>
                        <select
                            value={edgeForm.from_node_id}
                            onChange={(e) => setEdgeForm({ ...edgeForm, from_node_id: e.target.value })}
                            required
                        >
                            <option value="">From Node</option>
                            {nodes.map(n => (
                                <option key={n.node_id} value={n.node_id}>{n.node_name}</option>
                            ))}
                        </select>

                        <select
                            value={edgeForm.to_node_id}
                            onChange={(e) => setEdgeForm({ ...edgeForm, to_node_id: e.target.value })}
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
                            onChange={(e) => setEdgeForm({ ...edgeForm, distance_meters: e.target.value })}
                            required
                        />

                        <input
                            type="text"
                            placeholder="Direction hint (optional)"
                            value={edgeForm.direction_hint}
                            onChange={(e) => setEdgeForm({ ...edgeForm, direction_hint: e.target.value })}
                        />

                        <button type="submit" disabled={loading}>
                            {loading ? '⏳ Connecting...' : '🔗 Connect'}
                        </button>
                    </form>
                </div>
            </div>

            {/* ============ PATH FINDER (FULL WIDTH BELOW) ============ */}
            <div className="card full-width-card">
                <h2>🛤️ Test Shortest Path</h2>
                <div className="row">
                    <select value={pathStart} onChange={(e) => setPathStart(e.target.value)}>
                        <option value="">Select Start</option>
                        {locations.map(l => (
                            <option key={l.locId} value={l.locId}>{l.name}</option>
                        ))}
                        {nodes.filter(n => n.is_location).map(n => (
                            <option key={n.node_id} value={n.node_id}>{n.node_name} (node)</option>
                        ))}
                    </select>

                    <select value={pathEnd} onChange={(e) => setPathEnd(e.target.value)}>
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
                </div>

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
                                    <span>{i + 1}.</span>
                                    <span>{dir.direction}</span>
                                    <span className="dist">{dir.distance}m</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {pathResult && !pathResult.success && (
                    <div className="path-error">❌ {pathResult.message || 'No path found'}</div>
                )}
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

export default AdminTools;