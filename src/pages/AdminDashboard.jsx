import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Admin.css';

const AdminDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [adminId, setAdminId] = useState(null); // ✅ Store admin ID
  const [currentLocId, setCurrentLocId] = useState(null);   // ✅ Add this
  const [currentLocName, setCurrentLocName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    admin_id: '',
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
    const adminDataString = localStorage.getItem("adminData");

    if (adminDataString) {
      const adminData = JSON.parse(adminDataString);
      setProfile(adminData);
      setAdminId(adminData.id); 
      fetchLocations(adminData.id);
    } else {
      navigate('/admin/login');
    }
  }, []);

  // Add this function
  const [generating, setGenerating] = useState(false);

  const generateGraph = async () => {
    if (!window.confirm('This will generate nodes and edges for all locations. Continue?')) return;

    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/admin/generate-graph', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
      });
      setSuccess(` ${response.data.message}`);
      // Refresh locations after generation
      await fetchLocations(adminId);
    } catch (err) {
      console.error('Error generating graph:', err);
      setError(err.response?.data?.error || 'Failed to generate graph');
    } finally {
      setGenerating(false);
    }
  };


  // Add this function
  const smartConnect = async () => {
    if (!window.confirm('This will automatically connect all nearby locations (within 1km). Continue?')) return;

    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/admin/smart-connect', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
      });
      setSuccess(`✅ ${response.data.message}`);
      await fetchLocations(adminId);
    } catch (err) {
      console.error('Error in smart connect:', err);
      setError(err.response?.data?.error || 'Failed to connect locations');
    } finally {
      setGenerating(false);
    }
  };



  const fetchLocations = async (admin_id) => {
    try {
      setLoading(true);
      const res = await api.get('/admin/locations', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`
        },
        params: { admin_id }
      });
      setLocations(res.data);
      console.log(res.data);

    } catch (err) {
      console.error('Error fetching locations:', err);
      if (err.response?.status === 401) {
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  //  Refresh function using stored adminId
  const refreshLocations = async () => {
    if (adminId) {
      await fetchLocations(adminId);
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
        setFormData({
          ...formData,
          latitude: position.coords.latitude.toFixed(8),
          longitude: position.coords.longitude.toFixed(8),
        });
        setGettingLocation(false);
        setLocationError('');
        setSuccess('📍 Location captured successfully!');
        setTimeout(() => setSuccess(''), 3000);
      },
      (error) => {
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
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const openAddModal = () => {
    setEditingLocation(null);
    const adminDataString = localStorage.getItem("adminData");
    const adminData = JSON.parse(adminDataString);
    const id = adminData.id;
    setFormData({
      name: '',
      admin_id: id,
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
    console.log(location);

    setEditingLocation(location);
    setFormData({
      name: location.name,
      admin_id: location.admin_id || adminId,
      latitude: location.latitude,
      longitude: location.longitude,
      building: location.building || '',
      floor: location.floor || '',
      is_indoor: location.is_indoor || false,
      description: location.description || '',
      create_node: true,  // ✅ ADD THIS - default to true
    });
    setShowModal(true);
    setError('');
    setSuccess('');
    setLocationError('');

    console.log(location.latitude),

      console.log(location.longitude),
      console.log(formData);
  };
  // Add QR generation function
  const [qrImage, setQrImage] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  const generateQRCode = async (locId, locName) => {
    console.log(' generateQRCode called with:', { locId, locName });

    //  Fallback so we never get "null" in the filename
    const safeName = (locName && locName.trim())
      ? locName.trim()
      : `Location_${locId}`;

    setQrLoading(true);
    setCurrentLocId(locId);
    setCurrentLocName(safeName);

    try {
      const response = await api.get(`/admin/qr/generate/${locId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`
        },
        responseType: 'blob'
      });

      const imageUrl = URL.createObjectURL(response.data);
      setQrImage(imageUrl);
    } catch (err) {
      console.error('Error generating QR:', err);
      setError('Failed to generate QR code');
    } finally {
      setQrLoading(false);
    }
  };
  const downloadQR = () => {
    if (!qrImage) {
      alert('No QR code to download');
      return;
    }

    // Make sure filename is never null or empty
    const safeName = (currentLocName && currentLocName.trim())
      ? currentLocName.trim().replace(/[^a-zA-Z0-9_-]/g, '_')
      : `Location_${currentLocId || 'unknown'}`;

    const fileName = `QR_${safeName}_${currentLocId || ''}.png`;

    console.log('Downloading:', fileName);

    const link = document.createElement('a');
    link.href = qrImage;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // Close QR modal
  const closeQRModal = () => {
    setQrImage(null);
    setCurrentLocId(null);
    setCurrentLocName('');
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

    if (!formData.name || !formData.admin_id || !formData.latitude || !formData.longitude) {
      setError('Name, admin id, latitude, and longitude are required');
      return;
    }

    try {
      const data = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        floor: formData.floor ? parseInt(formData.floor) : null,
        create_node: formData.create_node || false,
      };

      if (editingLocation) {
        //  FIX: Use the correct URL with ID
        await api.put(`/admin/locations/${editingLocation.locId}`, data);

        setSuccess(' Location updated successfully!');
      } else {
        await api.post('/admin/locations', data);
        setSuccess(' Location added successfully!');
      }

      await refreshLocations();

      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
      }, 1500);

    } catch (err) {
      console.error('Error saving location:', err);
      if (err.response?.status === 409) {
        const existingName = err.response?.data?.existingName || 'another location';
        setError(`⚠️ A location already exists at these coordinates: "${existingName}"`);
      } else {
        setError(err.response?.data?.error || 'Failed to save location');
      }
    }
  };

  const handleDelete = async (locId) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return;

    try {
      await api.delete(`/admin/locations/${locId}`);
      setSuccess('Location deleted successfully!');

      // Refresh locations after delete
      await refreshLocations();

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
      <header className="admin-header">
        <div className="admin-header-left">
          <h1><i class="ri-admin-fill"></i> Admin Dashboard</h1>
          <span className="admin-badge">{locations.length} Locations</span>
          <span style={{ fontSize: '18px', color: '#666', marginLeft: '10px', fontWeight: '600' }}>
            Welcome, <b>{profile?.username || 'Admin'}</b>!
          </span>
        </div>
        <div className="admin-header-right">
          <button onClick={openAddModal} className="btn-primary">
            <i class="ri-add-large-line"></i> Add Location
          </button>
          <button
            onClick={() => navigate('/admin/tools')}
            className="btn-tools"
          >
            <i class="ri-tools-fill"> </i>
             Advanced Tools
          </button>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </header>

      {success && <div className="alert-success">{success}</div>}
      {error && <div className="alert-error">{error}</div>}

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
                    <button onClick={() => openEditModal(loc)} className="btn-edit"><i class="ri-edit-box-line"></i></button>
                    <button onClick={() => handleDelete(loc.locId)} className="btn-delete"><i class="ri-delete-bin-7-line"></i></button>
                    <button
                      onClick={() => generateQRCode(loc.locId, loc.name)}
                      className="btn-qr"
                      disabled={qrLoading}
                      title="Generate QR Code"
                    >
                      {qrLoading ? <i class="ri-loader-2-line"></i> : <i class="ri-qr-code-fill"></i>}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingLocation ? '✏️/ Edit Location' : '➕ Add New Location'}</h2>
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

              {locationError && (
                <div className="form-error" style={{ marginBottom: '10px' }}>
                  ⚠️ {locationError}
                </div>
              )}

              {gettingLocation && (
                <div className="location-status">⏳ Fetching your location...</div>
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

              {/* // Add this in the form (inside the modal) */}
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    name="create_node"
                    checked={formData.create_node}
                    onChange={(e) => setFormData({ ...formData, create_node: e.target.checked })}
                  />
                   Also create as a navigation node (intersection)
                </label>
                <small style={{ color: '#888', display: 'block', marginTop: '5px' }}>
                  Enable this if this location should be used as a waypoint or intersection for navigation
                </small>
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
      {/* QR Code Modal */}
      {qrImage && (
        <div className="qr-modal" onClick={closeQRModal}>
          <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>📱 QR Code</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>
              {currentLocName} (ID: {currentLocId})
            </p>
            <img src={qrImage} alt="QR Code" />
            <div className="qr-actions">
              <button onClick={downloadQR} className="btn-download">
                ⬇ Download QR Code
              </button>
              <button onClick={closeQRModal} className="btn-close">
                ✕ Close
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
              Print and place this QR code at the location for easy navigation
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;