export interface User {
  username: string;
  role: 'admin' | 'user';
  token: string;
}

export interface UserListItem {
  _id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt?: string;
}

export interface Room {
  _id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  maxUsers?: number;
  activeUserCount?: number;
  livekitRoomName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  roomId: string;
  userId: string;
  username: string;
  text: string;
  messageType: 'text' | 'system';
  createdAt: string;
  updatedAt: string;
}

export interface InviteCode {
  code: string;
  createdBy: string;
  createdByUsername: string;
  expiresAt: string;
  isUsed: boolean;
  usedByUsername?: string;
  maxUses: number;
  currentUses: number;
  isExpired: boolean;
  isAvailable: boolean;
  remainingUses: number;
  createdAt: string;
}

export interface ActiveUser {
  userId: string;
  username: string;
  joinedAt: string;
  isVoiceActive?: boolean;
  livekitParticipantId?: string;
}
