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
    <nav className="mobile-only md:hidden flex fixed bottom-0 left-0 right-0 w-full bg-card z-50 p-0 shadow-lg">
      {!isInVoice ? (
        <>
          <button
            onClick={onJoinVoice}
            disabled={isJoinDisabled}
            className={`
              flex-1 py-4 px-3 font-bold uppercase text-xs transition-all duration-150 border-t-[3px] border-b-[3px] border-black
              ${isJoinDisabled
                ? 'bg-surface text-dim cursor-not-allowed border-r-[1.5px] opacity-60'
                : 'bg-success text-white cursor-pointer border-r-[1.5px]'
              }
              border-l-[3px] border-l-black
            `}
          >
            {connecting ? '...' : '🎤 JOIN VOICE'}
          </button>
          <button
            onClick={onToggleChat}
            className={`
              flex-1 py-4 px-3 font-bold uppercase text-xs transition-all duration-150 border-t-[3px] border-b-[3px] border-black
              ${isChatOpen ? 'bg-yellow' : 'bg-card'}
              text-dark cursor-pointer border-l-[1.5px] border-l-black border-r-[3px] border-r-black
            `}
          >
            💬 CHAT
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onLeaveVoice}
            className="flex-1 py-4 px-3 font-bold uppercase text-xs text-white transition-all duration-150 border-t-[3px] border-b-[3px] border-black bg-warning border-l-[3px] border-l-black border-r-[1.5px] border-black cursor-pointer"
          >
            🚪 LEAVE
          </button>
          <button
            onClick={onToggleMute}
            className={`
              flex-1 py-4 px-3 font-bold uppercase text-xs text-white transition-all duration-150 border-t-[3px] border-b-[3px] border-black
              ${isMuted ? 'bg-error' : 'bg-success'}
              border-x-[1.5px] border-x-black cursor-pointer
            `}
          >
            {isMuted ? '🔇 UNMUTE' : '🔊 MUTE'}
          </button>
          <button
            onClick={onToggleChat}
            className={`
              flex-1 py-4 px-3 font-bold uppercase text-xs transition-all duration-150 border-t-[3px] border-b-[3px] border-black
              ${isChatOpen ? 'bg-yellow' : 'bg-card'}
              text-dark cursor-pointer border-l-[1.5px] border-l-black border-r-[3px] border-r-black
            `}
          >
            💬 CHAT
          </button>
        </>
      )}
    </nav>
  );
}
