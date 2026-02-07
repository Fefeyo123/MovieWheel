import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MovieCard from '../common/MovieCard';
import CollectionItem from '../common/CollectionItem';
import MovieListItem from '../common/MovieListItem';
import useMovieFiltering from '../../hooks/useMovieFiltering';
import ModalWrapper from './ModalWrapper';

const MovieListModal = ({ movies, onClose, onDelete, onToggleWatched }) => {
    const [filter, setFilter] = useState('');
    const [sortBy, setSortBy] = useState('date'); // 'date' | 'title' | 'genre'
    const [viewMode, setViewMode] = useState('queue'); // 'queue' | 'watched'
    const [expandedCollections, setExpandedCollections] = useState({}); // { 'Collection Name': true/false }

    const toggleCollection = (collectionName) => {
        setExpandedCollections(prev => ({
            ...prev,
            [collectionName]: !prev[collectionName]
        }));
    };

    // Derived state for filtered and sorted movies
    const processedItems = useMovieFiltering(movies, filter, sortBy, viewMode);

    return (
        <ModalWrapper 
            onClose={onClose}
            className="w-full max-w-[800px] max-h-[85vh] flex flex-col p-4 sm:p-8"
        >
                <div className="flex justify-between items-center mb-4 sm:mb-6 border-b border-white/5 pb-3 sm:pb-4">
                    <div className="flex items-center gap-4">
                        <h2 className="m-0 text-xl sm:text-3xl font-bold bg-gradient-to-r from-white to-text-muted bg-clip-text text-transparent">
                            {viewMode === 'queue' ? 'Movie Queue' : 'Watched Movies'}
                        </h2>
                        {/* View Mode Toggle */}
                        <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                            <button 
                                onClick={() => setViewMode('queue')}
                                className={`px-3 py-1 rounded-md text-sm font-bold transition-all ${viewMode === 'queue' ? 'bg-neon-primary/20 text-neon-primary shadow-sm' : 'text-text-muted hover:text-white'}`}
                            >
                                Queue
                            </button>
                            <button 
                                onClick={() => setViewMode('watched')}
                                className={`px-3 py-1 rounded-md text-sm font-bold transition-all ${viewMode === 'watched' ? 'bg-neon-secondary/20 text-neon-secondary shadow-sm' : 'text-text-muted hover:text-white'}`}
                            >
                                Watched
                            </button>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-transparent border-none text-2xl sm:text-3xl text-text-muted cursor-pointer transition-all duration-300 leading-[0.8] p-2 rounded-full hover:text-white hover:bg-white/10 hover:rotate-90">&times;</button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6 shrink-0 z-10">
                    <div className="relative flex-1">
                        <svg className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none transition-colors duration-300 peer-focus-within:text-neon-secondary" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        <input 
                            type="text" 
                            placeholder="Filter movies..." 
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="glass-input pl-10 sm:pl-12 text-sm sm:text-base py-2 sm:py-3"
                        />
                    </div>
                    
                    <div className="relative w-full sm:w-auto sm:min-w-[160px]">
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full appearance-none glass-input pr-10 cursor-pointer hover:border-neon-secondary/50 focus:border-neon-secondary text-sm sm:text-base py-2 sm:py-3"
                        >
                            <option value="date">Newest First</option>
                            <option value="title">Title (A-Z)</option>
                            <option value="genre">Genre</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-muted">
                           <span className="material-symbols-outlined text-xl">sort</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1 -mr-1 custom-scrollbar pb-2">
                    {processedItems.length > 0 ? processedItems.map(item => {
                        if (item.type === 'collection') {
                            const isExpanded = expandedCollections[item.title];
                            
                            return (
                                <CollectionItem 
                                    key={item.id}
                                    item={item}
                                    isExpanded={isExpanded}
                                    onToggle={() => toggleCollection(item.title)}
                                    onDelete={onDelete}
                                    onToggleWatched={onToggleWatched}
                                    viewMode={viewMode}
                                />
                            );
                        } else {
                            // Single Movie Render
                            return (
                                <MovieListItem
                                    key={item.id}
                                    movie={item}
                                    onDelete={onDelete}
                                    onToggleWatched={onToggleWatched}
                                    viewMode={viewMode}
                                />
                            );
                        }
                    }) : (
                        <div className="flex flex-col items-center justify-center flex-1 opacity-40 text-text-muted">
                            <span className="material-symbols-outlined text-6xl mb-4">movie</span>
                            <p className="text-lg">No movies found.</p>
                        </div>
                    )}
                </div>
        </ModalWrapper>
    );
};

export default MovieListModal;
