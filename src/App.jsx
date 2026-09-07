import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import AdminLogin from './pages/AdminLogin';
import AdminSignup from './pages/AdminSignUp';
import AdminDashboard from './pages/AdminDashboard';
import NavigationPage from './pages/NavigationPage';
import SimpleTest from './pages/simpleTest';
import './App.css';

function App() {
  return (
    
    <BrowserRouter>
      <nav className="nav-bar">
        <Link to="/">🏠 Home</Link>
        <Link to="/navigate">🧭 Navigate</Link>
        <Link to="/admin/login">🔐 Admin</Link>
        <Link to="/test">🧪 Simple Test</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/navigate" element={<NavigationPage />} />
        <Route path="/test" element={<SimpleTest />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/signup" element={<AdminSignup />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;