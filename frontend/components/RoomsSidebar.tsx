'use client';

import type { Room } from '@/lib/types';

interface RoomsSidebarProps {
  rooms: Room[];
  currentRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

export default function RoomsSidebar({
  rooms,
  currentRoomId,
  onSelectRoom,
  onCreateRoom,
  isOpen = false,
  onClose,
  isMobile = false,
}: RoomsSidebarProps) {
  // Mobile modal version - only show when open
  if (isMobile) {
    if (!isOpen) return null;
    
    return (
      <>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 30,
          }}
          onClick={onClose}
        />
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: '60px',
            background: 'var(--bg-secondary)',
            borderRight: '3px solid black',
            borderBottom: '3px solid black',
            overflowY: 'auto',
            zIndex: 40,
            padding: '1rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {rooms.map((room, index) => (
              <button
                key={room._id}
                onClick={() => {
                  onSelectRoom(room._id);
                  onClose?.();
                }}
                className="card-brutal"
                style={{
                  background:
                    currentRoomId === room._id
                      ? 'var(--bg-accent)'
                      : index % 3 === 0
                        ? 'var(--bg-card)'
                        : index % 3 === 1
                          ? 'var(--bg-success)'
                          : 'var(--bg-purple)',
                  width: '100%',
                  padding: '1rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div className="font-black text-sm">{room.name}</div>
                  {room.description && (
                    <div className="text-xs mt-1" style={{ opacity: 0.7 }}>
                      {room.description}
                    </div>
                  )}
                </div>
                <span className="badge-brutal">{room.name.charAt(0).toUpperCase()}</span>
              </button>
            ))}
            <button
              onClick={() => {
                onCreateRoom();
                onClose?.();
              }}
              className="card-brutal"
              style={{
                background: 'var(--cyan)',
                width: '100%',
                padding: '1rem',
                cursor: 'pointer',
                color: 'white',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              + CREATE ROOM
            </button>
          </div>
        </div>
      </>
    );
  }

  // Desktop version (vertical sidebar)
  return (
    <aside
      style={{
        background: 'var(--bg-secondary)',
        borderRight: '3px solid black',
        width: '80px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="flex-1 overflow-y-auto" style={{ padding: '1rem 0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {rooms.map((room, index) => (
            <button
              key={room._id}
              onClick={() => onSelectRoom(room._id)}
              className="card-brutal font-black"
              style={{
                background:
                  currentRoomId === room._id
                    ? 'var(--bg-accent)'
                    : index % 3 === 0
                      ? 'var(--bg-card)'
                      : index % 3 === 1
                        ? 'var(--bg-success)'
                        : 'var(--bg-purple)',
                width: '100%',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                cursor: 'pointer',
              }}
              title={room.name}
            >
              {room.name.charAt(0).toUpperCase()}
            </button>
          ))}
          <button
            onClick={onCreateRoom}
            className="card-brutal font-black"
            style={{
              background: 'var(--cyan)',
              width: '100%',
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              cursor: 'pointer',
            }}
            title="Add New Room"
          >
            +
          </button>
        </div>
      </div>
    </aside>
  );
}
