import React from 'react';
import ModalWrapper from './ModalWrapper';

const ResultModal = ({ selectedMovie, onMarkWatched, onSpinAgain }) => {
    return (
        <ModalWrapper className="p-12 text-center max-w-[500px] w-[90%] relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-neon-primary before:to-transparent">
            <h3 className="text-base uppercase tracking-[3px] text-text-muted mb-2">You're watching:</h3>
            {selectedMovie?.poster_path && (
                <img 
                    src={`https://image.tmdb.org/t/p/w500${selectedMovie.poster_path}`} 
                    alt={selectedMovie.title} 
                    className="w-[200px] rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] mb-6 border-2 border-glass-border mx-auto"
                />
            )}
            <h1 className="text-5xl mb-10 leading-tight text-white drop-shadow-[0_0_20px_var(--neon-secondary)]">{selectedMovie?.title}</h1>
            <div className="flex gap-4 justify-center">
                <button onClick={onMarkWatched} className="secondary-btn bg-neon-primary text-white border-none hover:bg-neon-primary hover:shadow-[0_0_20px_rgba(217,70,239,0.5)]">
                    Mark Watched
                </button>
                <button onClick={onSpinAgain} className="secondary-btn">
                    Spin Again
                </button>
            </div>
        </ModalWrapper>
    );
};

export default ResultModal;
