import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import ReportsPage from './pages/ReportsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-black text-white shadow-lg">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center py-4">
              <Link to="/" className="text-2xl font-bold">
                Patriot Radar
              </Link>
              <div className="space-x-6">
                <Link to="/" className="hover:text-gray-300 transition">
                  Home
                </Link>
                <Link to="/map" className="hover:text-gray-300 transition">
                  Report Incident
                </Link>
                <Link to="/reports" className="hover:text-gray-300 transition">
                  View Reports
                </Link>
                <Link to="/login" className="hover:text-gray-300 transition">
                  Login
                </Link>
              </div>
            </div>
          </div>
        </nav>

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
