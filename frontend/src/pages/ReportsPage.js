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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Incident Reports</h1>
      
      {reports.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600 text-lg">No reports yet</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {reports.map((report, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {report.quick_issue || 'Incident Report'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(report.date).toLocaleDateString()} at {report.location}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  report.severity === 'high' ? 'bg-red-100 text-red-800' :
                  report.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {report.severity || 'Unknown'} severity
                </span>
              </div>
              
              <p className="text-gray-700 mb-4">{report.details || report.description}</p>
              
              <div className="flex gap-3 text-sm">
                <span className={`px-2 py-1 rounded ${
                  report.status === 'Resolved' ? 'bg-green-50 text-green-700' :
                  'bg-orange-50 text-orange-700'
                }`}>
                  {report.status || 'Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReportsPage;
