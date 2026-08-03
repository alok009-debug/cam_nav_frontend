import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import './Admin.css';

const SignUp = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        fullname: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        const { username, fullname, email, phone, password, confirmPassword } = formData;

        // Validation
        if (!username || !email || !password) {
            setError('Username, email, and password are required');
            setLoading(false);
            return;
        }

        if (password.length < 8) {
            setError('Password should be at least 8 characters');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Password and confirm password do not match');
            setLoading(false);
            return;
        }

        try {
            const response = await api.post("/admin/signup", {
                username,
                full_name: fullname || username,
                email,
                phone: phone || null,
                password
            });

            console.log('✅ Signup successful:', response.data);
            setSuccess('Account created successfully! Redirecting to login...');
            
            // Clear form
            setFormData({
                username: '',
                fullname: '',
                email: '',
                phone: '',
                password: '',
                confirmPassword: '',
            });

            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate('/admin/login');
            }, 2000);

        } catch (error) {
            console.error('❌ Signup error:', error);
            
            if (error.response?.status === 409) {
                setError('Username or email already exists. Please try different ones.');
            } else if (error.response?.status === 400) {
                setError(error.response.data.error || 'Please check your input');
            } else {
                setError('Signup failed. Please try again later.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-signup-container">
            <div className="admin-signup-card">
                <h1>🏛️ Admin Sign Up</h1>
                <p>Create an account to manage campus locations</p>

                <form onSubmit={handleSignup}>
                    <input
                        type="text"
                        name="username"
                        placeholder="Username *"
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="text"
                        name="fullname"
                        placeholder="Full Name *"
                        value={formData.fullname}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="email"
                        name="email"
                        placeholder="Email *"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="tel"
                        name="phone"
                        placeholder="Phone Number"
                        value={formData.phone}
                        onChange={handleChange}
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="Password * (min 8 characters)"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm Password *"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                    />

                    {error && <div className="error">{error}</div>}
                    {success && <div className="success">{success}</div>}

                    <button type="submit" disabled={loading}>
                        {loading ? 'Creating account...' : 'Sign Up'}
                    </button>

                    <div className="login-link">
                        Already have an account? <Link to="/admin/login">Login</Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SignUp;