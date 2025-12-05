'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useStore((state) => state.setUser);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authAPI.login(username, password);
      
      const user = {
        username: data.username,
        role: data.role,
        token: data.token,
      };
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-main)', padding: '1rem' }}>
      <div className="card-brutal w-full" style={{ maxWidth: '460px', padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <h1 className="text-4xl font-black" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            LITECORD
          </h1>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Voice chat + messaging
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              USERNAME
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-brutal"
              placeholder="admin"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-brutal"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="p-3 border-3 border-black font-bold text-sm" style={{ background: 'var(--error)', color: 'white', borderWidth: '3px' }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-brutal w-full"
            style={{ background: 'var(--bg-accent)' }}
          >
            {loading ? '⏳ LOGGING IN...' : '→ LOGIN'}
          </button>

          <div className="text-center" style={{ borderTop: '3px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Need an account?{' '}
              <Link href="/register" className="font-bold underline" style={{ color: 'var(--text-primary)' }}>
                REGISTER HERE
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
