'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI, inviteAPI } from '@/lib/api';
import { useStore } from '@/lib/store';

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useStore((state) => state.setUser);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);

  const validateCode = async (code: string) => {
    if (code.length !== 8) {
      setCodeValid(null);
      return;
    }

    setValidatingCode(true);
    try {
      const result = await inviteAPI.validate(code);
      setCodeValid(result.valid);
      if (!result.valid) {
        setError(result.reason || 'Invalid invite code');
      } else {
        setError('');
      }
    } catch (err) {
      setCodeValid(false);
      setError('Failed to validate code');
    } finally {
      setValidatingCode(false);
    }
  };

  const handleCodeChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setInviteCode(upperValue);
    if (upperValue.length === 8) {
      validateCode(upperValue);
    } else {
      setCodeValid(null);
      setError('');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authAPI.register(username, password, inviteCode);
      
      const user = {
        username: data.username,
        role: 'user' as 'user' | 'admin',
        token: data.token,
      };
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-main)', padding: '1rem' }}>
      <div className="card-brutal w-full" style={{ maxWidth: '460px', padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <h1 className="text-4xl font-black" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            JOIN LITECORD
          </h1>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Invite code required
          </p>
        </div>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              INVITE CODE
            </label>
            <div className="relative">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="input-brutal"
                placeholder="A1B2C3D4"
                maxLength={8}
                required
                autoFocus
                style={{
                  borderColor: codeValid === true ? 'var(--success)' : codeValid === false ? 'var(--error)' : 'var(--border)',
                }}
              />
              {validatingCode && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2">⏳</span>
              )}
              {codeValid === true && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2">✅</span>
              )}
              {codeValid === false && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2">❌</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              USERNAME
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-brutal"
              placeholder="cooluser"
              minLength={3}
              maxLength={30}
              required
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
              minLength={6}
              maxLength={30}
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
            disabled={loading || codeValid !== true}
            className="btn-brutal w-full"
            style={{ background: codeValid === true ? 'var(--success)' : 'var(--bg-card)' }}
          >
            {loading ? '⏳ CREATING ACCOUNT...' : '→ REGISTER'}
          </button>

          <div className="text-center" style={{ borderTop: '3px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Already have an account?{' '}
              <Link href="/login" className="font-bold underline" style={{ color: 'var(--text-primary)' }}>
                LOGIN HERE
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
