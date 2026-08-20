import { useState } from 'react';
import api from '../api/axios';
import './NavigationTest.css';

const NavigationTest = () => {
  const [startId, setStartId] = useState('');
  const [endId, setEndId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Location mapping for display
  const locations = [
    { id: 26, name: 'Store room' },
    { id: 27, name: 'Mountains view' },
    { id: 28, name: 'Water tank' },
    { id: 29, name: 'T intersection' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.post('/navigation/shortest-path', {
        startId: parseInt(startId),
        endId: parseInt(endId)
      });
      
      console.log('📍 Navigation result:', response.data);
      setResult(response.data);
    } catch (err) {
      console.error('❌ Navigation error:', err);
      setError(err.response?.data?.error || 'Failed to find path');
    } finally {
      setLoading(false);
    }
  };

  const getLocationName = (id) => {
    const loc = locations.find(l => l.id === id);
    return loc ? loc.name : id;
  };

  return (
    <div className="nav-test-container">
      <h1>🧭 Navigation Test</h1>
      <p>Test the shortest path between locations</p>

      <form onSubmit={handleSubmit} className="nav-form">
        <div className="form-row">
          <div className="form-group">
            <label>Start Location</label>
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
            <label>End Location</label>
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
          {loading ? 'Finding path...' : '🧭 Find Shortest Path'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="result-container">
          <h2>✅ Path Found!</h2>
          
          <div className="route-summary">
            <div className="route-info">
              <span className="label">From:</span>
              <span className="value">{result.from}</span>
            </div>
            <div className="route-info">
              <span className="label">To:</span>
              <span className="value">{result.to}</span>
            </div>
            <div className="route-info">
              <span className="label">Total Distance:</span>
              <span className="value">{result.totalDistance} meters</span>
            </div>
          </div>

          <div className="path-visual">
            <h3>🗺️ Path</h3>
            <div className="path-nodes">
              {result.pathNodes.map((node, index) => (
                <div key={node.node_id} className="path-node">
                  <span className="node-number">{index + 1}</span>
                  <span className="node-name">{node.node_name}</span>
                  {index < result.pathNodes.length - 1 && (
                    <span className="arrow">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="directions">
            <h3>📋 Turn-by-Turn Directions</h3>
            {result.directions.map((dir, index) => (
              <div key={index} className="direction-step">
                <span className="step-number">{index + 1}.</span>
                <span className="step-text">{dir.direction}</span>
                <span className="step-distance">({dir.distance}m)</span>
              </div>
            ))}
          </div>

          <div className="raw-data">
            <h4>📊 Raw Data</h4>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationTest;