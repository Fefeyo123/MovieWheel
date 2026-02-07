import React from 'react';
import { motion } from 'framer-motion';
import MovieCard from './MovieCard';

const MovieListItem = ({ movie, onDelete, onToggleWatched, viewMode }) => {
    return (
        <MovieCard
            movie={movie}
            mobileActions={
                <>
                    {onDelete && (
                        <motion.button 
                            onClick={(e) => { e.stopPropagation(); onDelete(movie); }}
                            whileTap={{ scale: 0.9 }}
                            className="sm:hidden absolute top-2 right-2 w-[24px] h-[24px] rounded-full bg-white/10 text-text-muted text-base flex items-center justify-center cursor-pointer z-20"
                        >
                            <span className="material-symbols-outlined text-sm">delete</span>
                        </motion.button>
                    )}

                    {onToggleWatched && (
                        <motion.button 
                            onClick={(e) => { e.stopPropagation(); onToggleWatched(movie); }}
                            whileTap={{ scale: 0.9 }}
                            className={`sm:hidden absolute top-2 ${onDelete ? 'right-10' : 'right-2'} w-[24px] h-[24px] rounded-full bg-white/10 text-text-muted flex items-center justify-center cursor-pointer z-20`}
                        >
                            <span className="material-symbols-outlined text-sm">
                                {viewMode === 'watched' ? 'undo' : 'visibility'}
                            </span>
                        </motion.button>
                    )}
                </>
            }
            meta={{
                mobile: (
                    <div className="flex items-center gap-2">
                        <div className="text-[9px] uppercase tracking-[1px] text-text-muted opacity-50 font-bold">Added by</div>
                        <div className="px-2 py-0.5 rounded-full bg-neon-primary/10 border border-neon-primary/30 text-neon-primary text-[10px] font-extra-bold uppercase tracking-widest">
                            {movie.added_by || 'Unknown'}
                        </div>
                    </div>
                ),
                desktop: (
                    <>
                        <div className="hidden sm:block text-[9px] uppercase tracking-[2px] text-text-muted opacity-50 font-bold">
                            Added by
                        </div>
                        <div className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-neon-primary/10 border border-neon-primary/30 text-neon-primary text-[10px] sm:text-xs font-extra-bold uppercase tracking-widest shadow-[0_0_10px_rgba(217,70,239,0.1)] group-hover:shadow-[0_0_15px_rgba(217,70,239,0.3)] transition-all duration-300">
                            {movie.added_by || 'Unknown'}
                        </div>
                    </>
                )
            }}
            actions={
                <>
                    {onToggleWatched && (
                        <motion.button 
                            onClick={(e) => { e.stopPropagation(); onToggleWatched(movie); }}
                            whileHover={{ scale: 1.1, backgroundColor: viewMode === 'watched' ? "rgba(234, 179, 8, 0.2)" : "rgba(34, 197, 94, 0.2)", color: viewMode === 'watched' ? "#ca8a04" : "#22c55e", borderColor: viewMode === 'watched' ? "rgba(234, 179, 8, 0.3)" : "rgba(34, 197, 94, 0.3)" }}
                            whileTap={{ scale: 0.9 }}
                            className="w-[30px] h-[30px] sm:w-[36px] sm:h-[36px] rounded-full border border-white/5 bg-white/5 text-text-muted items-center justify-center cursor-pointer transition-colors duration-300 flex"
                            title={viewMode === 'watched' ? "Mark as Unwatched" : "Mark as Watched"}
                        >
                            <span className="material-symbols-outlined text-base sm:text-lg">
                                {viewMode === 'watched' ? 'undo' : 'visibility'}
                            </span>
                        </motion.button>
                    )}

                    {onDelete && (
                        <motion.button 
                            onClick={() => onDelete(movie)}
                            whileHover={{ scale: 1.1, backgroundColor: "#ef4444", color: "#fff", borderColor: "rgba(239, 68, 68, 0.3)", boxShadow: "0 0 15px rgba(239, 68, 68, 0.5)" }}
                            whileTap={{ scale: 0.9 }}
                            className="w-[30px] h-[30px] sm:w-[36px] sm:h-[36px] rounded-full border border-white/5 bg-white/5 text-text-muted items-center justify-center cursor-pointer transition-colors duration-300 flex"
                            title="Remove from queue"
                        >
                            <span className="material-symbols-outlined text-base sm:text-lg">delete</span>
                        </motion.button>
                    )}
                </>
            }
        />
    );
};

export default MovieListItem;
