import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Admin.css';

const AdminDashboard = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    building: '',
    floor: '',
    is_indoor: false,
    description: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // Fetch locations on load
  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await api.get('/admin/locations');
      setLocations(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching locations:', err);
      if (err.response?.status === 401) {
        navigate('/admin/login');
      }
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    navigate('/admin/login');
  };

  // Get current location
  const getCurrentLocation = () => {
    setGettingLocation(true);
    setLocationError('');
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('📍 Location fetched:', position.coords);
        setFormData({
          ...formData,
          latitude: position.coords.latitude.toFixed(8),
          longitude: position.coords.longitude.toFixed(8),
        });
        setGettingLocation(false);
        setLocationError('');
        // Show success feedback
        setSuccess('📍 Location captured successfully!');
        setTimeout(() => setSuccess(''), 3000);
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
        let errorMsg = 'Failed to get location';
        switch(error.code) {
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
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const openAddModal = () => {
    setEditingLocation(null);
    setFormData({
      name: '',
      latitude: '',
      longitude: '',
      building: '',
      floor: '',
      is_indoor: false,
      description: '',
    });
    setShowModal(true);
    setError('');
    setSuccess('');
    setLocationError('');
  };

  const openEditModal = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      building: location.building || '',
      floor: location.floor || '',
      is_indoor: location.is_indoor || false,
      description: location.description || '',
    });
    setShowModal(true);
    setError('');
    setSuccess('');
    setLocationError('');
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate
    if (!formData.name || !formData.latitude || !formData.longitude) {
      setError('Name, latitude, and longitude are required');
      return;
    }

    try {
      const data = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        floor: formData.floor ? parseInt(formData.floor) : null,
      };

      if (editingLocation) {
        // Update
        await api.put(`/admin/locations/${editingLocation.locId}`, data);
        setSuccess('✅ Location updated successfully!');
      } else {
        // Create
        await api.post('/admin/locations', data);
        setSuccess('✅ Location added successfully!');
      }

      // Refresh list
      await fetchLocations();
      
      // Close modal after delay
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
      }, 1500);
    } catch (err) {
      console.error('Error saving location:', err);
      setError(err.response?.data?.error || 'Failed to save location');
    }
  };

  const handleDelete = async (locId) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return;

    try {
      await api.delete(`/admin/locations/${locId}`);
      await fetchLocations();
      setSuccess('✅ Location deleted successfully!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Error deleting location:', err);
      setError('Failed to delete location');
    }
  };

  if (loading) {
    return <div className="admin-loading">Loading locations...</div>;
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <h1>🏛️ Admin Dashboard</h1>
          <span className="admin-badge">{locations.length} Locations</span>
        </div>
        <div className="admin-header-right">
          <button onClick={openAddModal} className="btn-primary">
            ➕ Add Location
          </button>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </header>

      {/* Success/Error Messages */}
      {success && <div className="alert-success">{success}</div>}
      {error && <div className="alert-error">{error}</div>}

      {/* Stats Cards */}
      <div className="stats-container">
        <div className="stat-card">
          <h3>Total Locations</h3>
          <p>{locations.length}</p>
        </div>
        <div className="stat-card">
          <h3>Indoor</h3>
          <p>{locations.filter(l => l.is_indoor).length}</p>
        </div>
        <div className="stat-card">
          <h3>Outdoor</h3>
          <p>{locations.filter(l => !l.is_indoor).length}</p>
        </div>
      </div>

      {/* Location Table */}
      <div className="table-container">
        <h2>All Locations</h2>
        <table className="location-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Building</th>
              <th>Coordinates</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: '#999' }}>
                  No locations found. Click "Add Location" to create one.
                </td>
              </tr>
            ) : (
              locations.map(loc => (
                <tr key={loc.locId}>
                  <td>#{loc.locId}</td>
                  <td><strong>{loc.name}</strong></td>
                  <td>{loc.building || '—'}</td>
                  <td className="coords">
                    {parseFloat(loc.latitude).toFixed(6)}, {parseFloat(loc.longitude).toFixed(6)}
                  </td>
                  <td>
                    <span className={`type-badge ${loc.is_indoor ? 'indoor' : 'outdoor'}`}>
                      {loc.is_indoor ? '🏠 Indoor' : '🌳 Outdoor'}
                    </span>
                  </td>
                  <td>
                    <button 
                      onClick={() => openEditModal(loc)} 
                      className="btn-edit"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(loc.locId)} 
                      className="btn-delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingLocation ? '✏️ Edit Location' : '➕ Add New Location'}</h2>
              <button onClick={() => setShowModal(false)} className="modal-close">✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Location Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Central Library"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Latitude *</label>
                  <div className="input-with-button">
                    <input
                      type="number"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      placeholder="e.g., 28.613939"
                      step="any"
                      required
                    />
                    <button 
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      className="btn-location"
                      title="Get your current location"
                    >
                      {gettingLocation ? '⏳' : '📍'}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Longitude *</label>
                  <div className="input-with-button">
                    <input
                      type="number"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      placeholder="e.g., 77.209021"
                      step="any"
                      required
                    />
                    <button 
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      className="btn-location"
                      title="Get your current location"
                    >
                      {gettingLocation ? '⏳' : '📍'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Location error message */}
              {locationError && (
                <div className="form-error" style={{ marginBottom: '10px' }}>
                  ⚠️ {locationError}
                </div>
              )}

              {/* Location status */}
              {gettingLocation && (
                <div className="location-status">
                  ⏳ Fetching your location...
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Building</label>
                  <input
                    type="text"
                    name="building"
                    value={formData.building}
                    onChange={handleInputChange}
                    placeholder="e.g., Student Center"
                  />
                </div>
                <div className="form-group">
                  <label>Floor</label>
                  <input
                    type="number"
                    name="floor"
                    value={formData.floor}
                    onChange={handleInputChange}
                    placeholder="e.g., 3"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of this location"
                  rows="3"
                />
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    name="is_indoor"
                    checked={formData.is_indoor}
                    onChange={handleInputChange}
                  />
                  Indoor Location
                </label>
              </div>

              {error && <div className="form-error">{error}</div>}

              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  {editingLocation ? 'Update Location' : 'Add Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;