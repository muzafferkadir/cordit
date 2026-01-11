'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { roomAPI } from '@/lib/api';
import { Track, RemoteAudioTrack, Participant, LocalAudioTrack } from 'livekit-client';
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
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [micPermissionError, setMicPermissionError] = useState('');
  const [showMicSettings, setShowMicSettings] = useState(false);

  useEffect(() => {
    const loadMicrophones = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        const hasPermission = audioInputs.some(device => device.label.length > 0);

        if (hasPermission) {
          setMicrophones(audioInputs);
          if (audioInputs.length > 0 && !selectedMicrophone) {
            setSelectedMicrophone(audioInputs[0].deviceId);
          }
          setMicPermissionError('');
        } else {
          setMicrophones([]);
          setMicPermissionError('');
        }
      } catch (error) {
        console.error('Error loading microphones:', error);
        setMicrophones([]);
      }
    };

    loadMicrophones();
    navigator.mediaDevices.addEventListener('devicechange', loadMicrophones);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadMicrophones);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      setMicrophones(audioInputs);

      if (audioInputs.length > 0 && !selectedMicrophone) {
        setSelectedMicrophone(audioInputs[0].deviceId);
      }

      setMicPermissionError('');
      return true;
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      const err = error as { name?: string };
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermissionError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else {
        setMicPermissionError('Failed to access microphone. Please check your browser settings.');
      }
      return false;
    }
  };

  useEffect(() => {
    if (!localParticipant) return;

    const updateMuteState = () => {
      const audioTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
      setIsMuted(audioTrack?.isMuted ?? false);
    };

    updateMuteState();

    const handleTrackPublished = () => updateMuteState();
    const handleTrackUnpublished = () => updateMuteState();

    localParticipant.on('trackPublished', handleTrackPublished);
    localParticipant.on('trackUnpublished', handleTrackUnpublished);

    return () => {
      localParticipant.off('trackPublished', handleTrackPublished);
      localParticipant.off('trackUnpublished', handleTrackUnpublished);
    };
  }, [localParticipant]);

  const toggleMute = async () => {
    if (!localParticipant) return;

    try {
    const audioTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
    if (audioTrack) {
      const newMutedState = !audioTrack.isMuted;
      await localParticipant.setMicrophoneEnabled(!newMutedState);
      setIsMuted(newMutedState);
      } else {
        if (microphones.length === 0) {
          const hasPermission = await requestMicrophonePermission();
          if (!hasPermission) return;
        }
        await localParticipant.setMicrophoneEnabled(true);
        setIsMuted(false);
      }
    } catch (error) {
      console.error('Error toggling microphone:', error);
      const err = error as { name?: string };
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermissionError('Microphone permission denied. Please allow microphone access.');
      }
    }
  };

  const handleMicrophoneChange = async (deviceId: string) => {
    if (!localParticipant || !room) return;

    try {
      setSelectedMicrophone(deviceId);

      const currentTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
      const wasMuted = currentTrack?.isMuted ?? true;

      if (currentTrack?.track) {
        const trackToStop = currentTrack.track;
        await localParticipant.unpublishTrack(trackToStop);
        if (trackToStop && typeof trackToStop.stop === 'function') {
          trackToStop.stop();
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) throw new Error('No audio track found');

      const livekitTrack = new LocalAudioTrack(audioTrack);
      await localParticipant.publishTrack(livekitTrack, { source: Track.Source.Microphone });

      if (wasMuted) {
        await localParticipant.setMicrophoneEnabled(false);
      }

      setMicPermissionError('');
    } catch (error) {
      console.error('Error changing microphone:', error);
      const err = error as { name?: string };
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermissionError('Microphone permission denied. Please allow microphone access.');
      } else {
        setMicPermissionError('Failed to switch microphone. Please try again.');
      }
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
      {micPermissionError && (
        <div className="mb-3 p-2" style={{ background: 'var(--error)', color: 'white', borderRadius: '4px' }}>
          <p className="text-xs font-bold">{micPermissionError}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={toggleMute}
          className="btn-brutal flex-1"
          style={{ background: isMuted ? 'var(--success)' : 'var(--error)', color: 'white' }}
        >
          {isMuted ? 'UNMUTE' : 'MUTE'}
        </button>
        <button
          onClick={leaveVoice}
          className="btn-brutal flex-1"
          style={{ background: 'var(--warning)', color: 'white' }}
        >
          LEAVE
        </button>
        <button
          onClick={async () => {
            if (!showMicSettings && microphones.length === 0) {
              await requestMicrophonePermission();
            }
            setShowMicSettings(!showMicSettings);
          }}
          className="btn-brutal"
          style={{
            background: showMicSettings ? 'var(--primary)' : 'var(--bg-secondary)',
            color: 'black',
            padding: '0.75rem',
            minWidth: '44px',
          }}
          title="Microphone Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {showMicSettings && (
        <div className="mt-3 p-3" style={{ background: 'var(--bg-secondary)', borderRadius: '4px', border: '2px solid black' }}>
          {microphones.length === 0 ? (
            <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
              No microphone access. Click ⚙️ to request permission.
            </p>
          ) : microphones.length === 1 ? (
            <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
              Using: {microphones[0].label || 'Default Microphone'}
            </p>
          ) : (
            <select
              value={selectedMicrophone}
              onChange={(e) => handleMicrophoneChange(e.target.value)}
              className="input-brutal w-full text-sm"
              style={{ padding: '0.5rem' }}
            >
              {microphones.map((mic) => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

function ParticipantsList({ compact = false }: { compact?: boolean }) {
  const { user, currentRoom } = useStore();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const tracks = useTracks();
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set());
  const [volumeLevels, setVolumeLevels] = useState<Record<string, number>>({});
  const [musicVolumeLevels, setMusicVolumeLevels] = useState<Record<string, number>>({});
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; participantId: string } | null>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const listeners = new Map<Participant, (speaking: boolean) => void>();

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
      if (audioTrack?.publication?.track && audioTrack.publication.track instanceof RemoteAudioTrack) {
        audioTrack.publication.track.setVolume(volume);
      }
    }
  };

  const handleMusicVolumeChange = (participantId: string, volume: number) => {
    setMusicVolumeLevels(prev => ({ ...prev, [participantId]: volume }));

    const participant = participants.find(p => p.identity === participantId);
    if (participant) {
      const musicTrack = tracks.find(
        t => t.participant === participant && t.source === Track.Source.ScreenShareAudio
      );
      if (musicTrack?.publication?.track && musicTrack.publication.track instanceof RemoteAudioTrack) {
        musicTrack.publication.track.setVolume(volume);
      }
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!isAdmin || !currentRoom) return;

    try {
      const participant = participants.find(p => p.identity === participantId);
      if (!participant) return;

      await roomAPI.removeParticipant(currentRoom._id, participantId);
    } catch (error) {
      console.error('Error removing participant:', error);
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
          const musicVolume = musicVolumeLevels[participant.identity] ?? 1;
          const isExpanded = contextMenu?.participantId === participant.identity;
          const isLocalParticipant = participant.identity === localParticipant?.identity;
          const canRemove = isAdmin && !isLocalParticipant;

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
                  {isSharingMusic ? (
                    <span
                      className="badge-brutal text-xs"
                      style={{ background: 'var(--primary)', color: 'black' }}
                    >
                      MUSIC
                    </span>
                  ) : (
                  <span
                    className="badge-brutal text-xs"
                    style={{
                      background: isMuted ? 'var(--error)' : isSpeaking ? 'var(--success)' : 'var(--warning)',
                      color: 'white',
                    }}
                  >
                    {isMuted ? 'MUTED' : isSpeaking ? 'SPEAKING' : 'LIVE'}
                  </span>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div style={{ borderTop: '2px solid rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2 mt-2 pt-2">
                  <span className="text-xs font-bold" style={{ minWidth: '32px' }}>
                    {Math.round(volume * 100)}%
                  </span>
                    <span className="text-xs font-bold opacity-60" style={{ minWidth: '60px' }}>Voice</span>
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

                  {isSharingMusic && (
                    <div className="flex items-center gap-2 mt-2 pt-2">
                      <span className="text-xs font-bold" style={{ minWidth: '32px' }}>
                        {Math.round(musicVolume * 100)}%
                      </span>
                      <span className="text-xs font-bold opacity-60" style={{ minWidth: '60px' }}>Music</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={musicVolume}
                        onChange={(e) => handleMusicVolumeChange(participant.identity, parseFloat(e.target.value))}
                        className="flex-1"
                        style={{ accentColor: 'var(--primary)' }}
                      />
                    </div>
                  )}

                  {canRemove && (
                    <div className="mt-2 pt-2" style={{ borderTop: '2px solid rgba(0,0,0,0.1)' }}>
                      <button
                        onClick={() => handleRemoveParticipant(participant.identity)}
                        className="btn-brutal w-full text-xs"
                        style={{ background: 'var(--error)', color: 'white', padding: '0.5rem' }}
                      >
                        REMOVE FROM ROOM
                      </button>
                    </div>
                  )}
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
        <p className="text-xs font-bold opacity-80 mt-1">{currentRoom?.name}</p>
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
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string>('');

  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        const hasPermission = audioInputs.some(device => device.label.length > 0);

        if (hasPermission && audioInputs.length > 0) {
          setSelectedMicrophoneId(audioInputs[0].deviceId);
        }
      } catch (error) {
        console.error('Error checking microphone:', error);
      }
    };

    checkMicrophonePermission();
  }, []);

  useEffect(() => {
    setIsJoined(false);
    setLivekitToken(null);
    setLivekitUrl('');
    setError('');
  }, [currentRoom?._id]);

  const joinVoice = useCallback(async () => {
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
    } catch (err: unknown) {
      console.error('Failed to join voice chat:', err);
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  }, [currentRoom, user, onJoinStateChange]);

  const leaveVoice = useCallback(() => {
    setIsJoined(false);
    setLivekitToken(null);
    setLivekitUrl('');
    onJoinStateChange?.(false);
  }, [onJoinStateChange]);

  const prevJoinTrigger = useRef(externalJoinTrigger);
  const prevLeaveTrigger = useRef(externalLeaveTrigger);

  useEffect(() => {
    if (prevJoinTrigger.current !== externalJoinTrigger && externalJoinTrigger !== undefined) {
      prevJoinTrigger.current = externalJoinTrigger;
      if (!isJoined && !connecting) {
        joinVoice();
      }
    }
  }, [externalJoinTrigger, isJoined, connecting, joinVoice]);

  useEffect(() => {
    if (prevLeaveTrigger.current !== externalLeaveTrigger && externalLeaveTrigger !== undefined) {
      prevLeaveTrigger.current = externalLeaveTrigger;
      if (isJoined) {
        leaveVoice();
      }
    }
  }, [externalLeaveTrigger, isJoined, leaveVoice]);

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
            {error && (
              <div style={{ marginBottom: '1rem' }}>
                <p className="font-bold text-sm" style={{ color: 'var(--error)' }}>{error}</p>
              </div>
            )}
            <button
              onClick={joinVoice}
              disabled={connecting}
              className="btn-brutal w-full"
              style={{ background: 'var(--success)', color: 'white' }}
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
        audio={selectedMicrophoneId ? {
          deviceId: selectedMicrophoneId,
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
        } : {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
        }}
        video={false}
        className={isMobile ? '' : 'h-full'}
        onError={(err) => {
          console.error('LiveKit connection error:', err);
          const error = err as { message?: string };
          if (error.message?.includes('microphone') || error.message?.includes('permission')) {
            setError('Microphone permission denied. Please allow microphone access.');
          } else {
          setError('Voice server unavailable');
          }
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
