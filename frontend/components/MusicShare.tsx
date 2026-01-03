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
          setError('Safari tarayıcısı tab ses paylaşımını desteklemiyor. Chrome veya Firefox kullanın.');
        } else if (!isHttps && !isLocalhost) {
          setError('Ses paylaşımı sadece HTTPS veya localhost üzerinde çalışır');
        } else {
          setError('Tarayıcınız ses paylaşımını desteklemiyor. Chrome veya Firefox güncel versiyonunu kullanın.');
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
        throw new Error('Ses track\'i bulunamadı - sekme seçerken "Share tab audio" kutucuğunu işaretleyin');
      }

      stream.getVideoTracks().forEach(track => track.stop());

      audioTrack.onended = () => {
        console.log('Kullanıcı ses paylaşımını durdurdu');
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

      console.log('Müzik paylaşımı başladı');
    } catch (error: any) {
      console.error('Müzik paylaşımı başarısız:', error);

      if (error.name === 'NotAllowedError') {
        setError('İzin verilmedi - lütfen paylaşmak için bir sekme seçin ve "Share audio" seçeneğini işaretleyin');
      } else if (error.name === 'NotSupportedError') {
        setError('Tarayıcınız tab ses yakalamayı desteklemiyor. Chrome/Firefox kullanın ve HTTPS bağlantısı olduğundan emin olun.');
      } else if (error.name === 'NotFoundError') {
        setError('Ses kaynağı bulunamadı - sekme seçerken "Share audio" kutucuğunu işaretleyin');
      } else if (error.name === 'TypeError' && error.message.includes('audio')) {
        setError('Ses yakalama başarısız - Chrome veya Firefox güncel versiyonunu kullanın');
      } else {
        setError(`Müzik paylaşımı başlatılamadı: ${error.message || 'Bilinmeyen hata'}`);
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
      console.log('Müzik paylaşımı durduruldu');
    } catch (error) {
      console.error('Müzik paylaşımı durdurulurken hata:', error);
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
        {isSharing ? 'MÜZİĞİ DURDUR' : 'MÜZİK PAYLAŞ'}
      </button>

      {error && (
        <p className="text-xs font-bold mt-2" style={{ color: 'var(--error)' }}>
          {error}
        </p>
      )}

      {isSharing && (
        <p className="text-xs font-bold mt-2" style={{ color: 'var(--success)' }}>
          ✓ Sekmenizdeki ses akışı yapılıyor
        </p>
      )}

      {!isSharing && !error && (
        <p className="text-xs font-bold mt-2 opacity-60">
          YouTube, Spotify veya başka bir sekmedeki sesi paylaşın
        </p>
      )}
    </div>
  );
}
