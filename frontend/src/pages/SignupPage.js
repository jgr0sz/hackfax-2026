import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

function SignupPage({ onSignupSuccess }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const errorRef = useRef(null);
  const successRef = useRef(null);

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
    setSuccess('');

    const username = formData.username.trim();
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    if (!username || !email || !password) {
      setError('Username, email, and password required');
      return;
    }
    if (username.length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Sign up failed');
        return;
      }
      setSuccess('Account created! You can sign in now.');
      if (onSignupSuccess) {
        await onSignupSuccess();
      }
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/10 p-8 shadow-2xl">
        <h1 className="text-xl font-semibold text-center mb-6">Create account</h1>
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
        {success && (
          <div 
            ref={successRef}
            role="status"
            aria-live="polite"
            className="mb-4 rounded-lg border border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-sm text-emerald-200 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
            tabIndex={-1}
          >
            {success}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Sign up form">
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
              minLength={2}
              required
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus-visible:outline focus-visible:outline-sky-400"
              aria-required="true"
              aria-describedby="username-help"
            />
            <div id="username-help" className="sr-only">
              Username must be at least 2 characters
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/70 mb-1" htmlFor="email">
              Email <span className="text-red-400" aria-label="required">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus-visible:outline focus-visible:outline-sky-400"
              aria-required="true"
              aria-label="Email address"
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
              placeholder="At least 6 characters"
              autoComplete="new-password"
              minLength={6}
              required
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus-visible:outline focus-visible:outline-sky-400"
              aria-required="true"
              aria-describedby="password-help"
            />
            <div id="password-help" className="sr-only">
              Password must be at least 6 characters
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-sky-400 px-4 py-2 text-sm font-semibold text-[#1a1a2e] transition hover:bg-sky-300 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"
            aria-label="Create your account"
          >
            Sign up
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-white/60">
          Already have an account? <Link to="/login" className="text-sky-300 underline focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 rounded px-1">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;
