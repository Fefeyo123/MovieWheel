import React, { useState, useEffect } from 'react';
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
            
            <div className="bg-slate-800/70 p-12 rounded-3xl text-center shadow-glass border border-glass-border max-w-[500px] w-[90%] animate-slideUp relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-neon-primary before:to-transparent max-h-[80vh] overflow-y-auto text-left">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
                    <h2 className="m-0 text-3xl font-bold bg-gradient-to-r from-white to-text-muted bg-clip-text text-transparent">Add Movie</h2>
                    <button onClick={onClose} className="bg-none border-none text-3xl text-text-muted cursor-pointer transition-all duration-300 leading-[0.8] p-2 rounded-full hover:text-white hover:bg-white/10 hover:rotate-90">&times;</button>
                </div>

                <div className="relative mb-8">
                    <svg className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none transition-colors duration-300 peer-focus:text-neon-secondary" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    <input 
                        type="text" 
                        placeholder="Search for a movie..." 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="peer w-full py-4 px-4 pl-[60px] bg-black/20 border border-white/10 rounded-2xl text-white text-lg transition-all duration-300 focus:bg-black/40 focus:border-neon-secondary focus:shadow-[0_0_25px_rgba(139,92,246,0.15)] focus:outline-none"
                    />
                </div>

                {loading && (
                    <div className="flex flex-col items-center p-12 text-text-muted">
                        <div className="spinner mb-4"></div>
                        <p>Searching...</p>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    {results.map(movie => (
                        <div key={movie.id} className="flex items-center gap-4 p-3 bg-white/5 border border-white/5 rounded-2xl transition-all duration-300 relative overflow-hidden hover:bg-white/10 hover:border-white/10 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(0,0,0,0.2)]">
                            {movie.poster_path ? (
                                <img 
                                    src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                                    alt={movie.title}
                                    className="w-[50px] h-[75px] object-cover rounded-lg shrink-0 shadow-md"
                                />
                            ) : (
                                <div className="w-[50px] h-[75px] bg-white/5 rounded-lg flex items-center justify-center text-2xl text-text-muted shrink-0 border border-dashed border-white/10">?</div>
                            )}
                            <div className="flex-1 min-w-0 text-left flex flex-col gap-1">
                                <h4 className="m-0 text-base font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">{movie.title}</h4>
                                <span className="text-sm text-text-muted font-medium">{movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</span>
                            </div>
                            <button 
                                onClick={() => handleAdd(movie)}
                                className="w-[40px] h-[40px] rounded-xl border-none bg-[rgba(139,92,246,0.1)] text-neon-secondary text-2xl font-light cursor-pointer transition-all duration-300 flex items-center justify-center shrink-0 hover:bg-neon-secondary hover:text-white hover:scale-105 hover:shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                            >
                                +
                            </button>
                        </div>
                    ))}
                    {results.length === 0 && query.length > 2 && !loading && (
                        <p className="text-text-muted my-12 leading-relaxed text-center text-base">No results found.</p>
                    )}
                    {query.length <= 2 && !loading && (
                        <p className="text-text-muted my-12 leading-relaxed text-center text-sm opacity-50">Type at least 3 characters to search...</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddMovieModal;
