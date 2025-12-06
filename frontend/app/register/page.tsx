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

  const getCodeBorderColor = () => {
    if (codeValid === true) return 'border-success';
    if (codeValid === false) return 'border-error';
    return 'border-border';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="card-brutal bg-card w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-black text-dark mb-2">JOIN LITECORD</h1>
          <p className="text-sm font-medium text-dim">Invite code required</p>
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold mb-2 text-dark">INVITE CODE</label>
            <div className="relative">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                className={`input-brutal w-full ${getCodeBorderColor()}`}
                placeholder="A1B2C3D4"
                maxLength={8}
                required
                autoFocus
              />
              {validatingCode && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dim">...</span>
              )}
              {codeValid === true && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-success font-bold">OK</span>
              )}
              {codeValid === false && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-error font-bold">X</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-dark">USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-brutal w-full"
              placeholder="cooluser"
              minLength={3}
              maxLength={30}
              required
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
              minLength={6}
              maxLength={30}
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
            disabled={loading || codeValid !== true}
            className={`btn-brutal w-full py-3 ${codeValid === true ? 'bg-primary text-white' : 'bg-gray-300 text-gray-500'}`}
          >
            {loading ? 'CREATING ACCOUNT...' : 'REGISTER'}
          </button>

          <div className="text-center border-t-[3px] border-border pt-4 mt-4">
            <p className="text-sm font-medium text-dim">
              Already have an account?{' '}
              <Link href="/login" className="font-bold underline text-dark">
                LOGIN HERE
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
