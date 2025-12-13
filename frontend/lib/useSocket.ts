'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore } from './store';
import type { Message } from './types';

// Socket.io connects directly to backend (WebSocket can't be proxied via Next.js API routes)
// In Docker: uses NEXT_PUBLIC_SOCKET_URL environment variable
// Locally: uses localhost:3000
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

let globalSocket: Socket | null = null;
let socketListenersAttached = false;

const getSocket = (token: string) => {
  if (!globalSocket || !globalSocket.connected) {
    globalSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
  }
  return globalSocket;
};

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const {
    user,
    currentRoom,
    addMessage,
    setConnected,
    addTypingUser,
    removeTypingUser,
  } = useStore();

  useEffect(() => {
    if (!user?.token) return;

    const socket = getSocket(user.token);
    socketRef.current = socket;

    if (!socketListenersAttached) {
      socketListenersAttached = true;

      socket.on('connect', () => {
        setConnected(true);
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      socket.on('new_message', (message: Message) => {
        addMessage(message);
      });

      socket.on('user_joined', (data: { username: string; timestamp: Date }) => {
        // User Has Joined
      });

      socket.on('user_left', (data: { username: string; timestamp: Date }) => {
        // User Has Left
      });

      socket.on('user_typing', (data: { username: string; isTyping: boolean }) => {
        if (data.isTyping) {
          addTypingUser(data.username);
          // Auto-remove after 3 seconds
          setTimeout(() => removeTypingUser(data.username), 3000);
        } else {
          removeTypingUser(data.username);
        }
      });

      socket.on('error', (error: { message: string }) => {
        console.error('Socket error:', error.message);
      });
    }

    return () => {
    };
  }, [user, addMessage, setConnected, addTypingUser, removeTypingUser]);

  useEffect(() => {
    if (currentRoom && socketRef.current?.connected) {
      socketRef.current.emit('join_room', { roomId: currentRoom._id });

      return () => {
        socketRef.current?.emit('leave_room', { roomId: currentRoom._id });
      };
    }
  }, [currentRoom]);

  const sendMessage = (text: string) => {
    if (socketRef.current && currentRoom) {
      socketRef.current.emit('send_message', { roomId: currentRoom._id, text });
    }
  };

  const startTyping = () => {
    if (socketRef.current && currentRoom) {
      socketRef.current.emit('typing_start', { roomId: currentRoom._id });
    }
  };

  const stopTyping = () => {
    if (socketRef.current && currentRoom) {
      socketRef.current.emit('typing_stop', { roomId: currentRoom._id });
    }
  };

  return { sendMessage, startTyping, stopTyping, socket: socketRef.current };
};

export const disconnectSocket = () => {
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
    socketListenersAttached = false;
  }
};
