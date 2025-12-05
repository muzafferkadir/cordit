'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { roomAPI } from '@/lib/api';
import { Track } from 'livekit-client';
import { 
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
  useLocalParticipant,
  useRoomContext,
} from '@livekit/components-react';

function VoiceControls({ onLeave }: { onLeave: () => void }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (localParticipant) {
      const audioTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
      setIsMuted(audioTrack?.isMuted ?? false);
    }
  }, [localParticipant]);

  const toggleMute = async () => {
    if (!localParticipant) return;
    
    const audioTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
    if (audioTrack) {
      await localParticipant.setMicrophoneEnabled(audioTrack.isMuted);
      setIsMuted(!audioTrack.isMuted);
    }
  };

  const leaveVoice = () => {
    if (room) {
      room.disconnect();
      onLeave();
    }
  };

  return (
    <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-card)', borderTop: '3px solid black' }}>
      <div className="flex gap-3">
        <button
          onClick={toggleMute}
          className="btn-brutal flex-1"
          style={{
            background: isMuted ? 'var(--error)' : 'var(--success)',
            color: 'white',
          }}
        >
          {isMuted ? 'UNMUTE' : 'MUTE'}
        </button>
        <button
          onClick={leaveVoice}
          className="btn-brutal flex-1"
          style={{
            background: 'var(--warning)',
            color: 'white',
          }}
        >
          LEAVE
        </button>
      </div>
    </div>
  );
}

function ParticipantsList() {
  const participants = useParticipants();
  const tracks = useTracks();
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set());

  useEffect(() => {
    const listeners = new Map<any, (speaking: boolean) => void>();

    participants.forEach(participant => {
      const handler = (speaking: boolean) => {
        setSpeakingParticipants(prev => {
          const next = new Set(prev);
          if (speaking) {
            next.add(participant.identity);
          } else {
            next.delete(participant.identity);
          }
          return next;
        });
      };
      
      listeners.set(participant, handler);
      participant.on('isSpeakingChanged', handler);
    });

    return () => {
      listeners.forEach((handler, participant) => {
        participant.off('isSpeakingChanged', handler);
      });
    };
  }, [participants]);

  const colors = ['var(--bg-card)', 'var(--bg-secondary)', 'var(--bg-success)', 'var(--bg-purple)'];

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {participants.map((participant, idx) => {
          const audioTrack = tracks.find(
            t => t.participant === participant && t.source === Track.Source.Microphone
          );
          const isMuted = audioTrack?.publication?.isMuted ?? true;
          const isSpeaking = speakingParticipants.has(participant.identity);

          return (
            <div
              key={participant.identity}
              className="card-brutal"
              style={{
                background: colors[idx % 4],
                padding: '0.875rem 1rem',
                border: isSpeaking ? '3px solid var(--success)' : '3px solid black',
                transition: 'border 0.1s ease',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-sm">
                  {participant.name || participant.identity}
                </span>
                <span 
                  className="badge-brutal text-xs"
                  style={{ 
                    background: isMuted ? 'var(--error)' : isSpeaking ? 'var(--success)' : 'var(--warning)',
                    color: 'white',
                  }}
                >
                  {isMuted ? 'MUTED' : isSpeaking ? 'SPEAKING' : 'LIVE'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VoiceConnected({ onLeave }: { onLeave: () => void }) {
  const { currentRoom } = useStore();

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
      <div className="gradient-purple" style={{ padding: '1rem 1.5rem', borderBottom: '3px solid black' }}>
        <h3 className="text-xl font-black text-white">VOICE CHAT</h3>
        <p className="text-xs font-bold text-white opacity-80 mt-1">
          {currentRoom?.name}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ParticipantsList />
      </div>

      <VoiceControls onLeave={onLeave} />

      <RoomAudioRenderer />
    </div>
  );
}

export default function VoiceChat() {
  const { currentRoom, user } = useStore();
  const [isJoined, setIsJoined] = useState(false);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string>('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Reset state when room changes
  useEffect(() => {
    setIsJoined(false);
    setLivekitToken(null);
    setLivekitUrl('');
    setError('');
  }, [currentRoom?._id]);

  const joinVoice = async () => {
    if (!currentRoom || !user) return;

    setConnecting(true);
    setError('');

    try {
      const response = await roomAPI.join(currentRoom._id);
      
      if (response.livekitToken && response.livekitUrl) {
        setLivekitToken(response.livekitToken);
        setLivekitUrl(response.livekitUrl);
        setIsJoined(true);
      } else {
        setError('Voice not available');
      }
    } catch (err: any) {
      console.error('Failed to join voice chat:', err);
      setError(err.response?.data?.error || 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  const leaveVoice = () => {
    setIsJoined(false);
    setLivekitToken(null);
    setLivekitUrl('');
  };

  // Not joined - show join button
  if (!isJoined) {
    return (
      <div className="h-full flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
        <div className="gradient-purple" style={{ padding: '1rem 1.5rem', borderBottom: '3px solid black' }}>
          <h3 className="text-xl font-black text-white">VOICE CHAT</h3>
          <p className="text-xs font-bold text-white opacity-80 mt-1">
            {currentRoom?.name}
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center" style={{ padding: '1.5rem' }}>
          <div className="text-center w-full">
            {error ? (
              <div style={{ marginBottom: '1rem' }}>
                <p className="font-bold text-sm" style={{ color: 'var(--error)' }}>{error}</p>
              </div>
            ) : null}
            <button
              onClick={joinVoice}
              disabled={connecting}
              className="btn-brutal w-full"
              style={{
                background: 'var(--success)',
                color: 'white',
              }}
            >
              {connecting ? 'CONNECTING...' : 'JOIN VOICE'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Joined - show LiveKit room
  if (livekitToken && livekitUrl) {
    return (
      <LiveKitRoom
        token={livekitToken}
        serverUrl={livekitUrl}
        connect={true}
        audio={true}
        video={false}
        className="h-full"
      >
        <VoiceConnected onLeave={leaveVoice} />
      </LiveKitRoom>
    );
  }

  return null;
}
