import React, { createContext, useContext, useState, useEffect } from 'react';

const UIContext = createContext();

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};

export const UIProvider = ({ children }) => {
    // User State
    const [selectedUser, setSelectedUser] = useState(localStorage.getItem('movieUser') || '');

    // Modals State
    const [showAddModal, setShowAddModal] = useState(false);
    const [showListModal, setShowListModal] = useState(false);
    
    // Confirmation/Alert Modal State
    const [confirmationModal, setConfirmationModal] = useState({
        isOpen: false,
        type: 'confirm',
        message: '',
        title: '',
        confirmText: 'Yes',
        cancelText: 'Cancel',
        onConfirm: null,
        onCancel: null
    });

    // Persist user selection
    useEffect(() => {
        if (selectedUser) {
            localStorage.setItem('movieUser', selectedUser);
        }
    }, [selectedUser]);

    const confirm = (message, options = {}) => {
        return new Promise((resolve) => {
            setConfirmationModal({
                isOpen: true,
                message,
                type: 'confirm',
                title: options.title || 'Wait a sec...',
                confirmText: options.confirmText || 'Yes',
                cancelText: options.cancelText || 'Cancel',
                onConfirm: () => {
                    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
                    resolve(true);
                },
                onCancel: () => {
                    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
                    resolve(false);
                }
            });
        });
    };

    const alert = (message, options = {}) => {
        return new Promise((resolve) => {
            setConfirmationModal({
                isOpen: true,
                message,
                type: options.type || 'error',
                title: options.title || 'Oops!',
                confirmText: options.confirmText || 'Got it',
                cancelText: null, // No cancel button for alerts
                onConfirm: () => {
                    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
                    resolve(true);
                },
                onCancel: null
            });
        });
    };

    const value = {
        selectedUser,
        setSelectedUser,
        showAddModal,
        setShowAddModal,
        showListModal,
        setShowListModal,
        openAddModal: () => setShowAddModal(true),
        closeAddModal: () => setShowAddModal(false),
        openListModal: () => setShowListModal(true),
        closeListModal: () => setShowListModal(false),
        confirmationModal,
        confirm,
        alert
    };

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    );
};
