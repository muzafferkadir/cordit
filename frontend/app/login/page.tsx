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
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="card-brutal w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-black text-dark mb-2">LITECORD</h1>
          <p className="text-sm font-medium text-dim">Voice chat + messaging</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold mb-2 text-dark">USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-brutal w-full"
              placeholder="admin"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-dark">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-brutal w-full"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="p-3 border-[3px] border-black font-bold text-sm bg-error text-white">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-brutal w-full bg-primary text-white py-3"
          >
            {loading ? 'LOGGING IN...' : 'LOGIN'}
          </button>

          <div className="text-center border-t-[3px] border-border pt-4 mt-4">
            <p className="text-sm font-medium text-dim">
              Need an account?{' '}
              <Link href="/register" className="font-bold underline text-dark">
                REGISTER HERE
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
