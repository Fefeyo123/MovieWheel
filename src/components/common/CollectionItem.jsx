import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MovieListItem from './MovieListItem';

const CollectionItem = ({ 
    item, 
    isExpanded, 
    onToggle, 
    onDelete, 
    onToggleWatched, 
    viewMode 
}) => {
    return (
        <div className="flex flex-col gap-2">
            <div 
                onClick={onToggle}
                className="relative group cursor-pointer z-0 isolate"
            >
                {/* Stack effect hints for collection */}
                {!isExpanded && (
                    <div className="absolute top-0 left-2 right-2 h-full bg-[#121215] border border-white/10 rounded-xl -z-10 scale-[0.98] -translate-y-1.5 shadow-lg transition-transform duration-300 group-hover:-translate-y-2.5"></div>
                )}

                {/* Main Card Content */}
                <div className={`relative z-10 p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 border
                    ${isExpanded 
                        ? 'bg-[#1a1a20] border-neon-secondary/30 shadow-[0_0_15px_rgba(139,92,246,0.1)]' 
                        : 'bg-[#1a1a20] border-transparent hover:bg-[#202025] hover:border-white/10 hover:-translate-x-[-4px]'
                    }
                `}>
                    <div className="flex flex-row gap-3 sm:gap-5 items-start sm:items-center w-full">
                        {/* Representative Poster */}
                        <div className="relative">
                            {item.representative.poster_path ? (
                                <img 
                                    src={`https://image.tmdb.org/t/p/w154${item.representative.poster_path}`}
                                    alt={item.title}
                                    className="w-[50px] h-[75px] sm:w-[60px] sm:h-[90px] object-cover rounded-lg shrink-0 shadow-md group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)] transition-all duration-300"
                                />
                            ) : (
                                <div className="w-[50px] h-[75px] sm:w-[60px] sm:h-[90px] bg-white/5 rounded-lg flex items-center justify-center text-2xl sm:text-3xl text-text-muted shrink-0 border border-dashed border-white/10">
                                    <span className="material-symbols-outlined">library_books</span>
                                </div>
                            )}
                            <div className="absolute -bottom-2 -right-2 bg-neon-secondary text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10 border border-white/20">
                                {item.movies.length}
                            </div>
                        </div>
                        
                        <div className="flex-1 min-w-0 text-left flex flex-col justify-center gap-1">
                            <div className="flex items-center gap-2">
                                <h4 className="m-0 text-base sm:text-xl font-bold text-neon-accent tracking-wide truncate group-hover:text-white transition-colors duration-300 drop-shadow-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">collections_bookmark</span>
                                    {item.title}
                                </h4>
                            </div>
                            <div className="text-xs text-text-muted opacity-80">
                                {item.movies.length} movies • {item.movies[0].release_date ? item.movies[0].release_date.split('-')[0] : 'Unknown'} - {item.movies[item.movies.length-1].release_date ? item.movies[item.movies.length-1].release_date.split('-')[0] : 'Unknown'}
                            </div>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center text-sm opacity-90 mt-0.5 sm:mt-1">
                                {Array.isArray(item.representative.genre) ? item.representative.genre.map(g => (
                                    <span key={g} className="bg-white/5 text-white/90 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-white/10 shadow-sm">
                                        {g}
                                    </span>
                                )) : (
                                    <span className="bg-white/5 text-white/90 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-white/10 shadow-sm">
                                        {item.representative.genre}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="text-text-muted">
                            <span className={`material-symbols-outlined transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expanded List */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden pl-4 border-l-2 border-white/10 ml-4 flex flex-col gap-2"
                    >
                        {item.movies.map(movie => (
                            <MovieListItem
                                key={movie.id}
                                movie={movie}
                                onDelete={onDelete}
                                onToggleWatched={onToggleWatched}
                                viewMode={viewMode}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CollectionItem;
