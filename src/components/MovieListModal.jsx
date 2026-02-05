import React, { useState, useMemo } from 'react';

const MovieListModal = ({ movies, onClose, onDelete }) => {
    const [filter, setFilter] = useState('');
    const [sortBy, setSortBy] = useState('date'); // 'date' | 'title' | 'genre'

    // Derived state for filtered and sorted movies
    const processedMovies = useMemo(() => {
        let result = [...movies];

        // Filter
        if (filter) {
            const lowerFilter = filter.toLowerCase();
            result = result.filter(m => 
                m.title.toLowerCase().includes(lowerFilter) || 
                (m.genre && m.genre.toLowerCase().includes(lowerFilter)) ||
                (m.added_by && m.added_by.toLowerCase().includes(lowerFilter)) ||
                (m.collection_name && m.collection_name.toLowerCase().includes(lowerFilter))
            );
        }

        // Sort
        result.sort((a, b) => {
            if (sortBy === 'title') {
                return a.title.localeCompare(b.title);
            } else if (sortBy === 'genre') {
                return a.genre.localeCompare(b.genre);
            } else {
                // Default: Date added (assuming simple append order or if we had a created_at)
                // Since we don't have explicit created_at valid everywhere, we rely on ID or array order (which is preserved from fetch)
                // If ID is int/uuid it might not be perfect chronological but good enough usually.
                // Reversing to show newest first is usually better for "Queue"
                return b.id - a.id; 
            }
        });

        return result;
    }, [movies, filter, sortBy]);

    return (
        <div className="fixed inset-0 w-screen h-screen bg-[#050511]/70 backdrop-blur-md flex items-center justify-center z-[100] animate-[fadeIn_0.3s_ease]">
            <div className="bg-slate-800/70 p-12 rounded-3xl text-center shadow-glass border border-glass-border max-w-[800px] w-full max-h-[85vh] flex flex-col animate-slideUp relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-neon-primary before:to-transparent">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
                    <h2 className="m-0 text-3xl font-bold bg-gradient-to-r from-white to-text-muted bg-clip-text text-transparent">Movie Queue ({movies.length})</h2>
                    <button onClick={onClose} className="bg-none border-none text-3xl text-text-muted cursor-pointer transition-all duration-300 leading-[0.8] p-2 rounded-full hover:text-white hover:bg-white/10 hover:rotate-90">&times;</button>
                </div>

                <div className="flex gap-4 mb-6">
                    <div className="relative flex-1">
                        <svg className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        <input 
                            type="text" 
                            placeholder="Filter movies..." 
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full py-3 px-4 pl-[50px] bg-black/20 border border-white/10 rounded-2xl text-white text-base transition-all duration-300 focus:bg-black/40 focus:border-neon-secondary focus:shadow-[0_0_15px_rgba(139,92,246,0.15)] focus:outline-none"
                        />
                    </div>
                    
                    <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-slate-900/60 text-text-main px-4 py-2 border border-glass-border rounded-xl text-base backdrop-blur-md transition-all duration-300 cursor-pointer outline-none w-auto hover:border-neon-secondary focus:border-neon-secondary"
                    >
                        <option value="date">Newest First</option>
                        <option value="title">Title (A-Z)</option>
                        <option value="genre">Genre</option>
                    </select>
                </div>

                <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2">
                    {processedMovies.length > 0 ? processedMovies.map(movie => (
                        <div key={movie.id} className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl transition-all duration-300 min-h-[120px] hover:bg-white/10 hover:border-white/10 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(0,0,0,0.2)]">
                            {movie.poster_path ? (
                                <img 
                                    src={`https://image.tmdb.org/t/p/w154${movie.poster_path}`}
                                    alt={movie.title}
                                    className="w-[80px] h-[120px] object-cover rounded-lg shrink-0 shadow-md"
                                />
                            ) : (
                                <div className="w-[80px] h-[120px] bg-white/5 rounded-lg flex items-center justify-center text-4xl text-text-muted shrink-0 border border-dashed border-white/10">?</div>
                            )}
                            
                            <div className="flex-1 min-w-0 text-left flex flex-col gap-1.5 justify-center ml-4">
                                <h4 className="m-0 text-xl font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">{movie.title}</h4>
                                <div className="flex gap-2.5 items-center text-sm opacity-90">
                                    <span className="bg-white/10 px-2.5 py-1 rounded border border-white/10">
                                        {movie.genre}
                                    </span>
                                    {movie.release_date && (
                                        <span className="font-mono text-xs">{movie.release_date.split('-')[0]}</span>
                                    )}
                                </div>
                                {movie.collection_name && (
                                    <div className="text-sm text-neon-accent font-bold mt-1">
                                        Part of: {movie.collection_name}
                                    </div>
                                )}
                                <div className="text-sm opacity-60 mt-0.5">
                                    Added by: <span className="text-neon-primary font-medium">{movie.added_by || 'Unknown'}</span>
                                </div>
                            </div>

                             {onDelete && (
                                <button 
                                    onClick={() => onDelete(movie)}
                                    className="w-[40px] h-[40px] rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-2xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-red-500 hover:text-white hover:scale-110 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                                    title="Remove from queue"
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                    )) : (
                        <p className="text-text-muted my-12 text-center text-base">No movies found.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MovieListModal;
