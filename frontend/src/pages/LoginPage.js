import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const errorRef = useRef(null);
  const messageRef = useRef(null);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  useEffect(() => {
    if (params.get('verified') === '1') {
      setMessage('Email verified! You can sign in now.');
    } else if (params.get('error') === 'invalid_token') {
      setError('Invalid or expired verification link.');
    } else if (params.get('error') === 'missing_token') {
      setError('Missing verification token.');
    }
  }, [params]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!formData.username || !formData.password) {
      setError('Username and password required');
      return;
    }

    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password,
        }),
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      navigate('/');
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/10 p-8 shadow-2xl">
        <h1 className="text-xl font-semibold text-center mb-6">Sign in</h1>
        {error && (
          <div 
            ref={errorRef}
            role="alert"
            aria-live="assertive"
            className="mb-4 rounded-lg border border-red-400/60 bg-red-500/20 px-3 py-2 text-sm text-red-200 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400"
            tabIndex={-1}
          >
            {error}
          </div>
        )}
        {message && (
          <div 
            ref={messageRef}
            role="status"
            aria-live="polite"
            className="mb-4 rounded-lg border border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-sm text-emerald-200 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
            tabIndex={-1}
          >
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Login form">
          <div>
            <label className="block text-xs text-white/70 mb-1" htmlFor="username">
              Username <span className="text-red-400" aria-label="required">*</span>
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              placeholder="Username"
              autoComplete="username"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus-visible:outline focus-visible:outline-sky-400"
              required
              aria-required="true"
              aria-label="Username"
            />
          </div>
          <div>
            <label className="block text-xs text-white/70 mb-1" htmlFor="password">
              Password <span className="text-red-400" aria-label="required">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus-visible:outline focus-visible:outline-sky-400"
              required
              aria-required="true"
              aria-label="Password"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-sky-400 px-4 py-2 text-sm font-semibold text-[#1a1a2e] transition hover:bg-sky-300 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"
            aria-label="Sign in to your account"
          >
            Sign in
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-white/60">
          Don't have an account? <a href="/register" className="text-sky-300 underline focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 rounded px-1">Sign up</a>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
