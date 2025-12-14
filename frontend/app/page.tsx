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
    setIsMuted(prev => !prev);
  };

  const handleToggleChat = () => {
    setIsChatOpen(prev => !prev);
  };

  const getMessageBg = (idx: number, isSystem: boolean): string => {
    if (isSystem) return 'var(--bg-accent)';
    const bgs = ['var(--bg-card)', 'var(--bg-secondary)', 'var(--bg-success)', 'var(--bg-purple)'];
    return bgs[idx % 4];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-2xl font-black">LOADING...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col mobile-container bg-surface">
      <header className="gradient-purple px-6 py-4 border-y-[3px] border-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <HamburgerMenu onClose={() => setShowRoomsMenu(!showRoomsMenu)} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">CORDIT</h1>
              <p className="text-xs font-bold mt-1 text-white opacity-70">
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <span className="badge-brutal bg-yellow text-dark">
              {user.username}
            </span>
            {user.role === 'admin' && (
              <button onClick={() => router.push('/admin')} className="btn-brutal bg-cyan text-white px-4 py-2">
                INVITE CODES
              </button>
            )}
            <button onClick={logout} className="btn-brutal bg-error text-white px-4 py-2">
              LOGOUT
            </button>
          </div>
          <div className="md:hidden flex items-center gap-3">
            <span className="badge-brutal bg-yellow text-dark text-xs px-2 py-1">
              {user.username.slice(0, 5)}
            </span>
            <button onClick={logout} className="btn-brutal bg-error text-white h-9 px-3 text-xs">
              OUT
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <RoomsSidebar
          rooms={rooms}
          currentRoomId={currentRoom?._id || null}
          onSelectRoom={selectRoom}
          onCreateRoom={() => setShowCreateRoom(true)}
          isOpen={showRoomsMenu}
          onClose={() => setShowRoomsMenu(false)}
          isMobile={true}
        />

        <div className="hidden md:block">
          <RoomsSidebar
            rooms={rooms}
            currentRoomId={currentRoom?._id || null}
            onSelectRoom={selectRoom}
            onCreateRoom={() => setShowCreateRoom(true)}
            isMobile={false}
          />
        </div>

        <main className="flex-1 flex flex-col pb-safe">
          {showCreateRoom ? (
            <div className="flex-1 flex items-center justify-center bg-surface p-6">
              <div className="text-center card-brutal bg-card p-10 max-w-md">
                <h2 className="text-3xl font-black mb-3 text-accent">CREATE NEW ROOM</h2>
                <p className="font-bold text-lg mb-4 text-dim">
                  This feature is coming soon!
                </p>
                <p className="font-medium text-sm mb-6 text-dim">
                  You'll be able to create custom rooms with voice chat support, set descriptions, and invite members.
                </p>
                <button
                  onClick={() => setShowCreateRoom(false)}
                  className="btn-brutal bg-accent text-dark px-6 py-3"
                >
                  BACK TO CHAT
                </button>
              </div>
            </div>
          ) : currentRoom ? (
            <>
              <div className="gradient-yellow px-6 py-4 border-b-[3px] border-black">
                <h2 className="text-xl font-black"># {currentRoom.name}</h2>
              </div>

              <div className="flex-1 overflow-y-auto bg-muted p-6">
                <div className="flex flex-col gap-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={msg._id}
                      className="card-brutal p-4"
                      style={{ background: getMessageBg(idx, msg.messageType === 'system') }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-sm">{msg.username}</span>
                        <span className="badge-brutal text-xs bg-card">
                          {format(new Date(msg.createdAt), 'HH:mm')}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{msg.text}</p>
                    </div>
                  ))}
                </div>
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="px-6 py-4 bg-card border-t-[3px] border-black">
                {typingUsers.length > 0 && (
                  <div className="text-xs font-bold mb-2 text-purple">
                    {typingUsers.length === 1
                      ? `${typingUsers[0]} is typing...`
                      : `${typingUsers.length} people are typing...`
                    }
                  </div>
                )}
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => handleTyping(e.target.value)}
                    placeholder="Type your message..."
                    className="input-brutal flex-1 bg-surface min-h-11"
                    maxLength={2000}
                    disabled={sendingMessage}
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !messageText.trim()}
                    className={`btn-brutal min-w-24 ${messageText.trim() ? 'bg-success text-white' : 'bg-gray-200 text-gray-500'}`}
                  >
                    {sendingMessage ? 'SENDING...' : 'SEND'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-surface p-6">
              <div
                className="text-center card-brutal cursor-pointer bg-card p-10"
                onClick={() => setShowRoomsMenu(true)}
              >
                <h2 className="text-3xl font-black mb-3">SELECT A ROOM</h2>
                <p className="font-bold text-lg text-dim">Tap here to choose a room</p>
              </div>
            </div>
          )}
        </main>

        {currentRoom && (
          <aside className="hidden md:flex h-full flex-col bg-muted w-80 border-l-[3px] border-black">
            <VoiceChat />
          </aside>
        )}
      </div>

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

      {currentRoom && (
        <div
          className="mobile-only md:hidden fixed overflow-y-auto"
          style={{
            background: 'var(--bg-secondary)',
            zIndex: 20,
            top: '85px',
            left: 0,
            right: 0,
            bottom: '55px',
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
          <div className="gradient-yellow px-6 py-4 border-b-[3px] border-black">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsChatOpen(false)}
                className="btn-brutal px-3 py-2"
                style={{ background: 'var(--bg-card)' }}
              >
                BACK
              </button>
              <div>
                <h2 className="text-xl font-black"># {currentRoom.name}</h2>
                {currentRoom.description && <p className="text-xs font-bold opacity-80">{currentRoom.description}</p>}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4" style={{ background: 'var(--bg-secondary)' }}>
            <div className="flex flex-col gap-3">
              {messages.map((msg, idx) => (
                <div
                  key={msg._id}
                  className="card-brutal p-3"
                  style={{ background: getMessageBg(idx, msg.messageType === 'system') }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-xs">{msg.username}</span>
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

          <form onSubmit={handleSendMessage} className="px-4 py-3 border-t-[3px] border-black" style={{ background: 'var(--bg-card)' }}>
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
                className="input-brutal flex-1 min-h-11"
                style={{ background: 'var(--bg-main)' }}
                maxLength={2000}
                disabled={sendingMessage}
              />
              <button
                type="submit"
                disabled={sendingMessage || !messageText.trim()}
                className="btn-brutal"
                style={{
                  background: messageText.trim() ? 'var(--success)' : '#D1D5DB',
                  color: messageText.trim() ? 'white' : '#6B7280',
                }}
              >
                {sendingMessage ? '...' : 'SEND'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
