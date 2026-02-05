import React from 'react';
import '../index.css';

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
        <div className="fixed inset-0 w-screen h-screen bg-[#050511]/70 backdrop-blur-md flex items-center justify-center z-[200] animate-[fadeIn_0.3s_ease]">
            <div className="max-w-[400px] w-[90%] p-10 border border-white/10 bg-slate-900/90 backdrop-blur-2xl rounded-3xl text-center shadow-glass animate-popIn">
                <div 
                    className="w-[80px] h-[80px] rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 border border-current shadow-[0_0_30px_-10px_currentColor]"
                    style={{ color: iconColor }}
                >
                    <span className="material-symbols-outlined text-5xl">
                        {iconName}
                    </span>
                </div>
                
                <h2 className="mb-4 text-2xl font-semibold text-white">{title}</h2>
                <p className="text-text-muted mb-8 text-lg leading-relaxed">
                    {message}
                </p>

                <div className="flex gap-4 justify-center mt-4">
                    {onCancel && (
                        <button onClick={onCancel} className="bg-transparent border border-text-muted text-text-muted px-6 py-2.5 rounded-full text-sm font-semibold uppercase hover:bg-white/5 hover:text-white transition-all duration-300">
                            {cancelText || 'Cancel'}
                        </button>
                    )}
                    <button 
                        onClick={onConfirm} 
                        className="px-6 py-2.5 rounded-full text-sm font-semibold uppercase text-white border-none cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg"
                        style={{ 
                            background: iconColor, 
                            boxShadow: `0 0 15px ${iconColor}66`
                        }}
                    >
                        {confirmText || (type === 'confirm' ? 'Yes' : 'Got it')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WarningModal;
