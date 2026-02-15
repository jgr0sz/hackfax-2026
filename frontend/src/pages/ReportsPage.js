import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch('/reports', { credentials: 'same-origin' });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('LOGIN_REQUIRED');
        }
        throw new Error('Failed to fetch reports');
      }
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('LOGIN_REQUIRED');
      }
      const data = await response.json();
      setReports(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <div className="text-xl text-gray-600">Loading reports...</div>
        </div>
      </div>
    );
  }

  if (error) {
    if (error === 'LOGIN_REQUIRED') {
      return (
        <div className="container mx-auto px-4 py-12">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
            You must be logged in to view reports.{' '}
            <Link to="/login" className="font-semibold underline">
              Login to view
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <h1 className="text-2xl font-bold mb-6 md:text-3xl">Incident Reports</h1>
      
      {reports.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600 text-lg">No reports yet</p>
        </div>
      ) : (
        <div className="grid gap-4 md:gap-6">
          {reports.map((report) => {
            const loc = report.location || {};
            const locationText = report.address ||
              (loc.latitude != null && loc.longitude != null
                ? `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`
                : '—');
            return (
              <div key={report.id} className="bg-white rounded-lg shadow-md p-5 md:p-6 hover:shadow-lg transition">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 md:text-xl">
                      Incident Report
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(report.date).toLocaleDateString()} · {locationText}
                    </p>
                  </div>
                  <span className={`w-fit px-3 py-1 rounded-full text-xs font-semibold md:text-sm ${
                    report.severity === 'high' ? 'bg-red-100 text-red-800' :
                    report.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {report.severity || 'Unknown'} severity
                  </span>
                </div>
                
                <p className="text-gray-700 mb-4 text-sm md:text-base">{report.details || report.description}</p>
                
                <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                  <span className={`px-2 py-1 rounded ${
                    report.status === 'Resolved' ? 'bg-green-50 text-green-700' :
                    'bg-orange-50 text-orange-700'
                  }`}>
                    {report.status || 'Pending'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ReportsPage;
