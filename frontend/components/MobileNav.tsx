'use client';

interface MobileNavProps {
  activeTab: 'chat' | 'voice' | 'rooms';
  onTabChange: (tab: 'chat' | 'voice' | 'rooms') => void;
  hasUnreadVoice?: boolean;
}

export default function MobileNav({ activeTab, onTabChange, hasUnreadVoice }: MobileNavProps) {
  return (
    <nav
      className="show-mobile fixed bottom-0 left-0 right-0"
      style={{
        background: 'var(--bg-card)',
        borderTop: '3px solid black',
        display: 'flex',
        justifyContent: 'center',
        padding: 0,
        zIndex: 40,
      }}
    >
      <button
        onClick={() => onTabChange('chat')}
        style={{
          flex: 1,
          padding: '1rem 0.75rem',
          background: activeTab === 'chat' ? 'var(--bg-accent)' : 'transparent',
          border: activeTab === 'chat' ? '3px solid black' : 'none',
          borderRight: '1.5px solid var(--border)',
          cursor: 'pointer',
          fontWeight: 700,
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          transition: 'all 0.15s ease',
        }}
      >
        💬 CHAT
      </button>
      <button
        onClick={() => onTabChange('voice')}
        style={{
          flex: 1,
          padding: '1rem 0.75rem',
          background: activeTab === 'voice' ? 'var(--bg-accent)' : 'transparent',
          border: activeTab === 'voice' ? '3px solid black' : 'none',
          borderRight: '1.5px solid var(--border)',
          cursor: 'pointer',
          fontWeight: 700,
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          transition: 'all 0.15s ease',
          position: 'relative',
        }}
      >
        🎤 VOICE
        {hasUnreadVoice && (
          <span
            style={{
              position: 'absolute',
              top: '0.25rem',
              right: '0.25rem',
              width: '8px',
              height: '8px',
              background: 'var(--error)',
              borderRadius: '50%',
            }}
          />
        )}
      </button>
      <button
        onClick={() => onTabChange('rooms')}
        style={{
          flex: 1,
          padding: '1rem 0.75rem',
          background: activeTab === 'rooms' ? 'var(--bg-accent)' : 'transparent',
          border: activeTab === 'rooms' ? '3px solid black' : 'none',
          cursor: 'pointer',
          fontWeight: 700,
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          transition: 'all 0.15s ease',
        }}
      >
        🏠 ROOMS
      </button>
    </nav>
  );
}
