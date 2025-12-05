// LiveKit types for future integration
export interface LiveKitConfig {
  apiKey: string;
  apiSecret: string;
  wsUrl: string;
}

export interface LiveKitTokenOptions {
  roomName: string;
  participantName: string;
  participantIdentity: string;
  metadata?: string;
}

export interface LiveKitParticipant {
  sid: string;
  identity: string;
  name: string;
  metadata?: string;
  joinedAt: Date;
}

// WebSocket event types for real-time communication
export enum WebSocketEventType {
  MESSAGE_SENT = 'message:sent',
  MESSAGE_DELETED = 'message:deleted',
  USER_JOINED = 'user:joined',
  USER_LEFT = 'user:left',
  USER_TYPING = 'user:typing',
  ROOM_UPDATED = 'room:updated',
  VOICE_STATE_CHANGED = 'voice:stateChanged',
}

export interface WebSocketEvent {
  type: WebSocketEventType;
  roomId: string;
  data: any;
  timestamp: Date;
}
