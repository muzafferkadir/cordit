'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { inviteAPI, userAPI } from '@/lib/api';
import { format } from 'date-fns';
import type { InviteCode, UserListItem } from '@/lib/types';

export default function AdminPage() {
  const router = useRouter();
  const { user, logout } = useStore();
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [activeTab, setActiveTab] = useState<'invites' | 'users'>('invites');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState(1);
  const [maxUses, setMaxUses] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
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
      loadUsers();
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

  const loadUsers = async () => {
    try {
      const data = await userAPI.getAll();
      setUsers(data.users);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load users');
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const data = await inviteAPI.create(expiresInHours, maxUses);
      setSuccess(`Created code: ${data.code}`);
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
      setSuccess(`Deleted code: ${code}`);
      await loadInviteCodes();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete code');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Delete user ${username}? This action cannot be undone.`)) return;

    try {
      await userAPI.delete(userId);
      setSuccess(`Deleted user: ${username}`);
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess(`Copied: ${text}`);
    setTimeout(() => setSuccess(''), 2000);
  };

  const getCardBg = (idx: number, isAvailable: boolean) => {
    if (!isAvailable) return 'bg-surface';
    const bgs = ['bg-card', 'bg-muted', 'bg-green-100', 'bg-purple-100'];
    return bgs[idx % 4];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-2xl font-black">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="gradient-purple px-6 py-4 border-y-[3px] border-black">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">ADMIN PANEL</h1>
            <p className="text-xs font-bold mt-1 text-white opacity-70">Manage invite codes and users</p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <span className="badge-brutal bg-cyan text-white">ADMIN</span>
            <button onClick={() => router.push('/')} className="btn-brutal bg-yellow text-dark px-5 py-2">
              BACK TO CHAT
            </button>
            <button onClick={logout} className="btn-brutal bg-error text-white px-5 py-2">
              LOGOUT
            </button>
          </div>
          <div className="flex md:hidden items-center gap-2">
            <button onClick={() => router.push('/')} className="btn-brutal bg-yellow text-dark h-9 px-3 text-xs">
              BACK
            </button>
            <button onClick={logout} className="btn-brutal bg-error text-white h-9 px-3 text-xs">
              OUT
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 bg-muted p-4">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="card-brutal bg-error text-white p-4 mb-4">
              <p className="font-bold text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="card-brutal bg-success text-white p-4 mb-4">
              <p className="font-bold text-sm">{success}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('invites')}
              className={`btn-brutal px-4 py-2 text-sm ${
                activeTab === 'invites' ? 'bg-purple text-white' : 'bg-card text-dark'
              }`}
            >
              INVITE CODES
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`btn-brutal px-4 py-2 text-sm ${
                activeTab === 'users' ? 'bg-purple text-white' : 'bg-card text-dark'
              }`}
            >
              USERS ({users.length})
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {activeTab === 'invites' && (
              <>
                <div className="card-brutal bg-card p-4">
                  <h2 className="text-sm font-black text-cyan mb-4">CREATE INVITE CODE</h2>
              <form onSubmit={handleCreateCode}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold mb-2">EXPIRES IN (HOURS)</label>
                    <input
                      type="number"
                      value={expiresInHours}
                      onChange={(e) => setExpiresInHours(Number(e.target.value))}
                      className="input-brutal w-full"
                      min={1}
                      max={168}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-2">MAX USES</label>
                    <input
                      type="number"
                      value={maxUses}
                      onChange={(e) => setMaxUses(Number(e.target.value))}
                      className="input-brutal w-full"
                      min={1}
                      max={100}
                      required
                    />
                  </div>
                </div>
                <button type="submit" disabled={creating} className="btn-brutal w-full bg-success text-white py-3">
                  {creating ? 'CREATING...' : 'CREATE CODE'}
                </button>
              </form>
            </div>

            <div className="card-brutal bg-card p-4">
              <h2 className="text-sm font-black text-purple mb-4">INVITE CODES ({inviteCodes.length})</h2>

              {inviteCodes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="font-bold text-sm text-dim">
                    No invite codes yet. Create one above.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {inviteCodes.map((code, idx) => (
                    <div
                      key={code.code}
                      className={`card-brutal p-4 ${getCardBg(idx, code.isAvailable)} ${!code.isAvailable ? 'opacity-60' : ''}`}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code
                              className="font-black font-mono cursor-pointer hover:underline text-sm"
                              onClick={() => copyToClipboard(code.code)}
                              title="Click to copy"
                            >
                              {code.code}
                            </code>
                            <span className={`badge-brutal text-xs text-white ${code.isAvailable ? 'bg-success' : code.isExpired ? 'bg-warning' : 'bg-error'
                              }`}>
                              {code.isAvailable ? 'ACTIVE' : code.isExpired ? 'EXPIRED' : 'USED UP'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteCode(code.code)}
                            className="btn-brutal bg-error text-white text-xs py-1.5 px-3"
                          >
                            DELETE
                          </button>
                        </div>
                        <div className="text-xs text-dim flex flex-col gap-1">
                          <span>Uses: <strong>{code.currentUses}/{code.maxUses}</strong></span>
                          <span>Expires: <strong>{format(new Date(code.expiresAt), 'MMM dd, HH:mm')}</strong></span>
                          <span>By: <strong>{code.createdByUsername}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
                </div>
              </>
            )}

            {activeTab === 'users' && (
              <div className="card-brutal bg-card p-4">
                <h2 className="text-sm font-black text-purple mb-4">USERS ({users.length})</h2>

                {users.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="font-bold text-sm text-dim">
                      No users found.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {users.map((userItem, idx) => {
                      const isCurrentUser = userItem.username === user?.username;
                      const canDelete = !isCurrentUser && userItem.role !== 'admin';
                      const bgColors = ['bg-card', 'bg-muted', 'bg-green-100', 'bg-purple-100'];
                      
                      return (
                        <div
                          key={userItem._id}
                          className={`card-brutal p-4 ${bgColors[idx % 4]}`}
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm">
                                {userItem.username}
                              </span>
                              <span className={`badge-brutal text-xs text-white ${
                                userItem.role === 'admin' ? 'bg-purple' : 'bg-cyan'
                              }`}>
                                {userItem.role.toUpperCase()}
                              </span>
                              {isCurrentUser && (
                                <span className="badge-brutal text-xs bg-yellow text-dark">
                                  YOU
                                </span>
                              )}
                            </div>
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteUser(userItem._id, userItem.username)}
                                className="btn-brutal bg-error text-white text-xs py-1.5 px-3"
                              >
                                DELETE
                              </button>
                            )}
                            {!canDelete && !isCurrentUser && (
                              <span className="text-xs text-dim font-bold">
                                PROTECTED
                              </span>
                            )}
                          </div>
                          {userItem.createdAt && (
                            <div className="text-xs text-dim mt-2">
                              <span>Joined: <strong>{format(new Date(userItem.createdAt), 'MMM dd, yyyy')}</strong></span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
