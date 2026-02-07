import React from 'react';
import { useUI } from '../../context/UIContext';
import AddMovieModal from '../modals/AddMovieModal';
import MovieListModal from '../modals/MovieListModal';

const ModalsContainer = ({ movies, onDelete, onToggleWatched }) => {
    const { 
        showAddModal, 
        closeAddModal, 
        showListModal, 
        closeListModal,
        selectedUser 
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
        </>
    );
};

export default ModalsContainer;
