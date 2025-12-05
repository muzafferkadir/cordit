'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { roomAPI } from '@/lib/api';
import { Room, Track, LocalAudioTrack, createLocalAudioTrack } from 'livekit-client';
import { 
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
  useLocalParticipant,
  useRoomContext,
} from '@livekit/components-react';

function VoiceControls() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (localParticipant) {
      setIsConnected(true);
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
    }
  };

  return (
    <div className="border-t-3 border-black" style={{ borderWidth: '3px', padding: '1rem 1.5rem' }}>
      <div className="flex flex-col gap-2">
        <button
          onClick={toggleMute}
          className="btn-brutal w-full"
          style={{
            background: isMuted ? 'var(--error)' : 'var(--success)',
            color: 'white',
          }}
        >
          {isMuted ? 'UNMUTE' : 'MUTE'}
        </button>
        <button
          onClick={leaveVoice}
          className="btn-brutal w-full"
          style={{
            background: 'var(--warning)',
            color: 'white',
          }}
        >
          LEAVE VOICE
        </button>
      </div>
    </div>
  );
}

function ParticipantsList() {
  const participants = useParticipants();
  const tracks = useTracks();
  const { currentRoom } = useStore();

  return (
    <div>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '3px solid var(--border)' }}>
        <h4 className="text-sm font-black" style={{ color: 'var(--text-secondary)' }}>
          ACTIVE USERS ({participants.length})
        </h4>
      </div>
      <div style={{ padding: '1rem 1.5rem' }}>
        {participants.map((participant) => {
          const audioTrack = tracks.find(
            t => t.participant === participant && t.source === Track.Source.Microphone
          );
          const isSpeaking = audioTrack?.publication?.isMuted === false;

          return (
            <div
              key={participant.identity}
              className="card-brutal transition-all"
              style={{
                background: isSpeaking ? 'var(--bg-accent)' : 'var(--bg-card)',
                padding: '0.875rem 1rem',
                marginBottom: '0.75rem',
                transform: isSpeaking ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{participant.name || participant.identity}</span>
                {audioTrack?.publication?.isMuted ? (
                  <span className="text-xs badge-brutal" style={{ background: 'var(--error)', color: 'white' }}>
                    MUTED
                  </span>
                ) : (
                  <span className="text-xs badge-brutal gradient-cyan" style={{ color: 'white' }}>
                    {isSpeaking ? 'SPEAKING' : 'LIVE'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function VoiceChat() {
  const { currentRoom, user } = useStore();
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string>('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const joinVoice = async () => {
      if (!currentRoom || !user) return;

      setConnecting(true);
      setError('');

      try {
        const response = await roomAPI.join(currentRoom._id);
        
        if (response.livekitToken && response.livekitUrl) {
          setLivekitToken(response.livekitToken);
          setLivekitUrl(response.livekitUrl);
        } else {
          setError('Voice chat not available for this room');
        }
      } catch (err: any) {
        console.error('Failed to join voice chat:', err);
        setError(err.response?.data?.error || 'Failed to connect to voice chat');
      } finally {
        setConnecting(false);
      }
    };

    joinVoice();
  }, [currentRoom, user]);

  if (connecting) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b-3 border-black gradient-cyan" style={{ borderWidth: '3px', padding: '1rem 1.5rem' }}>
          <h3 className="text-lg font-black text-white">
            VOICE CHAT
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="font-black text-lg">CONNECTING...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b-3 border-black" style={{ borderWidth: '3px' }}>
          <h3 className="text-lg font-black">🎤 VOICE CHAT</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="card-brutal" style={{ background: 'var(--error)', color: 'white' }}>
            <p className="font-bold text-sm">❌ {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!livekitToken || !livekitUrl) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b-3 border-black" style={{ borderWidth: '3px' }}>
          <h3 className="text-lg font-black">🎤 VOICE CHAT</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-4xl mb-2">🔇</div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>
              Voice not available
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={livekitToken}
      serverUrl={livekitUrl}
      connect={true}
      audio={true}
      video={false}
      className="h-full flex flex-col"
    >
      <div className="border-b-3 border-black gradient-purple" style={{ borderWidth: '3px', padding: '1rem 1.5rem' }}>
        <h3 className="text-lg font-black text-white mb-1">VOICE CHAT</h3>
        <p className="text-xs font-bold text-white opacity-80">
          {currentRoom?.name}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-success)' }}>
        <ParticipantsList />
      </div>

      <VoiceControls />

      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
