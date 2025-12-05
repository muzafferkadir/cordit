import { create } from 'zustand';
import type { User, Room, Message, ActiveUser } from './types';

interface AppState {
  user: User | null;
  currentRoom: Room | null;
  rooms: Room[];
  messages: Message[];
  activeUsers: ActiveUser[];
  isConnected: boolean;
  typingUsers: string[];
  
  setUser: (user: User | null) => void;
  setCurrentRoom: (room: Room | null) => void;
  setRooms: (rooms: Room[]) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setActiveUsers: (users: ActiveUser[]) => void;
  setConnected: (isConnected: boolean) => void;
  addTypingUser: (username: string) => void;
  removeTypingUser: (username: string) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  currentRoom: null,
  rooms: [],
  messages: [],
  activeUsers: [],
  isConnected: false,
  typingUsers: [],
  
  setUser: (user) => set({ user }),
  
  setCurrentRoom: (room) => set({ currentRoom: room, messages: [] }),
  
  setRooms: (rooms) => set({ rooms }),
  
  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  
  setActiveUsers: (users) => set({ activeUsers: users }),
  
  setConnected: (isConnected) => set({ isConnected }),
  
  addTypingUser: (username) => set((state) => ({
    typingUsers: state.typingUsers.includes(username) 
      ? state.typingUsers 
      : [...state.typingUsers, username]
  })),
  
  removeTypingUser: (username) => set((state) => ({
    typingUsers: state.typingUsers.filter(u => u !== username)
  })),
  
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Disconnect socket
      import('./useSocket').then(({ disconnectSocket }) => {
        disconnectSocket();
        window.location.href = '/login';
      });
    }
    set({ user: null, currentRoom: null, messages: [], activeUsers: [] });
  },
}));
