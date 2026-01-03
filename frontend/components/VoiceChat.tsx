'use client';

import { useEffect, useState, useRef } from 'react';
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
import { MusicShareControls } from './MusicShare';

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
      const newMutedState = !audioTrack.isMuted;
      await localParticipant.setMicrophoneEnabled(!newMutedState);
      setIsMuted(newMutedState);
    }
  };

  const leaveVoice = () => {
    if (room) {
      room.disconnect();
      onLeave();
    }
  };

  return (
    <div style={{ padding: '1.2rem 1.5rem', background: 'var(--bg-card)', borderTop: '3px solid black' }}>
      <div className="flex gap-3">
        <button
          onClick={toggleMute}
          className="btn-brutal flex-1"
          style={{
            background: isMuted ? 'var(--success)' : 'var(--error)',
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

function ParticipantsList({ compact = false }: { compact?: boolean }) {
  const participants = useParticipants();
  const tracks = useTracks();
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set());
  const [volumeLevels, setVolumeLevels] = useState<Record<string, number>>({});
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; participantId: string } | null>(null);

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


  const handleVolumeChange = (participantId: string, volume: number) => {
    setVolumeLevels(prev => ({ ...prev, [participantId]: volume }));

    const participant = participants.find(p => p.identity === participantId);
    if (participant) {
      const audioTrack = tracks.find(
        t => t.participant === participant && t.source === Track.Source.Microphone
      );
      if (audioTrack?.publication?.track) {
        (audioTrack.publication.track as any).setVolume?.(volume);
      }
    }
  };

  const colors = ['var(--bg-card)', 'var(--bg-secondary)', 'var(--bg-success)', 'var(--bg-purple)'];

  return (
    <div style={{ padding: compact ? '0.75rem' : '1.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '0.5rem' : '1rem' }}>
        {participants.map((participant, idx) => {
          const audioTrack = tracks.find(
            t => t.participant === participant && t.source === Track.Source.Microphone
          );
          const musicTrack = tracks.find(
            t => t.participant === participant && t.source === Track.Source.ScreenShareAudio
          );
          const isMuted = audioTrack?.publication?.isMuted ?? true;
          const isSpeaking = speakingParticipants.has(participant.identity);
          const isSharingMusic = !!musicTrack;
          const volume = volumeLevels[participant.identity] ?? 1;
          const isExpanded = contextMenu?.participantId === participant.identity;

          return (
            <div
              key={participant.identity}
              className="card-brutal"
              style={{
                background: colors[idx % 4],
                padding: compact ? '0.625rem 0.75rem' : '0.875rem 1rem',
                border: isSpeaking ? '3px solid var(--success)' : '3px solid black',
                transition: 'border 0.1s ease',
              }}
            >
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setContextMenu(isExpanded ? null : { x: 0, y: 0, participantId: participant.identity })}
              >
                <span className="font-black text-sm">
                  {participant.name || participant.identity}
                </span>
                <div className="flex items-center gap-2">
                  {isSharingMusic && (
                    <span
                      className="badge-brutal text-xs"
                      style={{
                        background: 'var(--primary)',
                        color: 'black',
                      }}
                    >
                      MUSIC
                    </span>
                  )}
                  {volume < 1 && (
                    <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                      {Math.round(volume * 100)}%
                    </span>
                  )}
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
              {isExpanded && (
                <div
                  className="flex items-center gap-2 mt-2 pt-2"
                  style={{ borderTop: '2px solid rgba(0,0,0,0.1)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xs font-bold" style={{ minWidth: '32px' }}>
                    {Math.round(volume * 100)}%
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => handleVolumeChange(participant.identity, parseFloat(e.target.value))}
                    className="flex-1"
                    style={{ accentColor: 'var(--primary)' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VoiceConnected({ onLeave, isMobile = false, externalMuteTrigger, onMuteStateChange }: {
  onLeave: () => void;
  isMobile?: boolean;
  externalMuteTrigger?: boolean;
  onMuteStateChange?: (isMuted: boolean) => void;
}) {
  const { currentRoom } = useStore();
  const { localParticipant } = useLocalParticipant();
  const prevMuteTrigger = useRef(externalMuteTrigger);

  useEffect(() => {
    if (isMobile && prevMuteTrigger.current !== externalMuteTrigger && externalMuteTrigger !== undefined) {
      prevMuteTrigger.current = externalMuteTrigger;
      if (localParticipant) {
        const audioTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
        if (audioTrack) {
          const newMuted = !audioTrack.isMuted;
          localParticipant.setMicrophoneEnabled(audioTrack.isMuted);
          onMuteStateChange?.(newMuted);
        }
      }
    }
  }, [externalMuteTrigger, isMobile, localParticipant, onMuteStateChange]);

  if (isMobile) {
    return (
      <>
        <ParticipantsList compact={true} />
        <RoomAudioRenderer />
      </>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
      <div className="gradient-yellow" style={{ padding: '1rem 1.5rem', borderBottom: '3px solid black' }}>
        <h3 className="text-xl font-black">VOICE CHAT</h3>
        <p className="text-xs font-bold opacity-80 mt-1">
          {currentRoom?.name}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ParticipantsList />
      </div>

      <MusicShareControls />

      <VoiceControls onLeave={onLeave} />

      <RoomAudioRenderer />
    </div>
  );
}

interface VoiceChatProps {
  isMobile?: boolean;
  onJoinStateChange?: (isJoined: boolean) => void;
  onMuteStateChange?: (isMuted: boolean) => void;
  externalJoinTrigger?: boolean;
  externalLeaveTrigger?: boolean;
  externalMuteTrigger?: boolean;
}

export default function VoiceChat({
  isMobile = false,
  onJoinStateChange,
  onMuteStateChange,
  externalJoinTrigger,
  externalLeaveTrigger,
  externalMuteTrigger,
}: VoiceChatProps = {}) {
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
        onJoinStateChange?.(true);
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
    onJoinStateChange?.(false);
  };

  const prevJoinTrigger = useRef(externalJoinTrigger);
  const prevLeaveTrigger = useRef(externalLeaveTrigger);

  useEffect(() => {
    if (prevJoinTrigger.current !== externalJoinTrigger && externalJoinTrigger !== undefined) {
      prevJoinTrigger.current = externalJoinTrigger;
      if (!isJoined && !connecting) {
        joinVoice();
      }
    }
  }, [externalJoinTrigger]);

  useEffect(() => {
    if (prevLeaveTrigger.current !== externalLeaveTrigger && externalLeaveTrigger !== undefined) {
      prevLeaveTrigger.current = externalLeaveTrigger;
      if (isJoined) {
        leaveVoice();
      }
    }
  }, [externalLeaveTrigger]);

  if (isMobile && !isJoined) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center' }}>
        <div className="card-brutal" style={{ background: 'var(--bg-card)', padding: '1.5rem' }}>
          <h3 className="font-black text-lg mb-2">🎤 Voice Chat</h3>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {connecting ? 'Connecting...' : 'Tap "Join Voice" to connect'}
          </p>
          {error && (
            <p className="text-sm font-bold mt-2" style={{ color: 'var(--error)' }}>{error}</p>
          )}
        </div>
      </div>
    );
  }

  if (!isJoined && !isMobile) {
    return (
      <div className="h-full flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
        <div className="gradient-yellow" style={{ padding: '1rem 1.5rem', borderBottom: '3px solid black' }}>
          <h3 className="text-xl font-black">VOICE CHAT</h3>
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

  if (livekitToken && livekitUrl) {
    return (
      <LiveKitRoom
        token={livekitToken}
        serverUrl={livekitUrl}
        connect={true}
        audio={{ noiseSuppression: true, echoCancellation: true, autoGainControl: true }}
        video={false}
        className={isMobile ? '' : 'h-full'}
        onError={(err) => {
          console.error('LiveKit connection error:', err);
          setError('Voice server unavailable');
          leaveVoice();
        }}
        onDisconnected={() => {
          if (isJoined) {
            setError('Disconnected from voice');
            leaveVoice();
          }
        }}
      >
        <VoiceConnected
          onLeave={leaveVoice}
          isMobile={isMobile}
          externalMuteTrigger={externalMuteTrigger}
          onMuteStateChange={onMuteStateChange}
        />
      </LiveKitRoom>
    );
  }

  return null;
}
