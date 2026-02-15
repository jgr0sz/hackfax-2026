import React, { useState, useEffect } from 'react';

function ReportForm({ selectedLocation }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Today's date
    severity: 'low',
    location: '',
    details: '',
    quick_issue: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  // Update location field when map selection changes
  useEffect(() => {
    if (selectedLocation) {
      setFormData(prev => ({
        ...prev,
        location: `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`
      }));
    }
  }, [selectedLocation]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch('/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          coordinates: selectedLocation
        })
      });

      if (!response.ok) throw new Error('Failed to submit report');
      
      const data = await response.json();
      setSubmitStatus({ type: 'success', message: 'Report submitted successfully!' });
      
      // Reset form (except location)
      setFormData({
        date: new Date().toISOString().split('T')[0],
        severity: 'low',
        location: formData.location,
        details: '',
        quick_issue: ''
      });
    } catch (error) {
      setSubmitStatus({ type: 'error', message: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Report Incident</h2>
      
      {submitStatus && (
        <div className={`mb-4 p-4 rounded-lg ${
          submitStatus.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {submitStatus.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick Issue */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Incident Type
          </label>
          <select
            name="quick_issue"
            value={formData.quick_issue}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select incident type</option>
            <option value="Theft">Theft</option>
            <option value="Vandalism">Vandalism</option>
            <option value="Suspicious Activity">Suspicious Activity</option>
            <option value="Medical Emergency">Medical Emergency</option>
            <option value="Fire">Fire</option>
            <option value="Assault">Assault</option>
            <option value="Property Damage">Property Damage</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Date
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Severity */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Severity
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="severity"
                value="low"
                checked={formData.severity === 'low'}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm">Low - Minor incident, no immediate action needed</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="severity"
                value="medium"
                checked={formData.severity === 'medium'}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm">Medium - Requires attention</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="severity"
                value="high"
                checked={formData.severity === 'high'}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm">High - Urgent, immediate action required</span>
            </label>
          </div>
        </div>

        {/* Location (read-only, set by map) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Location (click on map to set)
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            readOnly
            placeholder="Click on the map to select location"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
          />
        </div>

        {/* Details */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Details
          </label>
          <textarea
            name="details"
            value={formData.details}
            onChange={handleChange}
            required
            rows="4"
            placeholder="Describe what happened in detail..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || !selectedLocation}
          className={`w-full py-3 rounded-lg font-semibold text-white transition ${
            submitting || !selectedLocation
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 shadow-lg'
          }`}
        >
          {submitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </div>
  );
}

export default ReportForm;
