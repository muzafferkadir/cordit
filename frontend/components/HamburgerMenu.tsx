'use client';

import { useState } from 'react';

interface HamburgerMenuProps {
  onClose: () => void;
}

export default function HamburgerMenu({ onClose }: HamburgerMenuProps) {
  return (
    <button
      onClick={onClose}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
      }}
      title="Menu"
    >
      <span
        style={{
          width: '24px',
          height: '3px',
          background: 'black',
          borderRadius: '2px',
          transition: 'all 0.2s ease',
        }}
      />
      <span
        style={{
          width: '24px',
          height: '3px',
          background: 'black',
          borderRadius: '2px',
          transition: 'all 0.2s ease',
        }}
      />
      <span
        style={{
          width: '24px',
          height: '3px',
          background: 'black',
          borderRadius: '2px',
          transition: 'all 0.2s ease',
        }}
      />
    </button>
  );
}
