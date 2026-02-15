import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import gmuLogo from '../assets/patriot-radar-logo.png';

function HomePage() {
  const [feedItems, setFeedItems] = useState([]);
  const [feedStatus, setFeedStatus] = useState({ loading: true, message: '' });
  const [userCoords, setUserCoords] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const liveRegionRef = useRef(null);
  const mapPreviewRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const previewMarkersRef = useRef([]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      setCurrentUser(data.user || null);
    } catch (err) {
      setCurrentUser(null);
    } finally {
      setUserLoading(false);
    }
  }, []);

  const getCoords = useCallback(() => new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'));
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

  const fetchFeed = useCallback(async (coords) => {
  if (!coords || coords.latitude == null || coords.longitude == null) {
    setFeedStatus({ loading: false, message: 'Enable location to see feed.' });
    setFeedItems([]);
    return;
  }
  setFeedStatus({ loading: true, message: '' });
  try {
    const res = await fetch('/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        latitude: coords.latitude,
        longitude: coords.longitude,
      })
    });

    // Check if the response is JSON
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Unable to load feed. Please try again later.');
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error('Authentication required. Please log in again.');
      }
      throw new Error('Unable to load feed. Please try refreshing the page.');
    }
    const data = await res.json();
    const feed = data.feed || [];
    setFeedItems(feed);
    setFeedStatus({
      loading: false,
      message: feed.length ? '' : 'No events within 0.5 miles.'
    });
  } catch (err) {
    setFeedItems([]);
    setFeedStatus({ 
      loading: false, 
      message: err.message || 'An unexpected error occurred. Please try again later.' 
    });
  }
}, []);

  const formatReportDateTime = useCallback((dateStr, createdStr) => {
    if (!dateStr && !createdStr) return '-';
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
    return output || dateStr || createdStr || '-';
  }, []);

  const handleVote = useCallback(async (reportId, vote) => {
    if (!userCoords) return;
    try {
      const res = await fetch(`/reports/${reportId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ vote })
      });
      if (res.ok) fetchFeed(userCoords);
    } catch (err) {}
  }, [fetchFeed, userCoords]);

  const handleVerify = useCallback(async (reportId) => {
    if (!userCoords) return;
    try {
      const res = await fetch(`/reports/${reportId}/verify`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (res.ok) fetchFeed(userCoords);
    } catch (err) {}
  }, [fetchFeed, userCoords]);

  const handleDelete = useCallback(async (reportId) => {
    if (!userCoords) return;
    if (!window.confirm('Delete this report?')) return;
    try {
      const res = await fetch(`/reports/${reportId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (res.ok) fetchFeed(userCoords);
    } catch (err) {}
  }, [fetchFeed, userCoords]);

  useEffect(() => {
    fetchUser();
    getCoords()
      .then((coords) => {
        setUserCoords(coords);
        fetchFeed(coords);
      })
      .catch(() => {
        setFeedStatus({ loading: false, message: 'Enable location to see feed.' });
      });
  }, [fetchUser, fetchFeed, getCoords]);

  useEffect(() => {
    if (!userCoords) return undefined;
    const intervalId = window.setInterval(() => fetchFeed(userCoords), 30000);
    return () => window.clearInterval(intervalId);
  }, [fetchFeed, userCoords]);

  // Initialize and update map preview
  useEffect(() => {
    if (!mapPreviewRef.current) return;

    // Initialize map if not already done
    if (!mapInstanceRef.current) {
      const apiKey = process.env.REACT_APP_API_KEY;
      if (!apiKey) return;

      mapInstanceRef.current = new maplibregl.Map({
        container: mapPreviewRef.current,
        style: `https://api.maptiler.com/maps/streets/style.json?key=${apiKey}`,
        center: [userCoords?.longitude || -77.1, userCoords?.latitude || 38.8],
        zoom: 14,
        attributionControl: false,
      });
    }

    // Clear existing markers
    previewMarkersRef.current.forEach(m => m.remove());
    previewMarkersRef.current = [];

    // Add markers for all feed items
    if (feedItems.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      
      feedItems.forEach(({ report }) => {
        if (report.location) {
          const { latitude, longitude } = report.location;
          if (latitude != null && longitude != null) {
            // Create marker element
            const markerEl = document.createElement('div');
            markerEl.className = 'w-6 h-6 rounded-full bg-green-500 border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform';
            markerEl.style.backgroundColor = report.severity === 'high' ? '#dc2626' : report.severity === 'medium' ? '#f59e0b' : '#10b981';

            const marker = new maplibregl.Marker({ element: markerEl })
              .setLngLat([longitude, latitude])
              .addTo(mapInstanceRef.current);

            previewMarkersRef.current.push(marker);
            bounds.extend([longitude, latitude]);
          }
        }
      });

      // Fit bounds to show all markers
      if (bounds.getNorthEast().lng !== bounds.getSouthWest().lng) {
        mapInstanceRef.current.fitBounds(bounds, { padding: 40 });
      }
    } else if (userCoords) {
      // If no feed items, center on user
      mapInstanceRef.current.flyTo({
        center: [userCoords.longitude, userCoords.latitude],
        zoom: 14
      });
    }
  }, [feedItems, userCoords]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface)] text-[var(--ink)]">
      {/* Background decoration - does not block interactions */}
      <div className="pointer-events-none absolute -left-32 top-0 h-64 w-64 rounded-full bg-emerald-700/15 blur-3xl" />
      <div className="pointer-events-none absolute right-10 top-20 h-72 w-72 rounded-full bg-emerald-900/10 blur-3xl" />
      <div className="pointer-events-none fixed top-0 left-0 right-0 bottom-0 bg-[radial-gradient(circle_at_top_left,rgba(20,20,20,0.08),transparent_55%)]" />

      {/* Content wrapper - all interactive content with proper z-index */}
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-12 z-10">
        <header className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-28 w-44 items-center justify-center sm:h-40 sm:w-64 md:h-44 md:w-68">
              <img
                src={gmuLogo}
                alt="Patriot Radar logo"
                className="h-full w-auto object-contain"
              />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs uppercase tracking-[0.25em] text-black/60">Patriot Radar</p>
              <h1 className="text-2xl font-semibold sm:text-3xl md:text-4xl">Campus Safety Reporting</h1>
            </div>
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:mt-12 lg:grid-cols-[320px_1fr]">
          <section className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-sm" aria-label="Live incident feed">
            <div className="mb-4 inline-flex rounded-full bg-black/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-black/70">
              Live Report Feed
            </div>

            {/* Live region for announcements */}
            <div 
              ref={liveRegionRef}
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="sr-only"
              aria-label="feed status updates"
            >
              {feedStatus.message && `Feed: ${feedStatus.message}`}
            </div>
            
            {/* Display based on auth and loading state */}
            {!userLoading && !currentUser && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
                You must be logged in to view reports.{' '}
                <Link to="/login" className="font-semibold underline focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400">
                  Login to view
                </Link>
              </div>
            )}

            {!userLoading && currentUser && feedStatus.loading && (
              <div className="text-sm text-black/60" role="status">Loading feed...</div>
            )}
            
            {!userLoading && currentUser && !feedStatus.loading && feedStatus.message && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800" role="status">
                {feedStatus.message}
              </div>
            )}
            <div className="space-y-4" role="list">
              {feedItems.map(({ report, distance_miles }) => {
                const upCount = report.upvote_count ?? 0;
                const downCount = report.downvote_count ?? 0;
                const userVote = report.user_vote ?? 0;
                const isAdmin = currentUser && currentUser.account_type === 'admin';
                const addr = report.address || '';
                const reportTitle = `${(report.severity || 'unknown').toUpperCase()} - ${addr || 'Unknown location'}. ${distance_miles} miles away.`;
                const reportSummary = `${report.verified ? 'Verified' : 'Unverified'} incident. ${upCount} upvotes, ${downCount} downvotes.`;
                return (
                  <div
                    key={report.id}
                    className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm focus-within:outline focus-within:outline-2 focus-within:outline-blue-400"
                    role="listitem"
                    aria-label={reportTitle}
                  >
                    <div className="flex items-center justify-between text-xs text-white/70">
                      <span className="uppercase tracking-wide">{report.verified ? 'Verified' : 'Unverified'}</span>
                      <span aria-label={`Distance: ${distance_miles} miles`}>{distance_miles} mi</span>
                    </div>
                    <div className="mt-1 text-sm font-semibold">{(report.severity || 'unknown').toString()}</div>
                    <div className="mt-1 text-xs text-white/70">
                      {formatReportDateTime(report.date, report.created_at)}
                    </div>
                    {addr && (
                      <div className="mt-1 text-xs text-white/70" title={addr}>
                        {addr.slice(0, 50)}{addr.length > 50 ? '...' : ''}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-white/90">
                      {(report.details || '').toString().slice(0, 80)}
                      {(report.details || '').toString().length > 80 ? '...' : ''}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleVote(report.id, 1)}
                        className={`rounded-full border px-3 py-1 transition focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
                          userVote === 1 ? 'border-white bg-white text-[var(--accent)]' : 'border-white/50 hover:border-white'
                        }`}
                        aria-label={`Upvote this incident. Current upvotes: ${upCount}. ${userVote === 1 ? 'You have upvoted this.' : ''}`}
                        aria-pressed={userVote === 1}
                      >
                        Up {upCount}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVote(report.id, -1)}
                        className={`rounded-full border px-3 py-1 transition focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
                          userVote === -1 ? 'border-white bg-white text-[var(--accent)]' : 'border-white/50 hover:border-white'
                        }`}
                        aria-label={`Downvote this incident. Current downvotes: ${downCount}. ${userVote === -1 ? 'You have downvoted this.' : ''}`}
                        aria-pressed={userVote === -1}
                      >
                        Down {downCount}
                      </button>
                      {isAdmin && !report.verified && (
                        <button
                          type="button"
                          onClick={() => handleVerify(report.id)}
                          className="rounded-full border border-white/50 px-3 py-1 transition hover:border-white focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                          aria-label="Verify this incident"
                        >
                          Verify
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDelete(report.id)}
                          className="rounded-full border border-white/50 px-3 py-1 transition hover:border-white focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                          aria-label="Delete this incident"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <Link
                to="/map"
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-dark)]"
                tabIndex={0}
              >
                Report an Incident
              </Link>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,84,63,0.2),transparent_50%)]" />
              <div className="relative grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold sm:text-2xl">Fast incident response</h2>
                  <p className="text-sm text-black/65 sm:text-base">
                    Pinpoint a location, submit details, and keep the community informed in real time.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link
                      to="/map"
                      className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-dark)]"
                      aria-label="Open map to report an incident"
                      tabIndex={0}
                    >
                      Open Map
                    </Link>
                    <Link
                      to="/reports"
                      className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-xs font-semibold text-black/70 transition hover:bg-white"
                      aria-label="View all incident reports"
                      tabIndex={0}
                    >
                      View Reports
                    </Link>
                  </div>
                </div>
                <div 
                  className="relative min-h-[220px] rounded-xl border border-black/10 bg-white/70 shadow-inner overflow-hidden"
                  aria-label="Map preview showing all incident locations"
                  role="img"
                >
                  <div ref={mapPreviewRef} className="absolute inset-0 z-0" />
                  {!process.env.REACT_APP_API_KEY && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
                      <span className="text-xs font-semibold text-black/60">Map unavailable</span>
                    </div>
                  )}
                  {/* Screen reader description of incidents on map */}
                  <div className="sr-only" aria-live="polite" aria-atomic="true">
                    Map showing {feedItems.length} incident{feedItems.length !== 1 ? 's' : ''} nearby.
                    {feedItems.length > 0 && (
                      <>
                        <strong>Incidents:</strong>
                        <ul>
                          {feedItems.slice(0, 5).map(({ report, distance_miles }) => (
                            <li key={report.id}>
                              {report.severity} severity incident at {report.address || 'Unknown location'}, {distance_miles} miles away
                            </li>
                          ))}
                          {feedItems.length > 5 && <li>and {feedItems.length - 5} more incidents</li>}
                        </ul>
                      </>
                    )}
                    <Link to="/map" className="underline">
                      Open full map with report details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
