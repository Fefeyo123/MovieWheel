import React from 'react';
import '../../index.css';
import ModalWrapper from './ModalWrapper';

const WarningModal = ({ type, message, onConfirm, onCancel, confirmText, cancelText }) => {
    // type: 'error' | 'confirm' | 'success' (added success for completeness)
    
    // Determine icon and colors based on type
    let iconName = 'error';
    let iconColor = 'var(--pointer-color)'; // Redish
    let title = 'Oops!';
    
    if (type === 'confirm') {
        iconName = 'history';
        iconColor = 'var(--neon-accent)'; // Cyan
        title = 'Wait a sec...';
    } else if (type === 'success') {
        iconName = 'check_circle';
        iconColor = 'var(--neon-secondary)'; // Violet
        title = 'Success!';
    }

    return (
        <ModalWrapper className="max-w-[400px] w-[90%] p-10 text-center">
            <div 
                className="w-[80px] h-[80px] rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 border border-current shadow-[0_0_40px_-10px_currentColor]"
                style={{ color: iconColor }}
            >
                <span className="material-symbols-outlined text-5xl drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                    {iconName}
                </span>
            </div>
            
            <h2 className="mb-4 text-3xl font-bold text-white tracking-wide">{title}</h2>
            <p className="text-text-muted mb-8 text-lg leading-relaxed font-light">
                {message}
            </p>

            <div className="flex gap-4 justify-center mt-4">
                {onCancel && (
                    <button onClick={onCancel} className="bg-transparent border border-white/10 text-text-muted px-8 py-3 rounded-full text-sm font-bold uppercase tracking-wider hover:bg-white/10 hover:text-white hover:border-white/30 transition-all duration-300">
                        {cancelText || 'Cancel'}
                    </button>
                )}
                <button 
                    onClick={onConfirm} 
                    className="px-8 py-3 rounded-full text-sm font-bold uppercase text-white border-none cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg hover:-translate-y-0.5"
                    style={{ 
                        background: iconColor, 
                        boxShadow: `0 0 20px ${iconColor}66`
                    }}
                >
                    {confirmText || (type === 'confirm' ? 'Yes' : 'Got it')}
                </button>
            </div>
        </ModalWrapper>
    );
};

export default WarningModal;
