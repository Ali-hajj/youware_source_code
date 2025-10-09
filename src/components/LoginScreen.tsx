import React, { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useEventStore } from '../store/eventStore';

export const LoginScreen: React.FC = () => {
  const { login, forceLogin, isLoading, error, clearError } = useAuthStore();
  const { loadEventsFromDatabase } = useEventStore();
  const bypassEnabled =
    import.meta.env.VITE_AUTH_BYPASS === 'true' ||
    (typeof window !== 'undefined' && Boolean((window as any)?.ywConfig?.authBypass));
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    clearError();

    try {
      if (mode === 'login') {
        await login({ username, password });
        // Load events immediately after successful login
        console.log('🔄 Login successful, loading events...');
        loadEventsFromDatabase().catch((error) => {
          console.error('Failed to load events after login:', error);
        });
      } else if (mode === 'signup') {
        await handleSignup();
      } else if (mode === 'reset') {
        await handlePasswordReset();
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const handleSignup = async () => {
    if (!username || !password || !email) {
      throw new Error('Username, password, and email are required');
    }

    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email, first_name: firstName, last_name: lastName }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Signup failed' }));
      throw new Error(data.error || 'Signup failed');
    }

    setSuccessMessage('Account created successfully! You can now sign in.');
    setMode('login');
    setPassword('');
  };

  const handlePasswordReset = async () => {
    if (!email) {
      throw new Error('Email is required for password reset');
    }

    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Password reset failed' }));
      throw new Error(data.error || 'Password reset failed');
    }

    setSuccessMessage('Password reset instructions sent to your email.');
    setMode('login');
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-6">
      <div className="bg-white/95 shadow-2xl rounded-3xl w-full max-w-md p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/30 via-white to-slate-100/60 pointer-events-none" />
        <div className="relative space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">
              {mode === 'login' && 'Event Manager Login'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'reset' && 'Reset Password'}
            </h1>
            <p className="text-sm text-slate-600">
              {mode === 'login'
                ? 'Use your organization credentials to access the dashboard.'
                : mode === 'signup'
                ? 'Create a new account to access the event management system.'
                : 'Enter your email to receive password reset instructions.'}
            </p>
            {mode === 'login' && (
              <p
                className="text-xs text-slate-500 select-none cursor-pointer"
                onClick={(event) => {
                  if (event.detail === 3 && bypassEnabled) {
                    setLocalError(null);
                    clearError();
                    forceLogin({ username: 'admin' });
                    setSuccessMessage('Bypass mode enabled. You are logged in as admin.');
                    // Load events after bypass login
                    console.log('🔄 Bypass login activated, loading events...');
                    loadEventsFromDatabase().catch((error) => {
                      console.error('Failed to load events after bypass:', error);
                    });
                  }
                }}
              >
                © All Copyright is reserved for Stuntec by Mike Akanan 313.938.6666
              </p>
            )}

          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'reset' ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="reset-email">
                      Email
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-slate-800"
                      placeholder="your@email.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700" htmlFor="username">
                        Username
                      </label>
                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-slate-800"
                        placeholder="Enter your username"
                        autoComplete="username"
                        required
                      />
                    </div>

                    {mode === 'signup' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700" htmlFor="email">
                            Email
                          </label>
                          <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-slate-800"
                            placeholder="your@email.com"
                            autoComplete="email"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700" htmlFor="firstName">
                              First Name
                            </label>
                            <input
                              id="firstName"
                              type="text"
                              value={firstName}
                              onChange={(event) => setFirstName(event.target.value)}
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-slate-800"
                              placeholder="First"
                              autoComplete="given-name"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700" htmlFor="lastName">
                              Last Name
                            </label>
                            <input
                              id="lastName"
                              type="text"
                              value={lastName}
                              onChange={(event) => setLastName(event.target.value)}
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-slate-800"
                              placeholder="Last"
                              autoComplete="family-name"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700" htmlFor="password">
                        Password
                      </label>
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-slate-800"
                        placeholder="••••••••"
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        required
                      />
                    </div>
                  </>
                )}

            {(localError || error) && (
              <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {localError || error}
              </div>
            )}

            {successMessage && (
              <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading
                ? mode === 'signup'
                  ? 'Creating account…'
                  : mode === 'reset'
                  ? 'Sending reset link…'
                  : 'Signing in…'
                : mode === 'signup'
                ? 'Create Account'
                : mode === 'reset'
                ? 'Send Reset Link'
                : 'Sign in'}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-200 space-y-3">
              {mode === 'login' && (
                <>
                  <button
                    onClick={() => {
                      setMode('signup');
                      setLocalError(null);
                      setSuccessMessage(null);
                    }}
                    className="w-full text-sm text-slate-600 hover:text-amber-600 font-medium transition-colors"
                  >
                    Don't have an account? Sign up
                  </button>
                  <button
                    onClick={() => {
                      setMode('reset');
                      setLocalError(null);
                      setSuccessMessage(null);
                    }}
                    className="w-full text-sm text-slate-600 hover:text-amber-600 font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Forgot your password?
                  </button>
                  {bypassEnabled && (
                    <button
                      onClick={() => {
                        setLocalError(null);
                        clearError();
                        forceLogin({ username: username || 'admin' });
                        setSuccessMessage('Bypass mode enabled. You are logged in as admin.');
                        // Load events after bypass login
                        console.log('🔄 Manual bypass activated, loading events...');
                        loadEventsFromDatabase().catch((error) => {
                          console.error('Failed to load events after manual bypass:', error);
                        });
                      }}
                      className="w-full text-sm text-amber-600 hover:text-amber-700 font-semibold transition-colors"
                    >
                      Enter without server (bypass)
                    </button>
                  )}
                </>
              )}

              {(mode === 'signup' || mode === 'reset') && (
                <button
                  onClick={() => {
                    setMode('login');
                    setLocalError(null);
                    setSuccessMessage(null);
                  }}
                  className="w-full text-sm text-slate-600 hover:text-amber-600 font-medium transition-colors"
                >
                  Back to sign in
                </button>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};
