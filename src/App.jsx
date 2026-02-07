import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import WheelCanvas from './components/WheelCanvas';
import AddMovieModal from './components/AddMovieModal';
import MovieListModal from './components/MovieListModal';
import Header from './components/Header';
import ResultModal from './components/ResultModal';
import { supabase } from './utils/supabaseClient';
import { THE_BOIS, GENRE_COLORS } from './utils/constants';
import { parseGenre } from './utils/helpers';
import './index.css';

function App() {
    const [phase, setPhase] = useState('genre'); // genre | movies | result
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [spinTrigger, setSpinTrigger] = useState(0);
    const [wheelOpacity, setWheelOpacity] = useState(1);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showListModal, setShowListModal] = useState(false);
    
    // Data
    const [movies, setMovies] = useState([]);
    const [availableGenres, setAvailableGenres] = useState([]);
    const [selectedUser, setSelectedUser] = useState(localStorage.getItem('movieUser') || '');

    useEffect(() => {
        fetchMovies();

        const subscription = supabase
            .channel('public:movies')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'movies' }, (payload) => {
                if (payload.new.status === 'queued' || !payload.new.status) {
                    const normalized = { ...payload.new, genre: parseGenre(payload.new.genre) };
                    setMovies(prev => [...prev, normalized]);
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'movies' }, (payload) => {
                if (payload.new.status !== 'queued') {
                    setMovies(prev => prev.filter(m => m.id !== payload.new.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    useEffect(() => {
        if (movies.length > 0) {
            const dbGenres = new Set();
            movies.forEach(m => {
                m.genre.forEach(g => dbGenres.add(g));
            });
            setAvailableGenres(Array.from(dbGenres));
        } else {
            setAvailableGenres([]);
        }
    }, [movies]);

    const fetchMovies = async () => {
        const { data, error } = await supabase
            .from('movies')
            .select('*')
            .or('status.eq.queued,status.is.null');

        if (error) {
            console.error('Error fetching movies:', error);
        } else {
            const normalized = (data || []).map(m => ({
                ...m,
                genre: parseGenre(m.genre)
            }));
            setMovies(normalized);
        }
    };

    const handleUserChange = (e) => {
        const user = e.target.value;
        setSelectedUser(user);
        localStorage.setItem('movieUser', user);
    };

    const handleSpin = () => {
        setSpinTrigger(prev => prev + 1);
    };

    const onGenreSpinEnd = React.useCallback((genre) => {
        setSelectedGenre(genre);
        
        setTimeout(() => {
            setPhase('movies');
            setSpinTrigger(0); 
        }, 800);
    }, []);

    const onMovieSpinEnd = React.useCallback((item) => {
        const resultText = item.value || item; 
        
        setTimeout(() => {
            const collectionMatch = movies.filter(m => {
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
                const movie = movies.find(m => m.title === resultText);
                setSelectedMovie(movie); 
            }
            setPhase('result');
        }, 1000);
    }, [movies, selectedGenre]);

    const reset = () => {
        setPhase('genre');
        setSelectedGenre(null);
        setSelectedMovie(null);
        setSpinTrigger(0); 
    };

    const markAsWatched = async () => {
        if (!selectedMovie) return;
        
        const { error } = await supabase
            .from('movies')
            .update({ status: 'watched' })
            .eq('id', selectedMovie.id);

        if (error) {
            console.error('Error marking as watched:', error);
            alert("Failed to mark as watched.");
        } else {
            setMovies(prev => prev.filter(m => m.id !== selectedMovie.id));
            reset();
        }
    };

    const handleRemoveMovie = async (movie) => {
        if (!window.confirm(`Remove "${movie.title}" from the queue?`)) return;

        const { error } = await supabase
            .from('movies')
            .delete()
            .eq('id', movie.id);

        if (error) {
            console.error("Error deleting movie:", error);
            alert("Failed to delete movie.");
        } else {
            setMovies(prev => prev.filter(m => m.id !== movie.id));
        }
    };

    const genreItems = availableGenres;
    
    // Grouping Logic for Wheel
    const { moviesInGenre, wheelItemsSet } = React.useMemo(() => {
        const filtered = movies.filter(m => m.genre.includes(selectedGenre));

        const itemsSet = new Set();
        
        const collectionGroups = {};
        filtered.forEach(m => {
            if (m.collection_name) {
                if (!collectionGroups[m.collection_name]) {
                    collectionGroups[m.collection_name] = [];
                }
                collectionGroups[m.collection_name].push(m);
            }
        });

        filtered.forEach(m => {
            if (m.collection_name && collectionGroups[m.collection_name].length > 1) {
                itemsSet.add(m.collection_name);
            } else {
                itemsSet.add(m.title);
            }
        });
        
        return { moviesInGenre: filtered, wheelItemsSet: itemsSet };
    }, [movies, selectedGenre]);

    const effectiveMovieItems = React.useMemo(() => {
        const items = [];
        if (wheelItemsSet.size > 0) {
            wheelItemsSet.forEach(itemTitle => {
                const match = moviesInGenre.find(m => m.collection_name === itemTitle || m.title === itemTitle);
                
                if (match) {
                    items.push({
                        type: 'movie_or_collection',
                        label: itemTitle, 
                        posterPath: match.poster_path,
                        value: itemTitle 
                    });
                }
            });
        } else {
            items.push({ type: 'text', label: "No Movies", value: "No Movies" });
            items.push({ type: 'text', label: "Add Some!", value: "Add Some!" });
        }
        return items;
    }, [wheelItemsSet, moviesInGenre]);
    
    const currentWheelItems = phase === 'genre' ? (genreItems.length > 0 ? genreItems : ['Add Movies']) : effectiveMovieItems;

    const isGenrePhase = phase === 'genre';

    return (
        <div className="app-container relative h-full min-h-screen overflow-hidden">
            <Header 
                selectedUser={selectedUser}
                onUserChange={handleUserChange}
                users={THE_BOIS}
                onAddMovie={() => setShowAddModal(true)}
                onShowQueue={() => setShowListModal(true)}
                queueCount={movies.length}
                isGenrePhase={isGenrePhase}
                selectedGenre={selectedGenre}
                hasAvailableGenres={availableGenres.length > 0}
            />

            <main className="w-full flex-grow relative">
                {/* UNIFIED WHEEL CONTAINER */}
                <motion.div 
                    layout
                    transition={{ type: "spring", stiffness: 40, damping: 15 }}
                    className={`fixed z-20
                        /* Position & Core Transform */
                        left-1/2 -translate-x-1/2 
                        ${isGenrePhase 
                            ? 'top-[55%] sm:top-[60%] -translate-y-1/2 w-[90vw] h-[90vw] max-w-[400px] max-h-[400px]' 
                            : 'top-[100%] sm:top-[100%] -translate-y-[50%] w-[220vw] h-[220vw] max-w-[800px] max-h-[800px] sm:w-[1000px] sm:h-[1000px] sm:max-w-none sm:max-h-none'
                        }
                    `}
                >
                     {/* Static decorations that scale with container */}
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

                    <div className="w-full h-full transition-opacity duration-300 ease-in-out" style={{ opacity: wheelOpacity }}>
                        <WheelCanvas 
                            items={currentWheelItems} 
                            onSpinEnd={isGenrePhase ? onGenreSpinEnd : onMovieSpinEnd}
                            spinTrigger={spinTrigger}
                            width={1200}
                            height={1200}
                            fontSize={isGenrePhase ? 80 : 24}
                            colors={isGenrePhase ? GENRE_COLORS : undefined}
                            isDonut={!isGenrePhase}
                        />
                    </div>

                    {/* SPIN BUTTON */}
                    <motion.button 
                        onClick={handleSpin}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }} 
                        className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer z-30 flex items-center justify-center transition-all duration-1000 ease-[cubic-bezier(0.2,0.8,0.2,1)] group
                            /* Dynamic Styles based on Phase */
                            ${isGenrePhase 
                                ? 'top-1/2 w-[90px] h-[90px] sm:w-[110px] sm:h-[110px]'
                                : 'top-[-90px] w-[80px] h-[80px]'
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
                    
                    {/* Shadow/Glow behind wheel for depth */}
                    <div 
                         className={`absolute inset-0 rounded-full transition-shadow duration-1000 -z-10
                         ${isGenrePhase 
                            ? 'shadow-[0_0_40px_rgba(139,92,246,0.2)]' 
                            : 'shadow-[0_0_100px_rgba(139,92,246,0.2)]'
                         }
                    `}></div>
                </motion.div>

                {phase === 'result' && (
                    <ResultModal 
                        selectedMovie={selectedMovie} 
                        onMarkWatched={markAsWatched} 
                        onSpinAgain={reset} 
                    />
                )}
            </main>
            
            {showAddModal && (
                <AddMovieModal onClose={() => setShowAddModal(false)} currentUser={selectedUser} />
            )}
            
            {showListModal && (
                <MovieListModal 
                    movies={movies} 
                    onClose={() => setShowListModal(false)} 
                    onDelete={handleRemoveMovie}
                />
            )}
        </div>
    );
}

export default App;
