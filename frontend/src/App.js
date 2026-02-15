import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import ReportsPage from './pages/ReportsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

function Navigation() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      setCurrentUser(data.user || null);
    } catch (err) {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
      setCurrentUser(null);
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <nav className="bg-black text-white shadow-lg font-figtree font-extrabold">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <Link to="/" className="text-xl font-bold md:text-2xl">
            Patriot Radar
          </Link>
          <div className="flex flex-wrap items-center gap-3 md:gap-6">
            <Link to="/" className="text-sm hover:text-gray-300 transition md:text-base">
              Home
            </Link>
            <Link to="/map" className="text-sm hover:text-gray-300 transition md:text-base">
              Report Incident
            </Link>
            <Link to="/reports" className="text-sm hover:text-gray-300 transition md:text-base">
              View Reports
            </Link>
            {!loading && (
              <>
                {currentUser ? (
                  <>
                    <span className="text-xs text-gray-300 md:text-sm">
                      {currentUser.username}
                      {currentUser.account_type === 'admin' && ' (admin)'}
                    </span>
                    {currentUser.account_type === 'admin' && (
                      <a 
                        href="/admin" 
                        className="text-xs hover:text-gray-300 transition md:text-sm"
                      >
                        Admin
                      </a>
                    )}
                    <button
                      onClick={handleLogout}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-xs md:text-sm"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-xs md:text-sm">
                    Login
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />

        {/* Routes */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<SignupPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
