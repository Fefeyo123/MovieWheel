import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MovieListModal = ({ movies, onClose, onDelete }) => {
    const [filter, setFilter] = useState('');
    const [sortBy, setSortBy] = useState('date'); // 'date' | 'title' | 'genre'
    const [expandedCollections, setExpandedCollections] = useState({}); // { 'Collection Name': true/false }

    const toggleCollection = (collectionName) => {
        setExpandedCollections(prev => ({
            ...prev,
            [collectionName]: !prev[collectionName]
        }));
    };

    // Derived state for filtered and sorted movies withGrouping
    const processedItems = useMemo(() => {
        let result = [...movies];

        // 1. Filter
        if (filter) {
            const lowerFilter = filter.toLowerCase();
            result = result.filter(m => 
                m.title.toLowerCase().includes(lowerFilter) || 
                (m.genre && (Array.isArray(m.genre) ? m.genre.join(' ') : m.genre).toLowerCase().includes(lowerFilter)) ||
                (m.added_by && m.added_by.toLowerCase().includes(lowerFilter)) ||
                (m.collection_name && m.collection_name.toLowerCase().includes(lowerFilter))
            );
        }

        // 2. Grouping
        const groups = {}; // { 'Collection Name': [movies...] }
        const standalone = [];

        result.forEach(movie => {
            if (movie.collection_name) {
                if (!groups[movie.collection_name]) {
                    groups[movie.collection_name] = [];
                }
                groups[movie.collection_name].push(movie);
            } else {
                standalone.push(movie);
            }
        });

        // Flatten single-movie collections back to standalone
        Object.keys(groups).forEach(name => {
            if (groups[name].length === 1) {
                standalone.push(groups[name][0]);
                delete groups[name];
            }
        });

        // Convert groups to "Item" objects
        const groupItems = Object.entries(groups).map(([name, groupMovies]) => {
            // Sort movies within the collection by release date (Oldest first) to find representative
            const sortedByDate = [...groupMovies].sort((a, b) => {
                if (!a.release_date) return 1;
                if (!b.release_date) return -1;
               return new Date(a.release_date) - new Date(b.release_date);
            });

            const representative = sortedByDate[0]; // First movie in timeline

            // Determines value for sorting the *Group* in the main list
            // We want the group to appear based on its "best" member for the current sort
            let sortValue;
            if (sortBy === 'date') {
                 // Newest added ID
                 sortValue = Math.max(...groupMovies.map(m => m.id));
            } else if (sortBy === 'title') {
                sortValue = name;
            } else if (sortBy === 'genre') {
                sortValue = representative.genre; // Use representative's genre
            }

            return {
                type: 'collection',
                id: `collection-${name}`, // Pseudo ID
                title: name,
                representative: representative,
                movies: sortedByDate, // The movies inside, sorted by release date
                sortValue: sortValue
            };
        });

        const singleItems = standalone.map(m => ({
            type: 'movie',
            ...m,
            sortValue: sortBy === 'date' ? m.id : (sortBy === 'title' ? m.title : m.genre)
        }));

        const allItems = [...groupItems, ...singleItems];

        // 3. Sort the mixed list
        allItems.sort((a, b) => {
            if (sortBy === 'title') {
                return String(a.sortValue).localeCompare(String(b.sortValue));
            } else if (sortBy === 'genre') {
                 // Genre might be array
                 const gA = Array.isArray(a.sortValue) ? a.sortValue[0] : a.sortValue;
                 const gB = Array.isArray(b.sortValue) ? b.sortValue[0] : b.sortValue;
                 return String(gA || '').localeCompare(String(gB || ''));
            } else {
                // Default: Date added (ID descending)
                return b.sortValue - a.sortValue;
            }
        });

        return allItems;
    }, [movies, filter, sortBy]);

    return (
        <div className="fixed inset-0 w-screen h-screen bg-[#050511]/70 backdrop-blur-md flex items-center justify-center z-[100] animate-[fadeIn_0.3s_ease] p-4 sm:p-0">
            <div className="glass-panel w-full max-w-[800px] max-h-[85vh] flex flex-col p-4 sm:p-8 animate-slideUp">
                <div className="flex justify-between items-center mb-4 sm:mb-6 border-b border-white/5 pb-3 sm:pb-4">
                    <h2 className="m-0 text-xl sm:text-3xl font-bold bg-gradient-to-r from-white to-text-muted bg-clip-text text-transparent">Movie Queue ({movies.length})</h2>
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
                                <div key={item.id} className="flex flex-col gap-2">
                                    <div 
                                        onClick={() => toggleCollection(item.title)}
                                        className="relative group cursor-pointer z-0 isolate"
                                    >
                                         {/* Stack effect hints for collection - Solid and opaque - Single layer behind, as sibling */}
                                        {!isExpanded && (
                                            <div className="absolute top-0 left-2 right-2 h-full bg-[#121215] border border-white/10 rounded-xl -z-10 scale-[0.98] -translate-y-1.5 shadow-lg transition-transform duration-300 group-hover:-translate-y-2.5"></div>
                                        )}

                                        {/* Main Card Content - The "Top Layer" */}
                                        <div className={`relative z-10 p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 border
                                            ${isExpanded 
                                                ? 'bg-[#1a1a20] border-neon-secondary/30 shadow-[0_0_15px_rgba(139,92,246,0.1)]' 
                                                : 'bg-[#1a1a20] border-transparent hover:bg-[#202025] hover:border-white/10 hover:-translate-x-[-4px]'
                                            }
                                        `}>
                                            <div className="flex flex-row gap-3 sm:gap-5 items-start sm:items-center w-full">
                                            {/* Representative Poster */}
                                            {item.representative.poster_path ? (
                                                <div className="relative">
                                                     <img 
                                                        src={`https://image.tmdb.org/t/p/w154${item.representative.poster_path}`}
                                                        alt={item.title}
                                                        className="w-[50px] h-[75px] sm:w-[60px] sm:h-[90px] object-cover rounded-lg shrink-0 shadow-md group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)] transition-all duration-300"
                                                    />
                                                    <div className="absolute -bottom-2 -right-2 bg-neon-secondary text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10 border border-white/20">
                                                        {item.movies.length}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                     <div className="w-[50px] h-[75px] sm:w-[60px] sm:h-[90px] bg-white/5 rounded-lg flex items-center justify-center text-2xl sm:text-3xl text-text-muted shrink-0 border border-dashed border-white/10">
                                                        <span className="material-symbols-outlined">library_books</span>
                                                     </div>
                                                      <div className="absolute -bottom-2 -right-2 bg-neon-secondary text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10 border border-white/20">
                                                        {item.movies.length}
                                                    </div>
                                                </div>
                                            )}
                                            
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
                                                     {/* Show genres of representative or aggregate? Representative is fine */}
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
                                                     <div key={movie.id} className="group/inner relative p-2 sm:p-3 rounded-lg bg-white/5 flex gap-3 items-center hover:bg-white/10 transition-colors">
                                                         {/* Mini Poster */}
                                                         {movie.poster_path && (
                                                             <img 
                                                                src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                                                                alt={movie.title}
                                                                className="w-[30px] h-[45px] object-cover rounded shadow-sm opacity-80 group-hover/inner:opacity-100"
                                                             />
                                                         )}

                                                         <div className="flex-1 min-w-0">
                                                             <div className="text-sm font-bold text-white/90 truncate">{movie.title}</div>
                                                             <div className="text-[10px] text-text-muted flex gap-2">
                                                                <span>{movie.release_date ? movie.release_date.split('-')[0] : ''}</span>
                                                                {movie.added_by && <span className="text-neon-primary/70">Added by {movie.added_by}</span>}
                                                             </div>
                                                         </div>

                                                         {/* Delete Button for Inner Item */}
                                                         {onDelete && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); onDelete(movie); }}
                                                                className="w-[24px] h-[24px] rounded-full bg-white/5 hover:bg-red-500/20 text-text-muted hover:text-red-500 flex items-center justify-center transition-colors"
                                                            >
                                                                &times;
                                                            </button>
                                                         )}
                                                     </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        } else {
                            // Single Movie Render (Original Logic adapted)
                            const movie = item;
                            return (
                                <div key={movie.id} className="group relative p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 border border-transparent hover:bg-white/5 hover:border-white/10 hover:-translate-x-[-4px]">
                                    {/* Delete button for Mobile - Absolute positioned top-right */}
                                    {onDelete && (
                                        <motion.button 
                                            onClick={(e) => { e.stopPropagation(); onDelete(movie); }}
                                            whileTap={{ scale: 0.9 }}
                                            className="sm:hidden absolute top-2 right-2 w-[24px] h-[24px] rounded-full bg-white/10 text-text-muted text-base flex items-center justify-center cursor-pointer z-20"
                                        >
                                            &times;
                                        </motion.button>
                                    )}

                                    <div className="flex flex-row gap-3 sm:gap-5 items-start sm:items-center w-full">
                                        {movie.poster_path ? (
                                            <img 
                                                src={`https://image.tmdb.org/t/p/w154${movie.poster_path}`}
                                                alt={movie.title}
                                                className="w-[50px] h-[75px] sm:w-[60px] sm:h-[90px] object-cover rounded-lg shrink-0 shadow-md group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)] transition-all duration-300"
                                            />
                                        ) : (
                                            <div className="w-[50px] h-[75px] sm:w-[60px] sm:h-[90px] bg-white/5 rounded-lg flex items-center justify-center text-2xl sm:text-3xl text-text-muted shrink-0 border border-dashed border-white/10">?</div>
                                        )}
                                        
                                        <div className="flex-1 min-w-0 text-left flex flex-col justify-center gap-1">
                                            <div className="pr-6 sm:pr-0"> {/* Padding for mobile delete button */}
                                                <h4 className="m-0 text-base sm:text-xl font-bold text-white tracking-wide truncate group-hover:text-neon-secondary transition-colors duration-300 drop-shadow-sm">{movie.title}</h4>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center text-sm opacity-90 mt-0.5 sm:mt-1">
                                                {Array.isArray(movie.genre) ? movie.genre.map(g => (
                                                    <span key={g} className="bg-white/5 text-white/90 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-white/10 shadow-sm">
                                                        {g}
                                                    </span>
                                                )) : (
                                                    <span className="bg-white/5 text-white/90 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-white/10 shadow-sm">
                                                        {movie.genre}
                                                    </span>
                                                )}
                                                {movie.release_date && (
                                                    <span className="text-xs text-text-muted font-mono opacity-70 ml-1">{movie.release_date.split('-')[0]}</span>
                                                )}
                                            </div>
                                            {/* Note: Collection name removed for single-movie collections as per request. */}

                                            {/* Mobile "Added by" Badge - embedded in content */}
                                            <div className="sm:hidden mt-2 flex items-center gap-2">
                                                <div className="text-[9px] uppercase tracking-[1px] text-text-muted opacity-50 font-bold">Added by</div>
                                                <div className="px-2 py-0.5 rounded-full bg-neon-primary/10 border border-neon-primary/30 text-neon-primary text-[10px] font-extra-bold uppercase tracking-widest">
                                                    {movie.added_by || 'Unknown'}
                                                </div>
                                            </div>
                                        </div>

                                            {/* Desktop "Added by" Section */}
                                            <div className="hidden sm:flex flex-col items-end gap-1.5 sm:gap-2 pl-2 sm:pl-4 border-l border-white/5 ml-1 sm:ml-2 shrink-0">
                                            <div className="hidden sm:block text-[9px] uppercase tracking-[2px] text-text-muted opacity-50 font-bold">
                                                Added by
                                            </div>
                                            <div className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-neon-primary/10 border border-neon-primary/30 text-neon-primary text-[10px] sm:text-xs font-extra-bold uppercase tracking-widest shadow-[0_0_10px_rgba(217,70,239,0.1)] group-hover:shadow-[0_0_15px_rgba(217,70,239,0.3)] transition-all duration-300">
                                                {movie.added_by || 'Unknown'}
                                            </div>
                                            </div>

                                        {/* Desktop Delete Button */}
                                        {onDelete && (
                                            <motion.button 
                                                onClick={() => onDelete(movie)}
                                                whileHover={{ scale: 1.1, backgroundColor: "#ef4444", color: "#fff", borderColor: "rgba(239, 68, 68, 0.3)", boxShadow: "0 0 15px rgba(239, 68, 68, 0.5)" }}
                                                whileTap={{ scale: 0.9 }}
                                                className="hidden sm:flex ml-2 sm:ml-4 w-[30px] h-[30px] sm:w-[36px] sm:h-[36px] rounded-full border border-white/5 bg-white/5 text-text-muted text-lg sm:text-xl items-center justify-center cursor-pointer transition-colors duration-300 shrink-0"
                                                title="Remove from queue"
                                            >
                                                &times;
                                            </motion.button>
                                        )}
                                    </div>
                                </div>
                            );
                        }
                    }) : (
                        <div className="flex flex-col items-center justify-center flex-1 opacity-40 text-text-muted">
                            <span className="material-symbols-outlined text-6xl mb-4">movie</span>
                            <p className="text-lg">No movies found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MovieListModal;
