'use client';

import { useEffect } from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: 'error' | 'success' | 'warning' | 'primary';
}

export default function ConfirmDialog({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'CONFIRM',
    cancelText = 'CANCEL',
    confirmColor = 'error',
}: ConfirmDialogProps) {
    useEffect(() => {
        if (isOpen) {
            const handleEscape = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onCancel();
            };
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const colorMap = {
        error: 'bg-error',
        success: 'bg-success',
        warning: 'bg-warning',
        primary: 'bg-primary',
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={onCancel}
        >
            <div
                className="card-brutal p-6 max-w-sm mx-4"
                style={{ background: 'var(--bg-card)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="font-black text-lg mb-2">{title}</h3>
                <p className="font-medium text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    {message}
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="btn-brutal flex-1 py-2"
                        style={{ background: 'var(--bg-secondary)' }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`btn-brutal flex-1 py-2 ${colorMap[confirmColor]} text-white`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
