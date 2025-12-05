'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { inviteAPI, roomAPI } from '@/lib/api';
import { format } from 'date-fns';
import type { InviteCode } from '@/lib/types';

export default function AdminPage() {
  const router = useRouter();
  const { user, logout } = useStore();
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState(1);
  const [maxUses, setMaxUses] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Wait for AuthProvider to load user from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    if (user && user.role !== 'admin') {
      router.push('/');
      return;
    }
    if (user) {
      loadInviteCodes();
    }
  }, [router, user]);

  const loadInviteCodes = async () => {
    try {
      const data = await inviteAPI.getAll();
      setInviteCodes(data.inviteCodes);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load invite codes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const data = await inviteAPI.create(expiresInHours, maxUses);
      setSuccess(`✅ Created code: ${data.code}`);
      setExpiresInHours(1);
      setMaxUses(1);
      await loadInviteCodes();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create invite code');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCode = async (code: string) => {
    if (!confirm(`Delete invite code ${code}?`)) return;

    try {
      await inviteAPI.delete(code);
      setSuccess(`✅ Deleted code: ${code}`);
      await loadInviteCodes();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete code');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess(`📋 Copied: ${text}`);
    setTimeout(() => setSuccess(''), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-main)' }}>
        <div className="text-2xl font-black">⏳ LOADING...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-main)' }}>
      <header className="gradient-yellow" style={{ padding: '1rem 1.5rem', borderTop: '3px solid black', borderBottom: '3px solid black' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight">ADMIN PANEL</h1>
            <p className="text-xs font-bold mt-1" style={{ opacity: 0.7 }}>
              Manage invite codes and rooms
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="badge-brutal" style={{ background: 'var(--purple)', color: 'white' }}>
              ADMIN
            </span>
            <span className="badge-brutal" style={{ background: 'var(--cyan)', color: 'white' }}>
              {user?.username}
            </span>
            <button
              onClick={() => router.push('/')}
              className="btn-brutal"
              style={{ background: 'var(--cyan)', color: 'white' }}
            >
              BACK TO CHAT
            </button>
            <button
              onClick={logout}
              className="btn-brutal"
              style={{ background: 'var(--error)', color: 'white' }}
            >
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1" style={{ background: 'var(--bg-secondary)', padding: '1.5rem' }}>
        <div className="max-w-4xl mx-auto">
          {/* Notifications */}
          {error && (
            <div className="card-brutal" style={{ background: 'var(--error)', color: 'white', padding: '0.875rem 1rem', marginBottom: '1rem' }}>
              <p className="font-bold text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="card-brutal" style={{ background: 'var(--success)', color: 'white', padding: '0.875rem 1rem', marginBottom: '1rem' }}>
              <p className="font-bold text-sm">{success}</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Create Invite Code */}
            <div className="card-brutal" style={{ padding: '0.875rem 1rem' }}>
              <h2 className="text-sm font-black" style={{ marginBottom: '1rem', color: 'var(--cyan)' }}>CREATE INVITE CODE</h2>
              <form onSubmit={handleCreateCode}>
                <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="block text-xs font-bold" style={{ marginBottom: '0.5rem' }}>EXPIRES IN (HOURS)</label>
                    <input
                      type="number"
                      value={expiresInHours}
                      onChange={(e) => setExpiresInHours(Number(e.target.value))}
                      className="input-brutal"
                      min={1}
                      max={168}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold" style={{ marginBottom: '0.5rem' }}>MAX USES</label>
                    <input
                      type="number"
                      value={maxUses}
                      onChange={(e) => setMaxUses(Number(e.target.value))}
                      className="input-brutal"
                      min={1}
                      max={100}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-brutal w-full"
                  style={{ background: 'var(--success)', color: 'white' }}
                >
                  {creating ? 'CREATING...' : 'CREATE CODE'}
                </button>
              </form>
            </div>

            {/* Invite Codes List */}
            <div className="card-brutal" style={{ padding: '0.875rem 1rem' }}>
              <h2 className="text-sm font-black" style={{ marginBottom: '1rem', color: 'var(--purple)' }}>INVITE CODES ({inviteCodes.length})</h2>
              
              {inviteCodes.length === 0 ? (
                <div className="text-center" style={{ padding: '2rem 0' }}>
                  <p className="font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>
                    No invite codes yet. Create one above.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {inviteCodes.map((code, idx) => (
                    <div
                      key={code.code}
                      className="card-brutal"
                      style={{
                        background: code.isAvailable 
                          ? idx % 4 === 0 
                            ? 'var(--bg-card)' 
                            : idx % 4 === 1 
                              ? 'var(--bg-secondary)' 
                              : idx % 4 === 2 
                                ? 'var(--bg-success)' 
                                : 'var(--bg-purple)'
                          : 'var(--bg-main)',
                        padding: '0.875rem 1rem',
                        opacity: code.isAvailable ? 1 : 0.6,
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <code
                            className="font-black font-mono cursor-pointer hover:underline"
                            onClick={() => copyToClipboard(code.code)}
                            title="Click to copy"
                          >
                            {code.code}
                          </code>
                          <span 
                            className="badge-brutal text-xs" 
                            style={{ 
                              background: code.isAvailable ? 'var(--success)' : code.isExpired ? 'var(--warning)' : 'var(--error)', 
                              color: 'white' 
                            }}
                          >
                            {code.isAvailable ? 'ACTIVE' : code.isExpired ? 'EXPIRED' : 'USED UP'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteCode(code.code)}
                          className="btn-brutal"
                          style={{ background: 'var(--error)', color: 'white', fontSize: '0.75rem', padding: '0.375rem 0.75rem', height: 'auto' }}
                        >
                          DELETE
                        </button>
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span>Uses: <strong>{code.currentUses}/{code.maxUses}</strong></span>
                        <span style={{ margin: '0 0.5rem' }}>•</span>
                        <span>Expires: <strong>{format(new Date(code.expiresAt), 'MMM dd, HH:mm')}</strong></span>
                        <span style={{ margin: '0 0.5rem' }}>•</span>
                        <span>By: <strong>{code.createdByUsername}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
