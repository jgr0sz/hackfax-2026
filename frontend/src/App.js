import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import ReportsPage from './pages/ReportsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AccessibilityHub from './components/AccessibilityHub';

function Navigation({ currentUser, loading, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
      onLogout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }, [navigate, onLogout]);

  return (
    <nav 
      className="bg-black text-white shadow-lg font-figtree font-extrabold relative z-50"
      aria-label="Main navigation"
      role="navigation"
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <Link to="/" className="text-xl font-bold md:text-2xl" aria-label="Patriot Radar Home" tabIndex={0}>
            Patriot Radar
          </Link>
          <div className="flex flex-wrap items-center gap-3 md:gap-6">
            <Link 
              to="/" 
              className="text-sm hover:text-gray-300 transition md:text-base px-1"
              aria-label="Home"
              tabIndex={0}
            >
              Home
            </Link>
            <Link 
              to="/map" 
              className="text-sm hover:text-gray-300 transition md:text-base px-1"
              aria-label="Report an incident"
              tabIndex={0}
            >
              Report Incident
            </Link>
            <Link 
              to="/reports" 
              className="text-sm hover:text-gray-300 transition md:text-base px-1"
              aria-label="View all reports"
              tabIndex={0}
            >
              View Reports
            </Link>
            {!loading && (
              <>
                {currentUser ? (
                  <>
                    <span 
                      className="text-xs text-gray-300 md:text-sm"
                      role="status"
                      aria-live="polite"
                      aria-label={`Logged in as ${currentUser.username}${currentUser.account_type === 'admin' ? ' with admin privileges' : ''}`}
                    >
                      {currentUser.username}
                      {currentUser.account_type === 'admin' && ' (admin)'}
                    </span>
                    {currentUser.account_type === 'admin' && (
                      <a 
                        href="/admin" 
                        className="text-xs hover:text-gray-300 transition md:text-sm px-1"
                        aria-label="Admin panel"
                        tabIndex={0}
                      >
                        Admin
                      </a>
                    )}
                    <button
                      onClick={handleLogout}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-xs md:text-sm"
                      aria-label="Log out from your account"
                      tabIndex={0}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link 
                    to="/login" 
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-xs md:text-sm"
                    aria-label="Log in to your account"
                    tabIndex={0}
                  >
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

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation currentUser={currentUser} loading={loading} onLogout={handleLogout} />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-blue-600 focus:text-white">
          Skip to main content
        </a>
        <main id="main-content" className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/login" element={<LoginPage onLoginSuccess={fetchUser} />} />
            <Route path="/register" element={<SignupPage onSignupSuccess={fetchUser} />} />
          </Routes>
        </main>
        <AccessibilityHub />
      </div>
    </Router>
  );
}

export default App;
