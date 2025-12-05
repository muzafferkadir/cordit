'use client';

interface MobileNavProps {
  isInVoice: boolean;
  isMuted: boolean;
  isChatOpen: boolean;
  hasRoom: boolean;
  onJoinVoice: () => void;
  onLeaveVoice: () => void;
  onToggleMute: () => void;
  onToggleChat: () => void;
  connecting?: boolean;
}

export default function MobileNav({
  isInVoice,
  isMuted,
  isChatOpen,
  hasRoom,
  onJoinVoice,
  onLeaveVoice,
  onToggleMute,
  onToggleChat,
  connecting = false
}: MobileNavProps) {
  const isJoinDisabled = !hasRoom || connecting;

  return (
    <nav
      className="mobile-only md:hidden flex fixed bottom-0 left-0 right-0"
      style={{
        background: 'var(--bg-card)',
        justifyContent: 'center',
        padding: 0,
        zIndex: 50,
      }}
    >
      {!isInVoice ? (
        <>
          <button
            onClick={onJoinVoice}
            disabled={isJoinDisabled}
            style={{
              flex: 1,
              padding: '1rem 0.75rem',
              background: isJoinDisabled ? 'var(--bg-main)' : 'var(--success)',
              borderTop: '3px solid black',
              borderBottom: '3px solid black',
              borderLeft: '3px solid black',
              borderRight: '1.5px solid var(--border)',
              cursor: isJoinDisabled ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              color: isJoinDisabled ? 'var(--text-secondary)' : 'white',
              transition: 'all 0.15s ease',
              opacity: isJoinDisabled ? 0.6 : 1,
            }}
          >
            {connecting ? '...' : '🎤 JOIN VOICE'}
          </button>
          <button
            onClick={onToggleChat}
            style={{
              flex: 1,
              padding: '1rem 0.75rem',
              background: isChatOpen ? 'var(--bg-accent)' : 'var(--bg-card)',
              borderTop: '3px solid black',
              borderBottom: '3px solid black',
              borderLeft: '1.5px solid var(--border)',
              borderRight: '3px solid black',
              cursor: 'pointer',
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              transition: 'all 0.15s ease',
            }}
          >
            💬 CHAT
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onLeaveVoice}
            style={{
              flex: 1,
              padding: '1rem 0.75rem',
              background: 'var(--warning)',
              borderTop: '3px solid black',
              borderBottom: '3px solid black',
              borderLeft: '3px solid black',
              borderRight: '1.5px solid var(--border)',
              cursor: 'pointer',
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              color: 'white',
              transition: 'all 0.15s ease',
            }}
          >
            🚪 LEAVE
          </button>
          <button
            onClick={onToggleMute}
            style={{
              flex: 1,
              padding: '1rem 0.75rem',
              background: isMuted ? 'var(--error)' : 'var(--success)',
              borderTop: '3px solid black',
              borderBottom: '3px solid black',
              borderLeft: '1.5px solid var(--border)',
              borderRight: '1.5px solid var(--border)',
              cursor: 'pointer',
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              color: 'white',
              transition: 'all 0.15s ease',
            }}
          >
            {isMuted ? '🔇 UNMUTE' : '🔊 MUTE'}
          </button>
          <button
            onClick={onToggleChat}
            style={{
              flex: 1,
              padding: '1rem 0.75rem',
              background: isChatOpen ? 'var(--bg-accent)' : 'var(--bg-card)',
              borderTop: '3px solid black',
              borderBottom: '3px solid black',
              borderLeft: '1.5px solid var(--border)',
              borderRight: '3px solid black',
              cursor: 'pointer',
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              transition: 'all 0.15s ease',
            }}
          >
            💬 CHAT
          </button>
        </>
      )}
    </nav>
  );
}
