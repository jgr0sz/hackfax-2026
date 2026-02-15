import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

function MapPage() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const reportMarkersRef = useRef([]);
  const notifiedReportIdsRef = useRef(new Set());

  const [status, setStatus] = useState('Ready.');
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({ date: '', time: '', severity: '', details: '' });
  const [coords, setCoords] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [feedItems, setFeedItems] = useState([]);
  const [feedMessage, setFeedMessage] = useState('Loading...');

  const apiKey = process.env.REACT_APP_API_KEY;
  const region = 'us-east-1';

  const escapeHtml = useCallback((value) => {
    if (value == null || value === '') return '';
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }, []);

  const formatReportDateTime = useCallback((dateStr, createdStr) => {
    if (!dateStr && !createdStr) return '—';
    let output = '';
    if (dateStr) {
      const hasTime = dateStr.indexOf('T') >= 0;
      const parsed = hasTime
        ? new Date(dateStr.length === 16 ? `${dateStr}:00` : dateStr)
        : new Date(`${dateStr}T12:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        output = parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        if (hasTime) {
          output += `, ${parsed.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
        }
      } else {
        output = dateStr;
      }
    }
    if (createdStr) {
      const created = new Date(createdStr);
      if (!Number.isNaN(created.getTime())) {
        output += `${output ? ' · ' : ''}Reported ${created.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      }
    }
    return output || dateStr || createdStr || '—';
  }, []);

  const reportPopupHtml = useCallback((report) => {
    const sev = (report.severity || '—').toLowerCase();
    const dateTimeStr = formatReportDateTime(report.date, report.created_at);
    const details = escapeHtml((report.details || '—').slice(0, 200));
    const address = escapeHtml(report.address || '—');
    const verified = report.verified
      ? '<span style="color:#28a745;">✓ Verified</span>'
      : '<span style="color:#6c757d;">Unverified</span>';
    return `<div style="min-width:200px;max-width:280px;font-size:13px;">
      <div style="font-weight:bold;margin-bottom:6px;">${sev} ${verified}</div>
      <div style="color:#666;margin-bottom:4px;">🕐 ${escapeHtml(dateTimeStr)}</div>
      <div style="color:#555;margin-bottom:4px;">📍 ${address}</div>
      <div style="margin-top:6px;">${details}</div>
    </div>`;
  }, [escapeHtml, formatReportDateTime]);

  const clearReportMarkers = useCallback(() => {
    reportMarkersRef.current.forEach((markerItem) => markerItem.remove());
    reportMarkersRef.current = [];
  }, []);

  const updateReportMarkers = useCallback((reports) => {
    if (!mapRef.current) return;
    clearReportMarkers();
    (reports || []).forEach((report) => {
      const loc = report.location || {};
      if (loc.latitude == null || loc.longitude == null) return;
      const markerItem = new maplibregl.Marker({ color: '#e74c3c' })
        .setLngLat([loc.longitude, loc.latitude])
        .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(reportPopupHtml(report)))
        .addTo(mapRef.current);
      reportMarkersRef.current.push(markerItem);
    });
  }, [clearReportMarkers, reportPopupHtml]);

  const refreshReportMarkers = useCallback(async () => {
    try {
      const res = await fetch('/reports', { credentials: 'same-origin' });
      if (res.ok) {
        const reports = await res.json();
        updateReportMarkers(reports);
      }
    } catch (err) {}
  }, [updateReportMarkers]);

  const getCoords = useCallback(() => new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracyMeters: pos.coords.accuracy,
      }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }), []);

  const setMarker = useCallback((lat, lng) => {
    if (!mapRef.current) return;
    if (!markerRef.current) markerRef.current = new maplibregl.Marker();
    markerRef.current.setLngLat([lng, lat]).addTo(mapRef.current);
    mapRef.current.flyTo({ center: [lng, lat], zoom: 15 });
  }, []);

  const openForm = useCallback(() => {
    const now = new Date();
    setFormData({
      date: now.toISOString().split('T')[0],
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      severity: '',
      details: '',
    });
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setFormData((prev) => ({ ...prev, severity: '', details: '', time: '' }));
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      setCurrentUser(data.user || null);
      if (data.user === null) {
        window.location.href = '/login';
      }
    } catch (err) {
      setCurrentUser(null);
    }
  }, []);

  const requestNotificationPermission = useCallback(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return;
    if (Notification.permission !== 'denied') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const showAlertNotification = useCallback((title, body, report) => {
    const severity = report && report.severity ? report.severity.toLowerCase() : 'unknown';
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    if (severity === 'high' || severity === 'critical') {
      try {
        const alarm = new Audio('/static/audio/alarm.mp3');
        alarm.volume = 0.7;
        alarm.play().catch(() => {});
      } catch (err) {}
    }
  }, []);

  const checkNearbyReports = useCallback(async () => {
    if (!coords || !coords.latitude || !coords.longitude) return;
    try {
      const res = await fetch('/reports/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          radius_miles: 0.5,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const nearby = data.nearby_reports || [];
      for (const item of nearby) {
        const report = item.report;
        const reportId = report && report.id;
        if (reportId != null && notifiedReportIdsRef.current.has(reportId)) continue;
        if (reportId != null) notifiedReportIdsRef.current.add(reportId);

        const distance = item.distance_miles;
        const severity = report && report.severity ? report.severity.toLowerCase() : 'unknown';
        let severityEmoji = '⚠️';
        if (severity === 'low') severityEmoji = '🟡';
        else if (severity === 'medium') severityEmoji = '🟠';
        else if (severity === 'high') severityEmoji = '🔴';
        else if (severity === 'critical') severityEmoji = '🔴🔴';

        showAlertNotification(
          `${severityEmoji} ${severity.toUpperCase()} - ${distance.toFixed(2)} miles away`,
          `${report.details || ''}`,
          report
        );
        break;
      }
    } catch (err) {}
  }, [coords, showAlertNotification]);

  const fetchFeed = useCallback(async () => {
    if (!coords || !coords.latitude || !coords.longitude) {
      setFeedMessage('Enable location to see feed.');
      setFeedItems([]);
      return;
    }
    try {
      const res = await fetch('/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
      });
      if (!res.ok) {
        setFeedMessage('Could not load feed.');
        return;
      }
      const data = await res.json();
      const feed = data.feed || [];
      if (!feed.length) {
        setFeedMessage('No events within 0.5 miles.');
      } else {
        setFeedMessage('');
      }
      setFeedItems(feed);
    } catch (err) {
      setFeedMessage('Error loading feed.');
    }
  }, [coords]);

  const voteReport = useCallback(async (reportId, vote) => {
    try {
      const res = await fetch(`/reports/${reportId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ vote }),
      });
      if (res.ok) fetchFeed();
    } catch (err) {}
  }, [fetchFeed]);

  const verifyReport = useCallback(async (reportId) => {
    try {
      const res = await fetch(`/reports/${reportId}/verify`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (res.ok) fetchFeed();
    } catch (err) {}
  }, [fetchFeed]);

  const deleteReport = useCallback(async (reportId) => {
    if (!window.confirm('Delete this report?')) return;
    try {
      const res = await fetch(`/reports/${reportId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (res.ok) {
        fetchFeed();
        refreshReportMarkers();
      }
    } catch (err) {}
  }, [fetchFeed, refreshReportMarkers]);

  useEffect(() => {
    if (!apiKey || mapRef.current || !mapContainerRef.current) return;

    const initMap = async () => {
      let mapCenter = [-123.1187, 49.2819];
      try {
        const pos = await getCoords();
        mapCenter = [pos.longitude, pos.latitude];
        setCoords(pos);
      } catch (err) {
        setStatus(`Could not get user location, using default: ${err.message}`);
      }

      mapRef.current = new maplibregl.Map({
        container: mapContainerRef.current,
        center: mapCenter,
        zoom: 15,
        style: `https://maps.geo.${region}.amazonaws.com/v2/styles/Standard/descriptor?key=${apiKey}`,
        validateStyle: false,
      });

      mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-left');

      const centerBtn = document.createElement('button');
      centerBtn.textContent = '📍';
      centerBtn.style.cssText = `
        position: absolute;
        top: 14px;
        left: 60px;
        z-index: 100;
        width: 40px;
        height: 40px;
        padding: 0;
        margin: 0;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;
      centerBtn.addEventListener('click', async () => {
        try {
          const pos = await getCoords();
          mapRef.current.flyTo({ center: [pos.longitude, pos.latitude], zoom: 15 });
          if (userMarkerRef.current) {
            userMarkerRef.current.setLngLat([pos.longitude, pos.latitude]);
          } else {
            userMarkerRef.current = new maplibregl.Marker({ color: 'blue' })
              .setLngLat([pos.longitude, pos.latitude])
              .setPopup(new maplibregl.Popup().setHTML('<strong>You are here</strong>'))
              .addTo(mapRef.current);
          }
          setCoords(pos);
          fetchFeed();
        } catch (err) {
          setStatus(`Could not get location: ${err.message}`);
        }
      });
      mapContainerRef.current.appendChild(centerBtn);

      mapRef.current.on('load', () => {
        if (coords) {
          userMarkerRef.current = new maplibregl.Marker({ color: 'blue' })
            .setLngLat([coords.longitude, coords.latitude])
            .setPopup(new maplibregl.Popup().setHTML('<strong>You are here</strong>'))
            .addTo(mapRef.current);
        }
      });

      mapRef.current.on('click', (e) => {
        if (!formOpen) return;
        const clicked = {
          latitude: e.lngLat.lat,
          longitude: e.lngLat.lng,
          accuracyMeters: null,
        };
        setCoords(clicked);
        setMarker(clicked.latitude, clicked.longitude);
        setStatus(
          `Location set from map click:\nlat=${clicked.latitude.toFixed(6)} lng=${clicked.longitude.toFixed(6)}\n\nFill in details and submit.`
        );
      });
    };

    initMap();
  }, [apiKey, coords, fetchFeed, formOpen, getCoords, setMarker]);

  useEffect(() => {
    loadUser();
    requestNotificationPermission();
  }, [loadUser, requestNotificationPermission]);

  useEffect(() => {
    if (!coords) return;
    fetchFeed();
    refreshReportMarkers();
    checkNearbyReports();
  }, [checkNearbyReports, coords, fetchFeed, refreshReportMarkers]);

  useEffect(() => {
    const feedInterval = window.setInterval(() => {
      fetchFeed();
      refreshReportMarkers();
    }, 30000);
    return () => window.clearInterval(feedInterval);
  }, [fetchFeed, refreshReportMarkers]);

  const handleReportAuto = async () => {
    setStatus('Requesting location… (works on HTTPS or localhost)');
    try {
      const pos = await getCoords();
      setCoords(pos);
      setMarker(pos.latitude, pos.longitude);
      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat([pos.longitude, pos.latitude]);
      } else if (mapRef.current) {
        userMarkerRef.current = new maplibregl.Marker({ color: 'blue' })
          .setLngLat([pos.longitude, pos.latitude])
          .setPopup(new maplibregl.Popup().setHTML('<strong>You are here</strong>'))
          .addTo(mapRef.current);
      }
      setStatus(
        `Location captured:\nlat=${pos.latitude.toFixed(6)} lng=${pos.longitude.toFixed(6)} (±${Math.round(pos.accuracyMeters)}m)\n\nTip: you can also click the map to adjust the pin.`
      );
      openForm();
    } catch (err) {
      setStatus(`Could not get location: ${err.message || err}\n\nClick "Manual" then click on the map to drop a pin.`);
    }
  };

  const handleManual = () => {
    setCoords(null);
    setStatus('Manual report: fill in details. If you want a location, click on the map to drop a pin.');
    openForm();
  };

  const handleCancel = () => {
    setCoords(null);
    setStatus('Canceled.');
    closeForm();
  };

  const handleSubmit = async () => {
    if (!formData.date) return setStatus('Pick a date.');
    if (!formData.severity) return setStatus('Pick a severity.');
    if (!formData.details.trim()) return setStatus('Enter details.');

    let reportDate = formData.date;
    if (formData.time) reportDate = `${formData.date}T${formData.time}`;

    const payload = {
      date: reportDate,
      severity: formData.severity,
      location: coords ?? { latitude: null, longitude: null, accuracyMeters: null },
      details: formData.details.trim(),
    };

    setStatus('Submitting report…');

    try {
      const res = await fetch('/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(body)}`);

      setStatus('Submitted ✅ (report saved)');
      closeForm();
      checkNearbyReports();
      fetchFeed();
      refreshReportMarkers();
    } catch (err) {
      setStatus(`Submit failed ❌\n${err.message}`);
    }
  };

  const handleLogout = async () => {
    await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.href = '/login';
  };

  const feedTitle = useMemo(() => (
    <h3 className="text-sm font-semibold">Feed (within 0.5 mi)</h3>
  ), []);

  return (
    <div className="relative h-screen w-full">
      <div
        ref={mapContainerRef}
        className={`h-full w-full ${apiKey ? '' : 'bg-gray-100'}`}
      />

      {!apiKey && (
        <div className="absolute left-4 right-4 top-4 z-20 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 md:left-4 md:right-auto md:max-w-xs">
          Map is unavailable. Add `REACT_APP_API_KEY` to `frontend/.env` and restart the dev server to enable pins.
        </div>
      )}

      <div className="absolute left-4 right-4 top-4 z-10 flex max-h-[70vh] w-auto flex-col gap-3 font-sans md:left-auto md:right-4 md:top-4 md:max-h-[calc(100vh-28px)] md:w-[340px]">
        <div className="rounded-xl bg-white/95 p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-600">
            <span>{currentUser ? `${currentUser.username}${currentUser.account_type === 'admin' ? ' (admin)' : ''}` : '—'}</span>
            <span className="flex items-center gap-2">
              {currentUser && currentUser.account_type === 'admin' && (
                <a href="/admin" className="text-xs text-blue-600">Admin</a>
              )}
              <button type="button" onClick={handleLogout} className="rounded-md border border-gray-200 px-2 py-1 text-xs">Logout</button>
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleReportAuto}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
            >
              Report incident (auto locate)
            </button>
            <button
              type="button"
              onClick={handleManual}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
            >
              Manual
            </button>
          </div>

          {formOpen && (
            <div className="mt-3 text-xs text-gray-700">
              <label className="block text-[11px]">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
                required
              />
              <label className="mt-2 block text-[11px]">Time</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
              />
              <label className="mt-2 block text-[11px]">Severity</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData((prev) => ({ ...prev, severity: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
              >
                <option value="">Select…</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <label className="mt-2 block text-[11px]">Details</label>
              <textarea
                value={formData.details}
                onChange={(e) => setFormData((prev) => ({ ...prev, details: e.target.value }))}
                placeholder="What happened?"
                className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-2 text-xs"
                rows={4}
              />
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={handleSubmit} className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs">Submit</button>
                <button type="button" onClick={handleCancel} className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs">Cancel</button>
              </div>
            </div>
          )}

          <div className="mt-3 whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 px-2 py-2 text-xs text-gray-600">
            {status}
          </div>
        </div>

        <div className="flex-1 rounded-xl bg-white/95 p-3 shadow-lg">
          {feedTitle}
          <div className="mt-2 max-h-[35vh] overflow-y-auto md:max-h-[280px]">
            {feedMessage && <div className="text-xs text-gray-500">{feedMessage}</div>}
            {feedItems.map(({ report, distance_miles }) => {
              const isAdmin = currentUser && currentUser.account_type === 'admin';
              const badgeText = report.verified ? 'Verified' : 'Unverified';
              const upCount = report.upvote_count ?? 0;
              const downCount = report.downvote_count ?? 0;
              const userVote = report.user_vote ?? null;
              const upActive = userVote === 1;
              const downActive = userVote === -1;
              const addr = report.address || '';
              return (
                <div
                  key={report.id}
                  className={`mb-2 rounded-lg border-l-4 bg-gray-50 p-2 text-xs ${report.verified ? 'border-green-600' : 'border-gray-500'}`}
                >
                  <span className={`mr-2 rounded px-2 py-[2px] text-[10px] ${report.verified ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}`}>
                    {badgeText}
                  </span>
                  <strong>{(report.severity || '').toLowerCase()}</strong> · {distance_miles} mi
                  <div className="mt-1 text-[11px] text-gray-500">🕐 {formatReportDateTime(report.date, report.created_at)}</div>
                  {addr && (
                    <div className="mt-1 text-[11px] text-gray-500" title={addr}>
                      📍 {addr.slice(0, 50)}{addr.length > 50 ? '…' : ''}
                    </div>
                  )}
                  <div className="mt-1">{(report.details || '').slice(0, 80)}{(report.details || '').length > 80 ? '…' : ''}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => voteReport(report.id, 1)}
                      className={`rounded border px-2 py-1 text-[11px] ${upActive ? 'bg-green-600 text-white' : 'border-gray-300'}`}
                    >
                      ↑ {upCount}
                    </button>
                    <button
                      type="button"
                      onClick={() => voteReport(report.id, -1)}
                      className={`rounded border px-2 py-1 text-[11px] ${downActive ? 'bg-red-600 text-white' : 'border-gray-300'}`}
                    >
                      ↓ {downCount}
                    </button>
                    {isAdmin && !report.verified && (
                      <button
                        type="button"
                        onClick={() => verifyReport(report.id)}
                        className="rounded border border-gray-300 px-2 py-1 text-[11px]"
                      >
                        Verify
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => deleteReport(report.id)}
                        className="ml-auto rounded border border-red-500 px-2 py-1 text-[11px] text-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapPage;
