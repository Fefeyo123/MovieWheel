import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { searchMovies, getGenres, getMovieDetails, getCollectionDetails } from '../utils/tmdb';
import { supabase } from '../utils/supabaseClient';
import WarningModal from './WarningModal';

const THE_BOIS = ["Foo", "Lex", "Yan", "Jer", "Brt", "Gustav"];

const AddMovieModal = ({ onClose, currentUser }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [genresMap, setGenresMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [warning, setWarning] = useState(null); // { type, message, onConfirm, onCancel }

    useEffect(() => {
        getGenres().then(genres => {
            const map = {};
            genres.forEach(g => map[g.id] = g.name);
            setGenresMap(map);
        });
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query.length > 2) {
                setLoading(true);
                
                let safeQuery = query;
                // TMDB has trouble with "wall-e" and "wall e", but "WALL·E" (with the dot) works.
                // Catch variations like "wall-e", "walle", "wall e" and force the working query.
                const normalized = query.toLowerCase().replace(/[^a-z0-9]/g, '');

                if (normalized === 'walle') {
                    safeQuery = 'WALL·E'; // using the middle dot
                }

                searchMovies(safeQuery).then(res => {
                    // Sort by popularity to ensure hits like "WALL-E" come up first
                    const sorted = res.sort((a, b) => b.popularity - a.popularity);
                    setResults(sorted);
                    setLoading(false);
                });
            } else {
                setResults([]);
            }
        }, 500); // Debounce

        return () => clearTimeout(timeoutId);
    }, [query]);

    const addSingleMovie = async (movie, collectionData = null, forcedGenreIds = null) => {
         // Check if movie exists
        const { data: existingMovies } = await supabase
            .from('movies')
            .select('*')
            .eq('tmdb_id', movie.id);

        if (existingMovies && existingMovies.length > 0) {
            const existing = existingMovies[0];
            if (existing.status === 'queued') {
                return { status: 'exists', title: movie.title };
            } else if (existing.status === 'watched') {
                 // Reactivate
                const { error } = await supabase
                    .from('movies')
                    .update({ status: 'queued', added_by: currentUser })
                    .eq('id', existing.id);
                 return { status: 'reactivated', title: movie.title, error };
            }
        }

        // Map genre IDs to text
        // Use forcedGenreIds if provided (for collections), otherwise fall back to movie data
        let genreIds = forcedGenreIds || movie.genre_ids;
        if (!genreIds && movie.genres) genreIds = movie.genres.map(g => g.id); // Handling detail response

        const allGenreIds = genreIds || [];
        const rawTypes = allGenreIds.map(id => genresMap[id] || "Unknown");
        
        const normalizedSet = new Set();
        
        // Helper to normalize a single genre string
        const normalize = (gName) => {
            if (gName.includes("Action") || gName.includes("Adventure")) return "Action";
            if (gName.includes("Sci-Fi") || gName.includes("Science")) return "Sci-Fi";
            if (gName.includes("Comedy")) return "Comedy";
            if (gName.includes("Horror") || gName.includes("Thriller")) return "Horror";
            if (gName.includes("Animation") || gName.includes("Family")) return "Animation";
            if (gName.includes("Drama") || gName.includes("Romance")) return "Drama";
            return "Drama"; // Default fallback
        };

        rawTypes.forEach(name => normalizedSet.add(normalize(name)));
        
        // Ensure at least one genre
        if (normalizedSet.size === 0) normalizedSet.add("Drama");

        const finalGenres = Array.from(normalizedSet);
        
        const { error } = await supabase
            .from('movies')
            .insert({
                title: movie.title,
                genre: finalGenres, // Saving as array
                added_by: currentUser,
                tmdb_id: movie.id,
                poster_path: movie.poster_path,
                collection_id: collectionData?.id || null,
                collection_name: collectionData?.name || null,
                release_date: movie.release_date || null
            });

        if (error) return { status: 'error', title: movie.title, error };
        return { status: 'success', title: movie.title, genre: finalGenres.join(", ") };
    };

    const handleAdd = async (basicMovie) => {
        if (!currentUser) {
            setWarning({
                type: 'error',
                message: "Who are you? Select your name first!",
                onConfirm: () => setWarning(null)
            });
            return;
        }

        // 1. Fetch full details to check collection
        const fullMovie = await getMovieDetails(basicMovie.id);
        if (!fullMovie) {
             // Fallback to basic add if fetch fails
             const res = await addSingleMovie(basicMovie);
             handleResult(res);
             return;
        }

        const collection = fullMovie.belongs_to_collection;

        if (collection) {
            setWarning({
                type: 'confirm',
                message: `"${fullMovie.title}" is part of "${collection.name}". Add the whole collection?`,
                confirmText: "Add Collection",
                cancelText: "Just this one",
                onConfirm: async () => {
                   setWarning(null); 
                   // Add Collection
                   const colDetails = await getCollectionDetails(collection.id);
                   if (colDetails && colDetails.parts) {
                       let addedCount = 0;
                       const today = new Date();
                       const validParts = [];
                       const allGenreIds = new Set();
                       
                       // 1. Identify valid parts and collect ALL genres
                       for (const part of colDetails.parts) {
                           // validation: Skip if no release date or released in future
                           if (!part.release_date) continue;
                           const releaseDate = new Date(part.release_date);
                           if (releaseDate > today) continue;

                           validParts.push(part);

                           // Accumulate genres
                           // Collection parts usually have genre_ids. Fallback to fullMovie.genres if missing.
                           const pGenreIds = part.genre_ids || (fullMovie.genres ? fullMovie.genres.map(g => g.id) : []); 
                           pGenreIds.forEach(id => allGenreIds.add(id));
                       }
                       
                       const unifiedGenreIds = Array.from(allGenreIds);

                       // 2. Add parts with unified genres
                       for (const part of validParts) {
                           const res = await addSingleMovie(part, { id: collection.id, name: collection.name }, unifiedGenreIds);
                           if (res.status === 'success' || res.status === 'reactivated') addedCount++;
                       }
                       
                       setWarning({
                           type: 'success',
                           message: `Added ${addedCount} movies from "${collection.name}"!`,
                           onConfirm: () => { setWarning(null); }
                       });
                   }
                },
                onCancel: async () => {
                    setWarning(null);
                    // Add Single
                    const res = await addSingleMovie(fullMovie, { id: collection.id, name: collection.name });
                    handleResult(res);
                }
            });
        } else {
            // No collection, just add
            const res = await addSingleMovie(fullMovie);
            handleResult(res);
        }
    };

    const handleResult = (res) => {
        if (res.status === 'exists') {
            setWarning({
                type: 'error',
                message: `"${res.title}" is already in the wheel!`,
                onConfirm: () => setWarning(null)
            });
        } else if (res.status === 'reactivated') {
            setWarning({
                type: 'success',
                message: `Welcome back, "${res.title}"!`,
                onConfirm: () => { setWarning(null); }
            });
        } else if (res.status === 'error') {
            console.error(res.error);
            setWarning({
                type: 'error',
                message: "Error adding movie: " + res.error.message,
                onConfirm: () => setWarning(null)
            });
        } else {
            setWarning({
                type: 'success',
                message: `Added "${res.title}" to ${res.genre}!`,
                onConfirm: () => { setWarning(null); }
            });
        }
    };

    return (
        <div className="fixed inset-0 w-screen h-screen bg-[#050511]/70 backdrop-blur-md flex items-center justify-center z-[100] animate-[fadeIn_0.3s_ease]">
            {warning && (
                <WarningModal 
                    type={warning.type} 
                    message={warning.message} 
                    onConfirm={warning.onConfirm} 
                    onCancel={warning.onCancel}
                    confirmText={warning.confirmText}
                    cancelText={warning.cancelText}
                />
            )}
            
            <div className="glass-panel max-w-[500px] w-[95%] sm:w-[90%] p-4 sm:p-8 max-h-[85vh] flex flex-col animate-slideUp">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <h2 className="m-0 text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-text-muted bg-clip-text text-transparent">Add Movie</h2>
                    <button onClick={onClose} className="bg-transparent border-none text-2xl text-text-muted cursor-pointer transition-all duration-300 p-2 rounded-full hover:text-white hover:bg-white/10 hover:rotate-90">&times;</button>
                </div>

                <div className="relative mb-6 shrink-0">
                    <svg className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none transition-colors duration-300 peer-focus-within:text-neon-secondary" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    <input 
                        type="text" 
                        placeholder="Search for a movie..." 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="glass-input pl-10 sm:pl-12 text-sm sm:text-base py-2 sm:py-3"
                        autoFocus
                    />
                </div>

                {loading && (
                    <div className="flex flex-col items-center p-12 text-text-muted">
                        <div className="spinner mb-4"></div>
                        <p className="text-sm font-medium tracking-wide">SEARCHING THE DATABASE...</p>
                    </div>
                )}

                <div className="flex flex-col gap-3 overflow-y-auto pr-1 -mr-1 custom-scrollbar flex-1 pb-4">
                    {results.map(movie => (
                        <div key={movie.id} className="group relative flex flex-row items-start gap-3 sm:gap-5 p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 border border-transparent hover:bg-white/5 hover:border-white/10 hover:-translate-x-[-4px]">
                             {/* Mobile Add Button - Absolute */}
                             <motion.button 
                                onClick={(e) => { e.stopPropagation(); handleAdd(movie); }}
                                whileTap={{ scale: 0.9 }}
                                className="sm:hidden absolute top-2 right-2 w-[28px] h-[28px] rounded-full border border-neon-secondary/30 bg-neon-secondary/10 text-neon-secondary text-lg font-light cursor-pointer flex items-center justify-center shrink-0 z-20"
                            >
                                +
                            </motion.button>

                            {movie.poster_path ? (
                                <img 
                                    src={`https://image.tmdb.org/t/p/w154${movie.poster_path}`}
                                    alt={movie.title}
                                    className="w-[60px] h-[90px] sm:w-[70px] sm:h-[105px] object-cover rounded-lg shrink-0 shadow-md group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)] transition-all duration-300 block"
                                />
                            ) : (
                                <div className="w-[60px] h-[90px] sm:w-[70px] sm:h-[105px] bg-white/5 rounded-lg flex items-center justify-center text-2xl sm:text-3xl text-text-muted shrink-0 border border-dashed border-white/10">?</div>
                            )}
                            <div className="flex-1 min-w-0 text-left flex flex-col justify-center gap-1">
                                <div className="pr-8 sm:pr-0">
                                    <h4 className="m-0 text-base sm:text-xl font-bold text-white tracking-wide truncate group-hover:text-neon-secondary transition-colors duration-300 drop-shadow-sm">{movie.title}</h4>
                                </div>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center text-sm opacity-90 mt-0.5 sm:mt-1">
                                    {movie.genre_ids && movie.genre_ids.slice(0, 3).map(id => {
                                        const genreName = genresMap[id];
                                        if (!genreName) return null;
                                        return (
                                            <span key={id} className="bg-white/5 text-white/90 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-white/10 shadow-sm inline-block">
                                                {genreName}
                                            </span>
                                        );
                                    })}
                                    {movie.release_date && (
                                        <span className="text-xs text-text-muted font-mono opacity-70 ml-1 inline-block">{movie.release_date.split('-')[0]}</span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Desktop Add Button */}
                            <div className="hidden sm:flex items-center pl-4 border-l border-white/5 ml-2 self-stretch">
                                <motion.button 
                                    onClick={() => handleAdd(movie)}
                                    whileHover={{ scale: 1.1, backgroundColor: "rgba(139, 92, 246, 1)", color: "#fff", boxShadow: "0 0 15px rgba(139, 92, 246, 0.6)" }}
                                    whileTap={{ scale: 0.9 }}
                                    className="w-[36px] h-[36px] rounded-full border border-neon-secondary/30 bg-neon-secondary/10 text-neon-secondary text-xl font-light cursor-pointer flex items-center justify-center shrink-0 transition-colors duration-300"
                                >
                                    +
                                </motion.button>
                            </div>
                        </div>
                    ))}
                    {results.length === 0 && query.length > 2 && !loading && (
                        <div className="text-text-muted my-8 text-center flex flex-col items-center gap-2 opacity-60">
                            <span className="material-symbols-outlined text-4xl">movie_filter</span>
                            <p className="text-sm">No results found.</p>
                        </div>
                    )}
                    {query.length <= 2 && !loading && (
                        <div className="text-text-muted my-12 text-center flex flex-col items-center gap-3 opacity-40">
                             <span className="material-symbols-outlined text-4xl">search</span>
                             <p className="text-sm font-light">Type to start searching...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddMovieModal;
