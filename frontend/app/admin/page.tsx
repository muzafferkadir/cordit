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
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'admin') {
      router.push('/');
      return;
    }
    loadInviteCodes();
  }, [router]);

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
    <div className="min-h-screen" style={{ background: 'var(--bg-main)' }}>
      <header className="border-b-3 border-black gradient-yellow" style={{ borderWidth: '3px', padding: '1rem 1.5rem' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">ADMIN PANEL</h1>
            <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
              Manage invite codes and rooms
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="badge-brutal" style={{ background: 'var(--purple)', color: 'white' }}>
              ADMIN
            </div>
            <div className="font-black text-base">{user?.username}</div>
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

      <div className="max-w-6xl mx-auto" style={{ padding: '2rem' }}>
        {/* Notifications */}
        {error && (
          <div className="card-brutal" style={{ background: 'var(--error)', color: 'white', padding: '1rem', marginBottom: '1.5rem' }}>
            <p className="font-bold">{error}</p>
          </div>
        )}

        {success && (
          <div className="card-brutal" style={{ background: 'var(--success)', color: 'white', padding: '1rem', marginBottom: '1.5rem' }}>
            <p className="font-bold">{success}</p>
          </div>
        )}

        {/* Create Invite Code */}
        <div className="card-brutal" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 className="text-xl font-black" style={{ marginBottom: '1.25rem', color: 'var(--cyan)' }}>CREATE INVITE CODE</h2>
          <form onSubmit={handleCreateCode} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
              <div>
                <label className="block text-sm font-bold" style={{ marginBottom: '0.625rem' }}>EXPIRES IN (HOURS)</label>
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
                 <label className="block text-sm font-bold" style={{ marginBottom: '0.625rem' }}>MAX USES</label>
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
              style={{ background: 'var(--success)', color: 'white', marginTop: '0.5rem' }}
            >
              {creating ? 'CREATING...' : 'CREATE CODE'}
            </button>
          </form>
        </div>

        {/* Invite Codes List */}
        <div className="card-brutal" style={{ padding: '1.5rem' }}>
          <h2 className="text-xl font-black" style={{ marginBottom: '1.25rem', color: 'var(--purple)' }}>INVITE CODES ({inviteCodes.length})</h2>
          
          {inviteCodes.length === 0 ? (
            <div className="text-center" style={{ padding: '3rem 0' }}>
              <h3 className="text-2xl font-black" style={{ marginBottom: '0.5rem' }}>NO INVITE CODES</h3>
              <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>
                Create your first invite code above
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {inviteCodes.map((code) => (
                <div
                  key={code.code}
                  className="card-brutal"
                  style={{
                    background: code.isAvailable ? 'var(--bg-card)' : 'var(--bg-main)',
                    padding: '1.25rem',
                    opacity: code.isAvailable ? 1 : 0.6,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
                        <code
                          className="text-xl font-black font-mono cursor-pointer hover:underline"
                          onClick={() => copyToClipboard(code.code)}
                          title="Click to copy"
                          style={{ cursor: 'pointer' }}
                        >
                          {code.code}
                        </code>
                        {code.isAvailable ? (
                          <span className="badge-brutal text-xs" style={{ background: 'var(--success)', color: 'white' }}>
                            ACTIVE
                          </span>
                        ) : code.isExpired ? (
                          <span className="badge-brutal text-xs" style={{ background: 'var(--warning)', color: 'white' }}>
                            EXPIRED
                          </span>
                        ) : (
                          <span className="badge-brutal text-xs" style={{ background: 'var(--error)', color: 'white' }}>
                            USED UP
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm" style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <p>👤 Created by: <strong>{code.createdByUsername}</strong></p>
                        <p>📅 Created: <strong>{format(new Date(code.createdAt), 'MMM dd, yyyy HH:mm')}</strong></p>
                        <p>⏰ Expires: <strong>{format(new Date(code.expiresAt), 'MMM dd, yyyy HH:mm')}</strong></p>
                        <p>🔢 Uses: <strong>{code.currentUses} / {code.maxUses}</strong> ({code.remainingUses} remaining)</p>
                        {code.usedByUsername && (
                          <p>👥 Last used by: <strong>{code.usedByUsername}</strong></p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteCode(code.code)}
                      className="btn-brutal"
                      style={{ background: 'var(--error)', color: 'white', fontSize: '0.8125rem', padding: '0.5rem 1rem', height: 'auto' }}
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
