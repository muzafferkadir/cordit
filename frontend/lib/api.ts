import axios from 'axios';
import type { User, Room, Message, InviteCode } from './types';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (username: string, password: string) => {
    const { data } = await api.post('/user/login', { username, password });
    return data;
  },

  register: async (username: string, password: string, inviteCode: string) => {
    const { data } = await api.post('/user/register', { username, password, inviteCode });
    return data;
  },
};

export const roomAPI = {
  getAll: async (): Promise<{ rooms: Room[] }> => {
    const { data } = await api.get('/room');
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get(`/room/${id}`);
    return data;
  },

  create: async (name: string, description?: string, maxUsers?: number) => {
    const { data } = await api.post('/room', { name, description, maxUsers });
    return data;
  },

  update: async (id: string, updates: Partial<Room>) => {
    const { data } = await api.put(`/room/${id}`, updates);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/room/${id}`);
    return data;
  },

  join: async (id: string) => {
    const { data } = await api.post(`/room/${id}/join`);
    return data;
  },

  leave: async (id: string) => {
    const { data } = await api.post(`/room/${id}/leave`);
    return data;
  },

  getActiveUsers: async (id: string) => {
    const { data } = await api.get(`/room/${id}/users`);
    return data;
  },
};

export const messageAPI = {
  getByRoom: async (roomId: string, page = 1, limit = 50): Promise<{ messages: Message[]; pagination: any }> => {
    const { data } = await api.get(`/message/room/${roomId}?page=${page}&limit=${limit}`);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/message/${id}`);
    return data;
  },
};

export const inviteAPI = {
  validate: async (code: string) => {
    const { data } = await api.post('/invite/validate', { code });
    return data;
  },

  getAll: async (): Promise<{ inviteCodes: InviteCode[] }> => {
    const { data } = await api.get('/invite');
    return data;
  },

  create: async (expiresInHours?: number, maxUses?: number) => {
    const { data } = await api.post('/invite', { expiresInHours, maxUses });
    return data;
  },

  delete: async (code: string) => {
    const { data } = await api.delete(`/invite/${code}`);
    return data;
  },
};

export default api;
