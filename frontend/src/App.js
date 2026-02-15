import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import ReportsPage from './pages/ReportsPage';

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
              </div>
            </div>
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
