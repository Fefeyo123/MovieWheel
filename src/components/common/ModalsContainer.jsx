import React from 'react';
import { useUI } from '../../context/UIContext';
import AddMovieModal from '../modals/AddMovieModal';
import MovieListModal from '../modals/MovieListModal';
import WarningModal from '../modals/WarningModal';

const ModalsContainer = ({ movies, onDelete, onToggleWatched }) => {
    const { 
        showAddModal, 
        closeAddModal, 
        showListModal, 
        closeListModal,
        selectedUser,
        confirmationModal
    } = useUI();

    return (
        <>
            {showAddModal && (
                <AddMovieModal 
                    onClose={closeAddModal} 
                    currentUser={selectedUser} 
                />
            )}
            
            {showListModal && (
                <MovieListModal 
                    movies={movies} 
                    onClose={closeListModal} 
                    onDelete={onDelete}
                    onToggleWatched={onToggleWatched}
                />
            )}

            {confirmationModal.isOpen && (
                <WarningModal
                    type={confirmationModal.type}
                    message={confirmationModal.message}
                    title={confirmationModal.title}
                    confirmText={confirmationModal.confirmText}
                    cancelText={confirmationModal.cancelText}
                    onConfirm={confirmationModal.onConfirm}
                    onCancel={confirmationModal.onCancel}
                />
            )}
        </>
    );
};

export default ModalsContainer;
