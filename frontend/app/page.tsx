'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useSocket } from '@/lib/useSocket';
import { roomAPI, messageAPI } from '@/lib/api';
import { format } from 'date-fns';
import VoiceChat from '@/components/VoiceChat';

export default function Home() {
  const router = useRouter();
  const { user, currentRoom, rooms, messages, isConnected, typingUsers, setUser, setCurrentRoom, setRooms, setMessages, logout } = useStore();
  const { sendMessage, startTyping, stopTyping } = useSocket();
  
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router, setUser]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-main)' }}>
        <div className="text-2xl font-black">⏳ LOADING...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-main)' }}>
      <header className="border-b-3 border-black gradient-yellow" style={{ borderWidth: '3px', padding: '1rem 1.5rem' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight">LITECORD</h1>
              <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="badge-brutal" style={{ background: user.role === 'admin' ? 'var(--purple)' : 'var(--cyan)', color: 'white' }}>
              {user.username}
            </div>
            {user.role === 'admin' && (
              <>
                <button onClick={() => router.push('/admin')} className="btn-brutal" style={{ background: 'var(--purple)', color: 'white' }}>
                  INVITE CODES
                </button>
              </>
            )}
            <button onClick={logout} className="btn-brutal" style={{ background: 'var(--error)', color: 'white' }}>
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="border-r-3 border-black flex flex-col" style={{ background: 'var(--bg-secondary)', borderWidth: '3px', width: '80px' }}>
          <div className="flex-1 overflow-y-auto" style={{ padding: '0.75rem' }}>
            {rooms.map((room, index) => (
              <button 
                key={room._id} 
                onClick={() => selectRoom(room._id)} 
                className={`room-item border-3 border-black transition-all font-black ${currentRoom?._id === room._id ? 'active' : ''}`}
                style={{ 
                  background: currentRoom?._id === room._id 
                    ? 'var(--bg-accent)' 
                    : index % 3 === 0 
                      ? 'var(--bg-card)' 
                      : index % 3 === 1 
                        ? 'var(--bg-success)' 
                        : 'var(--bg-purple)',
                  borderWidth: '3px',
                  width: '100%',
                  height: '56px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginBottom: '0.75rem',
                  cursor: 'pointer'
                }}
                title={room.name}
              >
                {room.name.charAt(0).toUpperCase()}
              </button>
            ))}
            <button 
              onClick={() => setShowCreateRoom(true)}
              className="border-3 border-black transition-all font-black"
              style={{ 
                background: 'var(--cyan)',
                borderWidth: '3px',
                width: '100%',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                cursor: 'pointer !important',
                boxShadow: '4px 4px 0 var(--shadow)'
              }}
              title="Add New Room"
            >
              +
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          {showCreateRoom ? (
            <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-main)' }}>
              <div className="text-center card-brutal" style={{ background: 'var(--bg-card)', padding: '2.5rem', maxWidth: '500px', margin: '2rem' }}>
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
              <div className="border-b-3 border-black gradient-purple" style={{ borderWidth: '3px', padding: '1rem 1.5rem' }}>
                <div>
                  <h2 className="text-2xl font-black text-white"># {currentRoom.name}</h2>
                  {currentRoom.description && <p className="text-xs mt-1 font-bold text-white opacity-80">{currentRoom.description}</p>}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-main)', padding: '2rem' }}>
                {messages.map((msg, idx) => (
                  <div 
                    key={msg._id} 
                    className="message-bubble card-brutal" 
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
                      marginBottom: '1rem'
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-black text-sm">{msg.username}</span>
                      <span className="text-xs font-mono badge-brutal" style={{ background: 'var(--bg-card)', padding: '0.25rem 0.625rem' }}>
                        {format(new Date(msg.createdAt), 'HH:mm')}
                      </span>
                    </div>
                    <p className="font-medium text-sm">{msg.text}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="border-t-3 border-black" style={{ borderWidth: '3px', padding: '1rem 1.5rem', background: 'var(--bg-card)' }}>
                {typingUsers.length > 0 && (
                  <div className="text-xs font-bold mb-2" style={{ color: 'var(--purple)' }}>
                    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </div>
                )}
                <div className="flex gap-3">
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
                      height: '42px',
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
            <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-main)' }}>
              <div className="text-center card-brutal" style={{ background: 'var(--bg-card)', padding: '2.5rem' }}>
                <h2 className="text-3xl font-black mb-3">SELECT A ROOM</h2>
                <p className="font-bold text-lg" style={{ color: 'var(--text-secondary)' }}>Choose a room from the sidebar to start chatting</p>
              </div>
            </div>
          )}
        </main>

        {currentRoom && currentRoom.livekitRoomName && (
          <aside className="border-l-3 border-black" style={{ background: 'var(--bg-success)', borderWidth: '3px', width: '320px' }}>
            <VoiceChat />
          </aside>
        )}
      </div>
    </div>
  );
}
