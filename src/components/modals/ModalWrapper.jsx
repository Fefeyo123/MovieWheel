import React from 'react';

const ModalWrapper = ({ children, onClose, className = "", containerClassName = "" }) => {
    return (
        <div 
            className={`fixed inset-0 w-screen h-screen bg-[#050511]/70 backdrop-blur-md flex items-center justify-center z-[100] animate-[fadeIn_0.3s_ease] p-4 sm:p-0 ${containerClassName}`}
            onClick={onClose}
        >
            <div 
                className={`glass-panel animate-slideUp ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
};

export default ModalWrapper;
