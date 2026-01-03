'use client';

import { useState, useEffect } from 'react';
import { useRoomContext, useLocalParticipant } from '@livekit/components-react';
import { LocalAudioTrack, Track } from 'livekit-client';

export function MusicShareControls() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState('');
  const [musicTrack, setMusicTrack] = useState<LocalAudioTrack | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const smallScreen = window.innerWidth < 768;
      setIsMobile(mobile || smallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const startMusicShare = async () => {
    try {
      setError('');

      if (!navigator.mediaDevices?.getDisplayMedia) {
        const browserInfo = navigator.userAgent;
        const isSafari = /^((?!chrome|android).)*safari/i.test(browserInfo);
        const isHttps = window.location.protocol === 'https:';
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isSafari) {
          setError('Safari does not support tab audio capture. Use Chrome or Firefox.');
        } else if (!isHttps && !isLocalhost) {
          setError('Audio sharing requires HTTPS or localhost');
        } else {
          setError('Your browser does not support audio sharing. Use latest Chrome or Firefox.');
        }
        console.error('getDisplayMedia not supported', { browserInfo, isHttps, isLocalhost });
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
        },
      });

      const audioTrack = stream.getAudioTracks()[0];

      if (!audioTrack) {
        throw new Error('No audio track found - make sure to check "Share tab audio" when selecting');
      }

      stream.getVideoTracks().forEach(track => track.stop());

      audioTrack.onended = () => {
        console.log('User stopped audio sharing');
        stopMusicShare();
      };

      const livekitTrack = new LocalAudioTrack(
        audioTrack,
        undefined,
        false
      );

      await localParticipant.publishTrack(livekitTrack, {
        name: 'music-share',
        source: Track.Source.ScreenShareAudio,
        simulcast: false,
      });

      setMusicTrack(livekitTrack);
      setIsSharing(true);

      console.log('Music sharing started');
    } catch (error: any) {
      console.error('Music sharing failed:', error);

      if (error.name === 'NotAllowedError') {
        setError('Permission denied - please select a tab and check "Share audio" option');
      } else if (error.name === 'NotSupportedError') {
        setError('Your browser does not support tab audio capture. Use Chrome/Firefox with HTTPS.');
      } else if (error.name === 'NotFoundError') {
        setError('Audio source not found - make sure to check "Share audio" when selecting tab');
      } else if (error.name === 'TypeError' && error.message.includes('audio')) {
        setError('Audio capture failed - use latest Chrome or Firefox');
      } else {
        setError(`Failed to start music sharing: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const stopMusicShare = async () => {
    try {
      if (musicTrack) {
        await localParticipant.unpublishTrack(musicTrack);
        musicTrack.stop();
        setMusicTrack(null);
      }
      setIsSharing(false);
      setError('');
      console.log('Music sharing stopped');
    } catch (error) {
      console.error('Error stopping music sharing:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (musicTrack) {
        localParticipant.unpublishTrack(musicTrack);
        musicTrack.stop();
      }
    };
  }, [musicTrack, localParticipant]);

  if (isMobile) {
    return null;
  }

  return (
    <div style={{ padding: '1rem 1.5rem', borderTop: '3px solid black' }}>
      <button
        onClick={isSharing ? stopMusicShare : startMusicShare}
        className="btn-brutal w-full"
        style={{
          background: isSharing ? 'var(--error)' : 'var(--primary)',
          color: 'black',
        }}
      >
        {isSharing ? 'STOP MUSIC' : 'SHARE MUSIC'}
      </button>

      {error && (
        <p className="text-xs font-bold mt-2" style={{ color: 'var(--error)' }}>
          {error}
        </p>
      )}

      {isSharing && (
        <p className="text-xs font-bold mt-2" style={{ color: 'var(--success)' }}>
          ✓ Streaming audio from your tab
        </p>
      )}

      {!isSharing && !error && (
        <p className="text-xs font-bold mt-2 opacity-60">
          Share audio from YouTube, Spotify, or any other tab
        </p>
      )}
    </div>
  );
}
