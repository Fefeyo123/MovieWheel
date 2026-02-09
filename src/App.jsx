import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import WheelCanvas from './components/wheel/WheelCanvas';
import ModalsContainer from './components/common/ModalsContainer';
import Header from './components/common/Header';
import ResultModal from './components/modals/ResultModal';
import { supabase } from './utils/supabaseClient';
import { THE_BOIS, GENRE_COLORS, ANIMATION, WHEEL_CONFIG } from './utils/constants';
import { parseGenre, preloadImages } from './utils/helpers';
import useWheelData from './hooks/useWheelData';
import { UIProvider, useUI } from './context/UIContext';
import './index.css';

function AppContent() {
    const { confirm, alert } = useUI();
    const [phase, setPhase] = useState('genre');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [spinTrigger, setSpinTrigger] = useState(0);
    const [wheelOpacity, setWheelOpacity] = useState(1);
    const [imageCache, setImageCache] = useState({});
    
    // Data
    const [movies, setMovies] = useState([]);

    // Custom Hook for Wheel Data
    const { 
        queuedMovies, 
        availableGenres, 
        effectiveMovieItems 
    } = useWheelData(movies, selectedGenre);

    const genreItems = availableGenres;
    
    const currentWheelItems = phase === 'genre' ? (genreItems.length > 0 ? genreItems : ['Add Movies']) : effectiveMovieItems;

    const isGenrePhase = phase === 'genre';

    useEffect(() => {
        fetchMovies();

        const subscription = supabase
            .channel('public:movies')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'movies' }, (payload) => {
                const normalized = { ...payload.new, genre: parseGenre(payload.new.genre) };
                setMovies(prev => [...prev, normalized]);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'movies' }, (payload) => {
                setMovies(prev => {
                    const index = prev.findIndex(m => m.id === payload.new.id);
                    if (index === -1) return prev; // Not found

                    const currentMovie = prev[index];
                    const newData = { ...payload.new, genre: parseGenre(payload.new.genre) };

                    // Prevent race conditions by ignoring updates if the status is already consistent
                    if (currentMovie.status === newData.status) {
                        return prev;
                    }

                    const newMovies = [...prev];
                    newMovies[index] = newData;
                    return newMovies;
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const fetchMovies = async () => {
        const { data, error } = await supabase
            .from('movies')
            .select('*');

        if (error) {
            console.error('Error fetching movies:', error);
        } else {
            const normalized = (data || []).map(m => ({
                ...m,
                genre: parseGenre(m.genre)
            }));
            setMovies(normalized);
        }
        setIsLoading(false);
    };

    const handleSpin = () => {
        setSpinTrigger(prev => prev + 1);
    };

    const timeoutRef = React.useRef(null);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
             if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

const onGenreSpinEnd = React.useCallback(async (genre) => {
        setSelectedGenre(genre);
        
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        // 1. Filter movies matching the selected genre
        const relevantMovies = queuedMovies.filter(m => {
             const g = m.genre; 
             return Array.isArray(g) ? g.includes(genre) : g === genre;
        });

        // 2. CHECK: Is er maar 1 unieke uitkomst? (1 losse film OF 1 collectie)
        const distinctItems = new Set();
        relevantMovies.forEach(m => {
            if (m.collection_name) {
                // Heeft deze collectie meer dan 1 film in deze genre-filter?
                const countInCollection = relevantMovies.filter(rm => rm.collection_name === m.collection_name).length;
                if (countInCollection > 1) {
                    distinctItems.add(m.collection_name); // Telt als 1 groep
                } else {
                    distinctItems.add(m.title); // Telt als losse film
                }
            } else {
                distinctItems.add(m.title); // Telt als losse film
            }
        });

        // 3. SKIP SCENARIO: Maar 1 vakje? Sla het filmwiel over!
        if (distinctItems.size === 1) {
             // Bepaal wie de echte winnaar is (het object)
             let winner = relevantMovies[0];
             
             // Als het een collectie is (meerdere films), pak de oudste
             if (relevantMovies.length > 1) {
                 winner = [...relevantMovies].sort((a, b) => {
                    if (!a.release_date) return -1;
                    if (!b.release_date) return 1;
                    return new Date(a.release_date) - new Date(b.release_date);
                })[0];
             }

             // UX Delay + Preload alleen de winnaar
             const delay = new Promise(resolve => setTimeout(resolve, ANIMATION.DELAY.WHEEL_IMAGE_PRELOAD));
             
             let winnerImagePromise = Promise.resolve();
             if (winner.poster_path) {
                 winnerImagePromise = preloadImages([winner.poster_path]);
             }

             await Promise.all([delay, winnerImagePromise]);

             // Ga direct naar resultaat
             setSelectedMovie(winner);
             setPhase('result');
             setSpinTrigger(0);
             return; 
        }

        // 4. STANDARD SCENARIO: Meerdere opties -> Laad het Movie Wiel
        const paths = relevantMovies
            .map(m => m.poster_path)
            .filter(path => path);

        const minDelay = new Promise(resolve => setTimeout(resolve, ANIMATION.DELAY.WHEEL_IMAGE_PRELOAD));
        const imageLoading = preloadImages(paths);

        const [_, loadedImagesMap] = await Promise.all([minDelay, imageLoading]);
        
        // Update image cache
        setImageCache(prev => ({ ...prev, ...loadedImagesMap }));

        // Transition to movie wheel
        setPhase('movies');
        setSpinTrigger(0); 
    }, [queuedMovies]);

    const onMovieSpinEnd = React.useCallback((item) => {
        const resultText = item.value || item; 
        
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            const collectionMatch = queuedMovies.filter(m => {
                 const isGenreMatch = m.genre.includes(selectedGenre);
                 return m.collection_name === resultText && isGenreMatch;
            });
            
            if (collectionMatch.length > 0) {
                const sorted = [...collectionMatch].sort((a, b) => {
                    if (!a.release_date) return -1;
                    if (!b.release_date) return 1;
                    return new Date(a.release_date) - new Date(b.release_date);
                });
                setSelectedMovie(sorted[0]);
            } else {
                const movie = queuedMovies.find(m => m.title === resultText);
                setSelectedMovie(movie); 
            }
            setPhase('result');
        }, ANIMATION.DELAY.RESULT_REVEAL);
    }, [queuedMovies, selectedGenre]);

    const reset = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setPhase('genre');
        setSelectedGenre(null);
        setSelectedMovie(null);
        setSpinTrigger(0); 
    };

    const markAsWatched = async () => {
        if (!selectedMovie) return;
        
        // Optimistic Update
        const previousMovies = [...movies];
        setMovies(prev => prev.map(m => 
            m.id === selectedMovie.id ? { ...m, status: 'watched' } : m
        ));

        // Reset UI immediately
        reset();

        const { error } = await supabase
            .from('movies')
            .update({ status: 'watched' })
            .eq('id', selectedMovie.id);

        if (error) {
            console.error('Error marking as watched:', error);
            alert("Failed to mark as watched.");
            setMovies(previousMovies);
        } 
    };

    const handleToggleWatched = async (movie) => {
        const newStatus = movie.status === 'watched' ? 'queued' : 'watched';
        
        // Optimistic Update
        const previousMovies = [...movies];
        setMovies(prev => prev.map(m => 
            m.id === movie.id ? { ...m, status: newStatus } : m
        ));
        
        const { error } = await supabase
            .from('movies')
            .update({ status: newStatus })
            .eq('id', movie.id);

        if (error) {
            console.error('Error updating status:', error);
            alert("Failed to update status.");
            setMovies(previousMovies);
        }
    };

    const handleRemoveMovie = async (movie) => {
        if (!await confirm(`Remove "${movie.title}" from the queue?`, {
            title: 'Remove Movie',
            confirmText: 'Delete',
            type: 'error'
        })) return;

        // Optimistic Update
        const previousMovies = [...movies];
        setMovies(prev => prev.filter(m => m.id !== movie.id));

        const { error } = await supabase
            .from('movies')
            .delete()
            .eq('id', movie.id);

        if (error) {
            console.error("Error deleting movie:", error);
            alert("Failed to delete movie.");
            setMovies(previousMovies);
        }
    };

    return (
        <div className="app-container flex flex-col h-full min-h-screen overflow-hidden text-text-main font-outfit">
            <Header 
                users={THE_BOIS}
                queueCount={queuedMovies.length}
                isGenrePhase={isGenrePhase}
                selectedGenre={selectedGenre}
                hasAvailableGenres={availableGenres.length > 0}
                isLoading={isLoading}
            />

            <main className="w-full flex-grow relative flex flex-col items-center justify-center">
                {/* Unified Wheel Container */}
                <motion.div 
                    layout
                    transition={{ duration: ANIMATION.DURATION.WHEEL_ENTRY, ease: ANIMATION.EASING.WHEEL_ENTRY }}
                    className={`z-20
                            ${isGenrePhase 
                                ? 'relative w-[90vw] max-w-[400px] aspect-square' 
                                : 'fixed bottom-[-40vw] left-1/2 -translate-x-1/2 w-[120vw] h-[120vw] sm:bottom-[-50vh] sm:w-[100vh] sm:h-[100vh]'
                            }
                        `}
                >

                    {/* Static decorations */}
                    <div className={`absolute -top-[25px] left-1/2 -translate-x-1/2 z-10 drop-shadow-md pointer-events-none transition-all duration-1000
                        ${isGenrePhase 
                            ? 'w-[40px] h-[50px]' 
                            : 'w-[40px] h-[50px] -top-[25px]'
                        }
                    `}>
                        {/* Pointer Graphic */}
                        <div className="w-full h-full relative">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[10%] h-full bg-gradient-to-b from-neon-accent to-white rounded-sm shadow-[0_0_10px_var(--neon-accent)]"></div>
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] aspect-square bg-bg-dark border-2 border-neon-accent rounded-md rotate-45 shadow-[0_0_10px_var(--neon-accent)]"></div>
                        </div>
                    </div>
                    {isLoading ? (
                        // A. LAAD SCHERM (Centraal in de cirkel)
                        <div className="absolute inset-0 flex items-center justify-center">
                            {/* Een simpele, stijlvolle spinner */}
                            <div className="w-16 h-16 border-4 border-white/20 border-t-neon-primary rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        // B. HET WIEL EN DE KNOP (Alleen tonen als data er is)
                        <>
                            <div className="w-full h-full transition-opacity duration-300 ease-in-out" style={{ opacity: wheelOpacity }}>
                                <WheelCanvas 
                                    items={currentWheelItems} 
                                    imageCache={imageCache}
                                    onSpinEnd={isGenrePhase ? onGenreSpinEnd : onMovieSpinEnd}
                                    spinTrigger={spinTrigger}
                                    width={WHEEL_CONFIG.DEFAULT_SIZE}
                                    height={WHEEL_CONFIG.DEFAULT_SIZE}
                                    fontSize={isGenrePhase ? WHEEL_CONFIG.FONT_SIZE.GENRE : WHEEL_CONFIG.FONT_SIZE.MOVIE}
                                    colors={isGenrePhase ? GENRE_COLORS : undefined}
                                    isDonut={!isGenrePhase}
                                />
                            </div>

                            {/* Spin Button */}
                            <motion.button 
                                onClick={handleSpin}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }} 
                                className={`absolute left-1/2 -translate-x-1/2 rounded-full cursor-pointer z-30 flex items-center justify-center transition-all duration-1000 group
                                    ${isGenrePhase 
                                        ? 'top-1/2 -translate-y-1/2 w-[90px] h-[90px] sm:w-[110px] sm:h-[110px]'
                                        : '-top-[110px] w-[80px] h-[80px] sm:-top-[140px] sm:w-[100px] sm:h-[100px]'
                                    }
                                `}
                            >
                                {/* Outer Glow Ring */}
                                <div className={`absolute inset-0 rounded-full transition-all duration-500
                                    bg-gradient-to-br from-neon-primary/80 to-neon-secondary/80
                                    shadow-[0_0_30px_rgba(217,70,239,0.4),inset_0_0_20px_rgba(255,255,255,0.2)]
                                    group-hover:shadow-[0_0_50px_rgba(217,70,239,0.7),inset_0_0_30px_rgba(255,255,255,0.4)]
                                    border border-white/20 backdrop-blur-sm
                                `}></div>

                                {/* Inner Dark Circle */}
                                <div className="absolute inset-[6px] rounded-full bg-[#0a0a0c] shadow-[inset_0_4px_10px_rgba(0,0,0,0.8)] flex items-center justify-center overflow-hidden">
                                    {/* Glossy overlay */}
                                    <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                                    
                                    <span className={`font-black text-white tracking-widest transition-all duration-300 group-hover:text-neon-primary group-hover:scale-110
                                        ${isGenrePhase ? 'text-xl sm:text-2xl' : 'text-lg'}
                                    `}>
                                        SPIN
                                    </span>
                                </div>
                            </motion.button>
                            
                            {/* Shadow/Glow behind wheel */}
                            <div 
                                className={`absolute inset-0 rounded-full transition-shadow duration-1000 -z-10
                                ${isGenrePhase 
                                    ? 'shadow-[0_0_40px_rgba(139,92,246,0.2)]' 
                                    : 'shadow-[0_0_100px_rgba(139,92,246,0.2)]'
                                }
                            `}></div>
                        </>
                    )}
                </motion.div>

                {phase === 'result' && (
                    <ResultModal 
                        selectedMovie={selectedMovie} 
                        onMarkWatched={markAsWatched} 
                        onSpinAgain={reset} 
                    />
                )}
            </main>
            
            <ModalsContainer 
                movies={movies}
                onDelete={handleRemoveMovie}
                onToggleWatched={handleToggleWatched}
            />
        </div>
    );
}

function App() {
    return (
        <UIProvider>
            <AppContent />
        </UIProvider>
    );
}

export default App;
