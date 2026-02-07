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

    // Persist user selection
    useEffect(() => {
        if (selectedUser) {
            localStorage.setItem('movieUser', selectedUser);
        }
    }, [selectedUser]);

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
    };

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    );
};
