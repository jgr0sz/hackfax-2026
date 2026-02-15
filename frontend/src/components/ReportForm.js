import React, { useState, useEffect, useRef } from 'react';

function ReportForm({ selectedLocation }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Today's date
    severity: 'low',
    location: '',
    details: '',
    quick_issue: ''
  });
  const [includeLocation, setIncludeLocation] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const submitStatusRef = useRef(null);

  // Update location field when map selection changes
  useEffect(() => {
    if (includeLocation && selectedLocation) {
      setFormData(prev => ({
        ...prev,
        location: `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`
      }));
    } else if (includeLocation) {
      setFormData(prev => ({
        ...prev,
        location: ''
      }));
    }
  }, [includeLocation, selectedLocation]);

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

    if (includeLocation && !selectedLocation) {
      setSubmitStatus({ type: 'error', message: 'Select a location on the map or uncheck "Include location".' });
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          coordinates: includeLocation ? selectedLocation : null
        })
      });

      if (!response.ok) throw new Error('Failed to submit report');
      
      const data = await response.json();
      setSubmitStatus({ type: 'success', message: 'Report submitted successfully!' });
      
      // Reset form (except location)
      setFormData({
        date: new Date().toISOString().split('T')[0],
        severity: 'low',
        location: includeLocation ? formData.location : '',
        details: '',
        quick_issue: ''
      });
    } catch (error) {
      setSubmitStatus({ type: 'error', message: error.message });
    } finally {
      setSubmitting(false);
      // Announce result to screen readers
      if (submitStatusRef.current) {
        submitStatusRef.current.focus();
      }
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <h2 className="text-xl font-bold mb-6 sm:text-2xl">Report Incident</h2>
      
      {submitStatus && (
        <div 
          ref={submitStatusRef}
          role="status"
          aria-live="assertive"
          tabIndex={-1}
          className={`mb-4 p-4 rounded-lg text-sm sm:text-base focus:outline-none focus-visible:outline focus-visible:outline-2 ${
            submitStatus.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {submitStatus.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" aria-label="Report incident form">
        {/* Quick Issue */}
        <div>
          <label htmlFor="quick_issue" className="block text-sm font-semibold text-gray-700 mb-2">
            Incident Type <span className="text-red-500" aria-label="required">*</span>
          </label>
          <select
            id="quick_issue"
            name="quick_issue"
            value={formData.quick_issue}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
            aria-describedby="incident-type-help"
            aria-invalid={formData.quick_issue === '' ? 'true' : 'false'}
            aria-required="true"
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
          <div id="incident-type-help" className="sr-only">
            Select the type of incident you are reporting
          </div>
        </div>

        {/* Date */}
        <div>
          <label htmlFor="date" className="block text-sm font-semibold text-gray-700 mb-2">
            Date <span className="text-red-500" aria-label="required">*</span>
          </label>
          <input
            id="date"
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
            aria-describedby="date-help"
            aria-required="true"
          />
          <div id="date-help" className="sr-only">
            Select the date when the incident occurred
          </div>
        </div>

        {/* Severity */}
        <fieldset>
          <legend className="block text-sm font-semibold text-gray-700 mb-3">
            Severity <span className="text-red-500" aria-label="required">*</span>
          </legend>
          <div className="space-y-2">
            <label className="flex items-center focus-within:outline focus-within:outline-2 focus-within:outline-blue-400 rounded px-2 py-1">
              <input
                type="radio"
                name="severity"
                value="low"
                checked={formData.severity === 'low'}
                onChange={handleChange}
                className="mr-2 focus:outline-none"
                aria-describedby="severity-low-desc"
              />
              <span className="text-xs sm:text-sm">Low</span>
            </label>
            <div id="severity-low-desc" className="sr-only">
              Low - Minor incident, no immediate action needed
            </div>
            
            <label className="flex items-center focus-within:outline focus-within:outline-2 focus-within:outline-blue-400 rounded px-2 py-1">
              <input
                type="radio"
                name="severity"
                value="medium"
                checked={formData.severity === 'medium'}
                onChange={handleChange}
                className="mr-2 focus:outline-none"
                aria-describedby="severity-medium-desc"
              />
              <span className="text-xs sm:text-sm">Medium</span>
            </label>
            <div id="severity-medium-desc" className="sr-only">
              Medium - Requires attention
            </div>
            
            <label className="flex items-center focus-within:outline focus-within:outline-2 focus-within:outline-blue-400 rounded px-2 py-1">
              <input
                type="radio"
                name="severity"
                value="high"
                checked={formData.severity === 'high'}
                onChange={handleChange}
                className="mr-2 focus:outline-none"
                aria-describedby="severity-high-desc"
              />
              <span className="text-xs sm:text-sm">High</span>
            </label>
            <div id="severity-high-desc" className="sr-only">
              High - Urgent, immediate action required
            </div>
          </div>
        </fieldset>

        {/* Location (optional) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Location <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600 mb-2 sm:text-sm focus-within:outline focus-within:outline-2 focus-within:outline-blue-400 rounded px-2 py-1 w-fit">
            <input
              type="checkbox"
              checked={includeLocation}
              onChange={(e) => {
                const nextValue = e.target.checked;
                setIncludeLocation(nextValue);
                if (!nextValue) {
                  setFormData(prev => ({ ...prev, location: '' }));
                }
              }}
              className="focus:outline-none"
              aria-label="Include location from map"
              aria-describedby="location-checkbox-help"
            />
            Include location from map
          </label>
          <div id="location-checkbox-help" className="sr-only">
            Uncheck to submit report without a specific location
          </div>
          <input
            type="text"
            name="location"
            value={formData.location}
            readOnly
            placeholder={includeLocation ? "Click on the map to select location" : "Location disabled"}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label="Selected location coordinates"
            aria-readonly="true"
          />
        </div>

        {/* Details */}
        <div>
          <label htmlFor="details" className="block text-sm font-semibold text-gray-700 mb-2">
            Details <span className="text-red-500" aria-label="required">*</span>
          </label>
          <textarea
            id="details"
            name="details"
            value={formData.details}
            onChange={handleChange}
            required
            rows="4"
            placeholder="Describe what happened in detail..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none resize-none"
            aria-describedby="details-help"
            aria-required="true"
          />
          <div id="details-help" className="sr-only">
            Provide a detailed description of the incident
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-3 rounded-lg font-semibold text-white transition focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
            submitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 shadow-lg focus-visible:outline-blue-400'
          }`}
          aria-busy={submitting}
          aria-label={submitting ? 'Submitting your report' : 'Submit incident report'}
        >
          {submitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </div>
  );
}

export default ReportForm;
