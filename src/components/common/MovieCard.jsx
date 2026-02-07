import React from 'react';
import { motion } from 'framer-motion';

const MovieCard = ({ 
    movie, 
    onClick, 
    actions, 
    mobileActions, 
    meta, 
    posterSize = "w-[50px] h-[75px] sm:w-[60px] sm:h-[90px]",
    titleSize = "text-base sm:text-xl"
}) => {
    
    // Helper to render genres safely
    const renderGenres = () => {
        if (Array.isArray(movie.genre)) {
             return movie.genre.map(g => (
                <span key={g} className="bg-white/5 text-white/90 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-white/10 shadow-sm">
                    {g}
                </span>
            ));
        }

        if (typeof movie.genre === 'string') {
             return (
                <span className="bg-white/5 text-white/90 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-white/10 shadow-sm">
                    {movie.genre}
                </span>
            );
        }

        return null;
    };

    return (
        <div 
            onClick={onClick}
            className="group relative p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 border border-transparent hover:bg-white/5 hover:border-white/10 hover:-translate-x-[-4px] bg-[#1a1a20]"
        >
            {/* Mobile Actions (Absolute Positioned) */}
            {mobileActions}

            <div className="flex flex-row gap-3 sm:gap-5 items-start sm:items-center w-full">
                {/* Poster */}
                {movie.poster_path ? (
                    <img 
                        src={`https://image.tmdb.org/t/p/w154${movie.poster_path}`}
                        alt={movie.title}
                        className={`${posterSize} object-cover rounded-lg shrink-0 shadow-md group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)] transition-all duration-300`}
                    />
                ) : (
                    <div className={`${posterSize} bg-white/5 rounded-lg flex items-center justify-center text-2xl sm:text-3xl text-text-muted shrink-0 border border-dashed border-white/10`}>
                        {movie.id ? '?' : <span className="material-symbols-outlined">movie</span>}
                    </div>
                )}
                
                <div className="flex-1 min-w-0 text-left flex flex-col justify-center gap-1">
                    <div className="pr-8 sm:pr-0"> {/* Padding for mobile actions */}
                        <h4 className={`m-0 ${titleSize} font-bold text-white tracking-wide truncate group-hover:text-neon-secondary transition-colors duration-300 drop-shadow-sm`}>
                            {movie.title}
                        </h4>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center text-sm opacity-90 mt-0.5 sm:mt-1">
                        {renderGenres()}
                        {movie.release_date && (
                            <span className="text-xs text-text-muted font-mono opacity-70 ml-1">
                                {movie.release_date.split('-')[0]}
                            </span>
                        )}
                    </div>

                    {/* Mobile Meta (e.g. Added by) */}
                    <div className="sm:hidden mt-2">
                        {meta && meta.mobile}
                    </div>
                </div>

                {/* Desktop Meta (e.g. Added by) */}
                {meta && meta.desktop && (
                    <div className="hidden sm:flex flex-col items-end gap-1.5 sm:gap-2 pl-2 sm:pl-4 border-l border-white/5 ml-1 sm:ml-2 shrink-0">
                        {meta.desktop}
                    </div>
                )}

                {/* Desktop Actions */}
                {actions && (
                    <div className="hidden sm:flex items-center gap-1 ml-2 sm:ml-4 shrink-0">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MovieCard;
