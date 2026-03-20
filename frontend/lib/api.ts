import axios from 'axios';
import type { Room, Message, InviteCode, UserListItem } from './types';

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

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isRefreshRequest = originalRequest.url?.includes('/user/refresh');
    if (error.response?.status === 401 && typeof window !== 'undefined' && !originalRequest._retry && !isRefreshRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        processQueue(error, null);
        isRefreshing = false;
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { token: newToken } = await authAPI.refresh(refreshToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        isRefreshing = false;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (username: string, password: string) => {
    const { data } = await api.post('/user/login', { username, password });
    if (typeof window !== 'undefined' && data.token && data.refreshToken) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    return data;
  },

  register: async (username: string, password: string, inviteCode: string) => {
    const { data } = await api.post('/user/register', { username, password, inviteCode });
    if (typeof window !== 'undefined' && data.token && data.refreshToken) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    return data;
  },

  refresh: async (refreshToken: string) => {
    const { data } = await api.post('/user/refresh', { refreshToken });
    if (typeof window !== 'undefined' && data.token && data.refreshToken) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    return data;
  },
};

export const userAPI = {
  getAll: async (): Promise<{ users: UserListItem[] }> => {
    const { data } = await api.get('/user');
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/user/${id}`);
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

  removeParticipant: async (id: string, participantId: string) => {
    const { data } = await api.post(`/room/${id}/remove-participant`, { participantId });
    return data;
  },
};

export const messageAPI = {
  getByRoom: async (roomId: string, page = 1, limit = 50): Promise<{ messages: Message[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
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

export const uploadAPI = {
  requestUpload: async (fileName: string, mimeType: string, fileSize: number) => {
    const { data } = await api.post('/upload/request', { fileName, mimeType, fileSize });
    return data;
  },

  uploadToS3: async (
    fileId: string,
    url: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<void> => {
    const uploadViaBackend = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', `${API_URL}/upload/${fileId}/content`);

        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('token');
          if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
        }

        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Backend upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Backend upload failed'));
        xhr.send(file);
      });
    };

    // HTTPS pages cannot call insecure presigned URLs (mixed content).
    // In that case, send bytes to backend and let backend upload to MinIO/S3.
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
      return uploadViaBackend();
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          // Fallback for environments where presigned endpoint is unreachable.
          uploadViaBackend().then(resolve).catch(reject);
        }
      };

      xhr.onerror = () => {
        uploadViaBackend().then(resolve).catch(() => reject(new Error('Upload failed')));
      };
      xhr.send(file);
    });
  },

  getDownloadUrl: async (fileId: string) => {
    const { data } = await api.get(`/upload/${fileId}`);
    return data;
  },
};

export default api;
