import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

const livekitWsUrl = process.env.LIVEKIT_URL || 'ws://localhost:7880';
const livekitApiUrl = process.env.LIVEKIT_API_URL || livekitWsUrl.replace(/^ws/, 'http');
const apiKey = process.env.LIVEKIT_API_KEY || '';
const apiSecret = process.env.LIVEKIT_API_SECRET || '';

// LiveKit Room Service Client (uses HTTP(S) endpoint, not WS)
export const roomService = new RoomServiceClient(livekitApiUrl, apiKey, apiSecret);

/**
 * Create a LiveKit access token for a user to join a room
 * @param roomName - The name of the LiveKit room
 * @param participantName - The username of the participant
 * @param participantId - Unique ID for the participant (user ID)
 * @returns JWT token for LiveKit client connection
 */
export const createLiveKitToken = async (
  roomName: string,
  participantName: string,
  participantId: string,
): Promise<string> => {
  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantId,
    name: participantName,
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await token.toJwt();
};

/**
 * Create a LiveKit room
 * @param roomName - Unique room name
 * @param maxParticipants - Maximum number of participants (optional)
 * @returns Room info from LiveKit
 */
export const createLiveKitRoom = async (
  roomName: string,
  maxParticipants?: number,
) => {
  try {
    const room = await roomService.createRoom({
      name: roomName,
      emptyTimeout: 300, // 5 minutes
      maxParticipants: maxParticipants || 100,
    });
    return room;
  } catch (error) {
    console.error('Error creating LiveKit room:', error);
    throw error;
  }
};

/**
 * Delete a LiveKit room
 * @param roomName - Room name to delete
 */
export const deleteLiveKitRoom = async (roomName: string) => {
  try {
    await roomService.deleteRoom(roomName);
  } catch (error) {
    console.error('Error deleting LiveKit room:', error);
    throw error;
  }
};

/**
 * List all participants in a LiveKit room
 * @param roomName - Room name
 * @returns Array of participants
 */
export const listParticipants = async (roomName: string) => {
  try {
    const participants = await roomService.listParticipants(roomName);
    return participants;
  } catch (error) {
    console.error('Error listing participants:', error);
    throw error;
  }
};

/**
 * Remove a participant from a LiveKit room
 * @param roomName - Room name
 * @param participantId - Participant identity to remove
 */
export const removeParticipant = async (roomName: string, participantId: string) => {
  try {
    await roomService.removeParticipant(roomName, participantId);
  } catch (error) {
    console.error('Error removing participant:', error);
    throw error;
  }
};

/**
 * Get LiveKit room information
 * @param roomName - Room name
 * @returns Room info
 */
export const getLiveKitRoom = async (roomName: string) => {
  try {
    const rooms = await roomService.listRooms([roomName]);
    return rooms.length > 0 ? rooms[0] : null;
  } catch (error) {
    console.error('Error getting LiveKit room:', error);
    throw error;
  }
};
