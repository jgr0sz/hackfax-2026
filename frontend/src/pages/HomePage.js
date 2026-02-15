import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function HomePage() {
  const [feedItems, setFeedItems] = useState([]);
  const [feedStatus, setFeedStatus] = useState({ loading: true, message: '' });
  const [userCoords, setUserCoords] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      setCurrentUser(data.user || null);
    } catch (err) {
      setCurrentUser(null);
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
      throw new Error('Unexpected response format');
    }

    if (!res.ok) throw new Error('Could not load feed.');
    const data = await res.json();
    const feed = data.feed || [];
    setFeedItems(feed);
    setFeedStatus({
      loading: false,
      message: feed.length ? '' : 'No events within 0.5 miles.'
    });
  } catch (err) {
    setFeedItems([]);
    setFeedStatus({ loading: false, message: err.message || 'Error loading feed.' });
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface)] text-[var(--ink)]">
      <div className="pointer-events-none absolute -left-32 top-0 h-64 w-64 rounded-full bg-emerald-700/15 blur-3xl" />
      <div className="pointer-events-none absolute right-10 top-20 h-72 w-72 rounded-full bg-emerald-900/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,20,20,0.08),transparent_55%)]" />

      <div className="relative mx-auto w-full max-w-6xl px-6 pb-20 pt-12">
        <header className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-24 items-center justify-center rounded-md border border-black/10 bg-white/70 text-xs font-semibold uppercase tracking-wide">
              GMU Logo
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-black/60">Patriot Radar</p>
              <h1 className="text-3xl font-semibold md:text-4xl">Campus Safety Reporting</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-full border border-black/15 bg-white/80 px-4 py-2 text-sm font-semibold text-black/80 shadow-sm transition hover:bg-white"
            >
              Login
            </Link>
          </div>
        </header>

        <div className="mt-12 grid gap-6 lg:grid-cols-[320px_1fr]">
          <section className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-sm">
            <div className="mb-4 inline-flex rounded-full bg-black/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-black/70">
              Live Report Feed
            </div>
                        {/* Login Required Message */}
            {!currentUser && (
              <div className="container mx-auto px-4 py-12">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
                  You must be logged in to view reports.{' '}
                  <Link to="/login" className="font-semibold underline">
                    Login to view
                  </Link>
                </div>
              </div>
            )}

            {feedStatus.loading && (
              <div className="text-sm text-black/60">Loading feed...</div>
            )}
            {!feedStatus.loading && feedStatus.message && (
              <div className="text-sm text-black/60">{feedStatus.message}</div>
            )}
            <div className="space-y-4">
              {feedItems.map(({ report, distance_miles }) => {
                const upCount = report.upvote_count ?? 0;
                const downCount = report.downvote_count ?? 0;
                const userVote = report.user_vote ?? 0;
                const isAdmin = currentUser && currentUser.account_type === 'admin';
                const addr = report.address || '';
                return (
                  <div
                    key={report.id}
                    className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm"
                  >
                    <div className="flex items-center justify-between text-xs text-white/70">
                      <span className="uppercase tracking-wide">{report.verified ? 'Verified' : 'Unverified'}</span>
                      <span>{distance_miles} mi</span>
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
                        className={`rounded-full border px-3 py-1 ${
                          userVote === 1 ? 'border-white bg-white text-[var(--accent)]' : 'border-white/50'
                        }`}
                      >
                        Up {upCount}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVote(report.id, -1)}
                        className={`rounded-full border px-3 py-1 ${
                          userVote === -1 ? 'border-white bg-white text-[var(--accent)]' : 'border-white/50'
                        }`}
                      >
                        Down {downCount}
                      </button>
                      {isAdmin && !report.verified && (
                        <button
                          type="button"
                          onClick={() => handleVerify(report.id)}
                          className="rounded-full border border-white/50 px-3 py-1"
                        >
                          Verify
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDelete(report.id)}
                          className="rounded-full border border-white/50 px-3 py-1"
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
              >
                Report an Incident
              </Link>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,84,63,0.2),transparent_50%)]" />
              <div className="relative grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold">Fast incident response</h2>
                  <p className="text-sm text-black/65">
                    Pinpoint a location, submit details, and keep the community informed in real time.
                  </p>
                  <div className="flex gap-3">
                    <Link
                      to="/map"
                      className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white"
                    >
                      Open Map
                    </Link>
                    <Link
                      to="/reports"
                      className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-xs font-semibold text-black/70"
                    >
                      View Reports
                    </Link>
                  </div>
                </div>
                <div className="relative min-h-[220px] rounded-xl border border-black/10 bg-white/70 shadow-inner">
                  <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(5,50,38,0.08)_0%,rgba(255,255,255,0.6)_50%,rgba(5,50,38,0.08)_100%)]" />
                  <div className="relative flex h-full items-center justify-center text-xs font-semibold uppercase tracking-wide text-black/50">
                    Map Preview
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
