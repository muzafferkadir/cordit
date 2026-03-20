'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { uploadAPI } from '@/lib/api';
import type { FileAttachment } from '@/lib/types';

interface MediaMessageProps {
  attachment: FileAttachment;
  cachedUrl?: string;
  onUrlLoaded?: (fileId: string, url: string) => void;
}

export default function MediaMessage({ attachment, cachedUrl, onUrlLoaded }: MediaMessageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cachedUrl);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (cachedUrl) {
      return;
    }

    let cancelled = false;
    const loadUrl = async () => {
      try {
        const data = await uploadAPI.getDownloadUrl(attachment.fileId);
        if (!cancelled) {
          setUrl(data.downloadUrl);
          setLoading(false);
          onUrlLoaded?.(attachment.fileId, data.downloadUrl);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadUrl();
    return () => { cancelled = true; };
  }, [attachment.fileId, cachedUrl, onUrlLoaded]);

  const displayUrl = cachedUrl || url;
  const isLoading = !cachedUrl && loading;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  if (isLoading) {
    return (
      <div className="mt-2 p-3 border-2 border-black bg-surface rounded" style={{ borderRadius: 0 }}>
        <span className="text-xs font-bold">Loading media...</span>
      </div>
    );
  }

  if (error || !displayUrl) {
    return (
      <div className="mt-2 p-3 border-2 border-black bg-surface rounded" style={{ borderRadius: 0 }}>
        <span className="text-xs font-bold text-error">Media expired or unavailable</span>
      </div>
    );
  }

  const isImage = attachment.mimeType.startsWith('image/');
  const isVideo = attachment.mimeType.startsWith('video/');
  const isAudio = attachment.mimeType.startsWith('audio/');

  return (
    <div className="mt-2">
      {isImage && (
        <a href={displayUrl} target="_blank" rel="noopener noreferrer">
          <Image
            src={displayUrl}
            alt={attachment.fileName}
            width={800}
            height={600}
            unoptimized
            className="border-2 border-black"
            style={{ maxWidth: '100%', maxHeight: 300, width: 'auto', height: 'auto', borderRadius: 0, objectFit: 'contain' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              setError(true);
            }}
          />
        </a>
      )}

      {isVideo && (
        <video
          controls
          className="border-2 border-black"
          style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 0 }}
          preload="metadata"
        >
          <source src={displayUrl} type={attachment.mimeType} />
          Your browser does not support video playback.
        </video>
      )}

      {isAudio && (
        <audio
          controls
          className="w-full"
          preload="metadata"
        >
          <source src={displayUrl} type={attachment.mimeType} />
          Your browser does not support audio playback.
        </audio>
      )}

      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs font-bold truncate" style={{ maxWidth: 200 }}>
          {attachment.fileName}
        </span>
        <span className="badge-brutal text-xs bg-surface px-1 py-0">
          {formatSize(attachment.fileSize)}
        </span>
        <span className="badge-brutal text-xs px-1 py-0" style={{ background: 'var(--bg-accent)', color: 'var(--text-dark)' }}>
          24h
        </span>
      </div>
    </div>
  );
}
