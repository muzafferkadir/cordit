'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useSocket } from '@/lib/useSocket';
import { roomAPI, messageAPI } from '@/lib/api';
import { format } from 'date-fns';
import VoiceChat from '@/components/VoiceChat';
import MobileNav from '@/components/MobileNav';
import RoomsSidebar from '@/components/RoomsSidebar';
import HamburgerMenu from '@/components/HamburgerMenu';

export default function Home() {
  const router = useRouter();
  const { user, currentRoom, rooms, messages, isConnected, typingUsers, setCurrentRoom, setRooms, setMessages, logout } = useStore();
  const { sendMessage, startTyping, stopTyping } = useSocket();

  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showRoomsMenu, setShowRoomsMenu] = useState(false);
  const [isInVoice, setIsInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [joinTrigger, setJoinTrigger] = useState(false);
  const [leaveTrigger, setLeaveTrigger] = useState(false);
  const [muteTrigger, setMuteTrigger] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Wait for AuthProvider to load user from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const loadRooms = async () => {
      try {
        const data = await roomAPI.getAll();
        setRooms(data.rooms);
        if (data.rooms.length > 0 && !currentRoom) {
          await selectRoom(data.rooms[0]._id);
        }
      } catch (error) {
        console.error('Failed to load rooms:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRooms();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = async () => {
      if (!document.hidden && currentRoom) {
        try {
          const roomsData = await roomAPI.getAll();
          setRooms(roomsData.rooms);

          const messagesData = await messageAPI.getByRoom(currentRoom._id);
          setMessages(messagesData.messages);
        } catch (error) {
          console.error('Failed to reload data:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, currentRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectRoom = async (roomId: string) => {
    try {
      const room = rooms.find(r => r._id === roomId);
      if (!room) return;

      setCurrentRoom(room);

      const data = await messageAPI.getByRoom(roomId);
      setMessages(data.messages);

      await roomAPI.join(roomId);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      sendMessage(messageText.trim());
      setMessageText('');
      stopTyping();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleTyping = (value: string) => {
    setMessageText(value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.length > 0) {
      startTyping();

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 2000);
    } else {
      stopTyping();
    }
  };

  const handleJoinVoice = () => {
    setConnecting(true);
    setJoinTrigger(prev => !prev);
  };

  const handleLeaveVoice = () => {
    setLeaveTrigger(prev => !prev);
  };

  const handleToggleMute = () => {
    setMuteTrigger(prev => !prev);
    // Toggle optimistically
    setIsMuted(prev => !prev);
  };

  const handleToggleChat = () => {
    setIsChatOpen(prev => !prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-main)' }}>
        <div className="text-2xl font-black">⏳ LOADING...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col mobile-container" style={{ background: 'var(--bg-main)' }}>
      <header className="gradient-yellow" style={{ padding: '1rem 1.5rem', borderTop: '3px solid black', borderBottom: '3px solid black' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <HamburgerMenu onClose={() => setShowRoomsMenu(!showRoomsMenu)} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">LITECORD</h1>
              <p className="text-xs font-bold mt-1" style={{ opacity: 0.7 }}>
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <span className="badge-brutal" style={{ background: user.role === 'admin' ? 'var(--purple)' : 'var(--cyan)', color: 'white' }}>
              {user.username}
            </span>
            {user.role === 'admin' && (
              <button onClick={() => router.push('/admin')} className="btn-brutal" style={{ background: 'var(--purple)', color: 'white' }}>
                INVITE CODES
              </button>
            )}
            <button onClick={logout} className="btn-brutal" style={{ background: 'var(--error)', color: 'white' }}>
              LOGOUT
            </button>
          </div>
          <div className="md:hidden flex items-center gap-3">
            <span className="badge-brutal text-xs" style={{ background: user.role === 'admin' ? 'var(--purple)' : 'var(--cyan)', color: 'white', padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}>
              {user.username.slice(0, 5)}
            </span>
            <button onClick={logout} className="btn-brutal" style={{ background: 'var(--error)', color: 'white', height: '36px', padding: '0.375rem 0.75rem', fontSize: '0.65rem' }}>
              OUT
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Sidebar Modal */}
        <RoomsSidebar
          rooms={rooms}
          currentRoomId={currentRoom?._id || null}
          onSelectRoom={selectRoom}
          onCreateRoom={() => setShowCreateRoom(true)}
          isOpen={showRoomsMenu}
          onClose={() => setShowRoomsMenu(false)}
          isMobile={true}
        />

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <RoomsSidebar
            rooms={rooms}
            currentRoomId={currentRoom?._id || null}
            onSelectRoom={selectRoom}
            onCreateRoom={() => setShowCreateRoom(true)}
            isMobile={false}
          />
        </div>


        <main className="flex-1 flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {showCreateRoom ? (
            <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-main)', padding: '1.5rem' }}>
              <div className="text-center card-brutal" style={{ background: 'var(--bg-card)', padding: '2.5rem', maxWidth: '500px' }}>
                <h2 className="text-3xl font-black mb-3" style={{ color: 'var(--cyan)' }}>CREATE NEW ROOM</h2>
                <p className="font-bold text-lg mb-4" style={{ color: 'var(--text-secondary)' }}>
                  This feature is coming soon!
                </p>
                <p className="font-medium text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                  You'll be able to create custom rooms with voice chat support, set descriptions, and invite members.
                </p>
                <button
                  onClick={() => setShowCreateRoom(false)}
                  className="btn-brutal"
                  style={{ background: 'var(--cyan)', color: 'white' }}
                >
                  BACK TO CHAT
                </button>
              </div>
            </div>
          ) : currentRoom ? (
            <>
              <div className="gradient-purple" style={{ padding: '1rem 1.5rem', borderBottom: '3px solid black' }}>
                <h2 className="text-xl font-black text-white"># {currentRoom.name}</h2>
                {currentRoom.description && <p className="text-xs mt-1 font-bold text-white opacity-80">{currentRoom.description}</p>}
              </div>

              <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-secondary)', padding: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {messages.map((msg, idx) => (
                    <div
                      key={msg._id}
                      className="card-brutal"
                      style={{
                        background: msg.messageType === 'system'
                          ? 'var(--bg-accent)'
                          : idx % 4 === 0
                            ? 'var(--bg-card)'
                            : idx % 4 === 1
                              ? 'var(--bg-secondary)'
                              : idx % 4 === 2
                                ? 'var(--bg-success)'
                                : 'var(--bg-purple)',
                        padding: '0.875rem 1rem',
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-sm">{msg.username}</span>
                        <span className="badge-brutal text-xs" style={{ background: 'var(--bg-card)' }}>
                          {format(new Date(msg.createdAt), 'HH:mm')}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{msg.text}</p>
                    </div>
                  ))}
                </div>
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} style={{ padding: '1rem 1.5rem', background: 'var(--bg-card)', borderTop: '3px solid black' }}>
                {typingUsers.length > 0 && (
                  <div className="text-xs font-bold mb-2" style={{ color: 'var(--purple)' }}>
                    {typingUsers.length === 1
                      ? `${typingUsers[0]} is typing...`
                      : `${typingUsers.length} people are typing...`
                    }
                  </div>
                )}
                <div className="flex gap-3" style={{ flexDirection: window.innerWidth < 480 ? 'column' : 'row' }}>
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => handleTyping(e.target.value)}
                    placeholder="Type your message..."
                    className="input-brutal flex-1"
                    maxLength={2000}
                    disabled={sendingMessage}
                    style={{
                      background: 'var(--bg-main)',
                      minHeight: '44px',
                      fontSize: '0.9375rem'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !messageText.trim()}
                    className="btn-brutal"
                    style={{
                      background: messageText.trim() ? 'var(--success)' : 'var(--bg-main)',
                      color: messageText.trim() ? 'white' : 'var(--text-secondary)',
                      minWidth: '100px'
                    }}
                  >
                    {sendingMessage ? 'SENDING...' : 'SEND'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-main)', padding: '1.5rem' }}>
              <div
                className="text-center card-brutal cursor-pointer"
                style={{ background: 'var(--bg-card)', padding: '2.5rem' }}
                onClick={() => setShowRoomsMenu(true)}
              >
                <h2 className="text-3xl font-black mb-3">SELECT A ROOM</h2>
                <p className="font-bold text-lg" style={{ color: 'var(--text-secondary)' }}>Tap here to choose a room</p>
              </div>
            </div>
          )}
        </main>

        {/* Desktop Voice Chat Sidebar */}
        {currentRoom && (
          <aside className="hidden md:flex h-full flex-col" style={{ background: 'var(--bg-secondary)', width: '320px', borderLeft: '3px solid black' }}>
            <VoiceChat />
          </aside>
        )}
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        isInVoice={isInVoice}
        isMuted={isMuted}
        isChatOpen={isChatOpen}
        hasRoom={!!currentRoom}
        onJoinVoice={handleJoinVoice}
        onLeaveVoice={handleLeaveVoice}
        onToggleMute={handleToggleMute}
        onToggleChat={handleToggleChat}
        connecting={connecting}
      />

      {/* Mobile Voice Chat - Main View (Always visible on mobile when room selected) */}
      {currentRoom && (
        <div
          className="mobile-only md:hidden fixed"
          style={{
            background: 'var(--bg-secondary)',
            zIndex: 20,
            top: '70px',
            left: 0,
            right: 0,
            bottom: '55px',
            overflowY: 'auto',
          }}
        >
          <VoiceChat
            isMobile={true}
            onJoinStateChange={(joined) => {
              setIsInVoice(joined);
              setConnecting(false);
            }}
            onMuteStateChange={setIsMuted}
            externalJoinTrigger={joinTrigger}
            externalLeaveTrigger={leaveTrigger}
            externalMuteTrigger={muteTrigger}
          />
        </div>
      )}

      {/* Mobile Chat Modal - Opens on top of Voice */}
      {isChatOpen && currentRoom && (
        <div
          className="mobile-only md:hidden fixed flex flex-col"
          style={{
            background: 'var(--bg-main)',
            zIndex: 30,
            top: 0,
            left: 0,
            right: 0,
            bottom: '60px',
          }}
        >
          {/* Chat Header with Back Button */}
          <div className="gradient-purple" style={{ padding: '1rem 1.5rem', borderBottom: '3px solid black' }}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsChatOpen(false)}
                className="btn-brutal"
                style={{ background: 'var(--bg-card)', padding: '0.5rem 0.75rem' }}
              >
                ← BACK
              </button>
              <div>
                <h2 className="text-xl font-black text-white"># {currentRoom.name}</h2>
                {currentRoom.description && <p className="text-xs font-bold text-white opacity-80">{currentRoom.description}</p>}
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-secondary)', padding: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {messages.map((msg, idx) => (
                <div
                  key={msg._id}
                  className="card-brutal"
                  style={{
                    background: msg.messageType === 'system'
                      ? 'var(--bg-accent)'
                      : idx % 4 === 0
                        ? 'var(--bg-card)'
                        : idx % 4 === 1
                          ? 'var(--bg-secondary)'
                          : idx % 4 === 2
                            ? 'var(--bg-success)'
                            : 'var(--bg-purple)',
                    padding: '0.75rem',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-xs">{msg.username}</span>
                    <span className="badge-brutal text-xs" style={{ background: 'var(--bg-card)', fontSize: '0.6rem' }}>
                      {format(new Date(msg.createdAt), 'HH:mm')}
                    </span>
                  </div>
                  <p className="font-medium text-sm">{msg.text}</p>
                </div>
              ))}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} style={{ padding: '0.75rem 1rem', background: 'var(--bg-card)', borderTop: '3px solid black' }}>
            {typingUsers.length > 0 && (
              <div className="text-xs font-bold mb-2" style={{ color: 'var(--purple)' }}>
                {typingUsers.length === 1
                  ? `${typingUsers[0]} is typing...`
                  : `${typingUsers.length} people are typing...`
                }
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => handleTyping(e.target.value)}
                placeholder="Type your message..."
                className="input-brutal flex-1"
                maxLength={2000}
                disabled={sendingMessage}
                style={{
                  background: 'var(--bg-main)',
                  minHeight: '44px',
                  fontSize: '0.875rem'
                }}
              />
              <button
                type="submit"
                disabled={sendingMessage || !messageText.trim()}
                className="btn-brutal"
                style={{
                  background: messageText.trim() ? 'var(--success)' : 'var(--bg-main)',
                  color: messageText.trim() ? 'white' : 'var(--text-secondary)',
                }}
              >
                {sendingMessage ? '...' : '→'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
