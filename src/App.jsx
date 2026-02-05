import React, { useState, useEffect } from 'react';
import WheelCanvas from './components/WheelCanvas';
import AddMovieModal from './components/AddMovieModal';
import MovieListModal from './components/MovieListModal';
import { supabase } from './utils/supabaseClient';
import './index.css';

const THE_BOIS = ["Foo", "Lex", "Yan", "Jer", "Brt", "Gustav"];

const parseGenre = (genreData) => {
    if (!genreData) return [];
    if (Array.isArray(genreData)) return genreData;
    if (typeof genreData === 'string') {
        if (genreData.startsWith('[') || genreData.startsWith('{')) {
            try {
                const parsed = JSON.parse(genreData);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                // ignore
            }
        }
        return [genreData]; // Treat as single genre
    }
    return [];
};

function App() {
    const [phase, setPhase] = useState('genre'); // genre | movies | result
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [spinTrigger, setSpinTrigger] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showListModal, setShowListModal] = useState(false);
    
    // Data
    const [movies, setMovies] = useState([]);
    const [availableGenres, setAvailableGenres] = useState([]);
    const [selectedUser, setSelectedUser] = useState(localStorage.getItem('movieUser') || '');

    useEffect(() => {
        fetchMovies();

        // Realtime subscription
        const subscription = supabase
            .channel('public:movies')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'movies' }, (payload) => {
                if (payload.new.status === 'queued' || !payload.new.status) {
                    const normalized = { ...payload.new, genre: parseGenre(payload.new.genre) };
                    setMovies(prev => [...prev, normalized]);
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'movies' }, (payload) => {
                // If it was updated to something other than queued, remove it
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
            // Extract unique genres from DB movies (already normalized)
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
        // Filter where status is 'queued' OR status is null (for backward compatibility if migration script missed some or default didn't apply)
        const { data, error } = await supabase
            .from('movies')
            .select('*')
            .or('status.eq.queued,status.is.null');

        if (error) {
            console.error('Error fetching movies:', error);
        } else {
            // Normalize genres immediately
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

    const onGenreSpinEnd = (genre) => {
        setSelectedGenre(genre);
        setTimeout(() => {
            setPhase('movies');
            setSpinTrigger(0); // Reset trigger so it doesn't auto-spin next wheel
        }, 1500);
    };

    const onMovieSpinEnd = (movieObj) => {
        const resultText = movieObj.title; // The wheel returns an object { title: "Text" } or just text depending on impl, but here we passed { title: item } so it has .title
        
        setTimeout(() => {
            // Check if it's a collection first
            // We need to reconstruct the groups to find it, or search the flat list
            // Optimization: Find if any movie has this collection_name
            const collectionMatch = movies.filter(m => {
                 const isGenreMatch = m.genre.includes(selectedGenre);
                 return m.collection_name === resultText && isGenreMatch;
            });
            
            if (collectionMatch.length > 0) {
                // It is a collection!
                // Sort by release_date
                const sorted = [...collectionMatch].sort((a, b) => {
                    if (!a.release_date) return -1;
                    if (!b.release_date) return 1;
                    return new Date(a.release_date) - new Date(b.release_date);
                });
                // Pick first one (next in queue)
                setSelectedMovie(sorted[0]);
            } else {
                // Standalone movie
                const movie = movies.find(m => m.title === resultText);
                setSelectedMovie(movie); 
            }
            setPhase('result');
        }, 1000);
    };

    const reset = () => {
        setPhase('genre');
        setSelectedGenre(null);
        setSelectedMovie(null);
        setSpinTrigger(0); // Reset trigger to prevent auto-spin
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
            // Optimistic update
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
            // Optimistic update
            setMovies(prev => prev.filter(m => m.id !== movie.id));
        }
    };

    // Derived state for the current wheels
    const genreItems = availableGenres;
    
    // Grouping Logic for Wheel
    // 1. Filter by Genre
    const moviesInGenre = movies.filter(m => m.genre.includes(selectedGenre));

    // 2. Group by Collection
    const wheelItemsSet = new Set();
    moviesInGenre.forEach(m => {
        if (m.collection_name) {
            // If part of a collection, add the collection name
            wheelItemsSet.add(m.collection_name);
        } else {
            // If standalone, add the title
            wheelItemsSet.add(m.title);
        }
    });

    const effectiveMovieItems = wheelItemsSet.size > 0 ? Array.from(wheelItemsSet) : ["No Movies", "Add Some!"];

    return (
        <div className="app-container">
            <header className="mb-12 w-full">
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8 w-full">
                    <div className="relative">
                        <select 
                            value={selectedUser} 
                            onChange={handleUserChange}
                            className="appearance-none pl-6 pr-10 py-2.5 bg-slate-900/50 text-neon-secondary border border-neon-secondary/30 rounded-full text-sm font-semibold uppercase tracking-wider backdrop-blur-md transition-all duration-300 cursor-pointer outline-none hover:bg-neon-secondary/10 hover:border-neon-secondary hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] focus:bg-neon-secondary/10 focus:border-neon-secondary"
                        >
                            <option value="">Who are you?</option>
                            {THE_BOIS.map(boi => <option key={boi} value={boi}>{boi}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neon-secondary">
                          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <button className="secondary-btn flex items-center gap-2" onClick={() => setShowAddModal(true)}>
                            <span>+</span> Add Movie
                        </button>
                        <button className="secondary-btn" onClick={() => setShowListModal(true)}>
                            Queue ({movies.length})
                        </button>
                    </div>
                </div>
                
                <h1 className="text-6xl font-extrabold bg-gradient-to-br from-[#e879f9] via-neon-secondary to-[#22d3ee] bg-clip-text text-transparent mb-2 tracking-tighter drop-shadow-[0_0_15px_rgba(139,92,246,0.4)]">
                    NextUp
                </h1>
                <p className="text-text-muted text-lg font-light tracking-wide">
                    Spin to decide your movie night.
                </p>
            </header>

            <main className="w-full">
                {phase === 'genre' && (
                    <section className="animate-fadeScaleIn w-full flex flex-col items-center">
                        <h2 className="mb-8 font-normal text-3xl text-text-main">
                            {availableGenres.length > 0 ? "Pick a Genre" : "Add movies to start!"}
                        </h2>
                        
                        {availableGenres.length > 0 ? (
                            <div className="relative w-[400px] h-[400px] mx-auto mb-12 flex justify-center items-center drop-shadow-[0_0_30px_rgba(139,92,246,0.15)]">
                                <div className="pointer absolute -top-[25px] left-1/2 -translate-x-1/2 w-[40px] h-[50px] z-10 drop-shadow-md before:content-[''] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:w-[4px] before:h-full before:bg-gradient-to-b before:from-neon-accent before:to-white before:rounded-sm before:shadow-[0_0_10px_var(--neon-accent)] after:content-[''] after:absolute after:top-0 after:left-1/2 after:-translate-x-1/2 after:rotate-45 after:w-[20px] after:h-[20px] after:bg-bg-dark after:border-2 after:border-neon-accent after:rounded-md after:shadow-[0_0_10px_var(--neon-accent)]"></div>
                                <WheelCanvas 
                                    items={genreItems} 
                                    onSpinEnd={onGenreSpinEnd}
                                    spinTrigger={spinTrigger}
                                />
                                <button 
                                    onClick={handleSpin} 
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90px] h-[90px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#4c1d95,#000)] border-2 border-white/20 text-white font-extrabold text-xl tracking-widest cursor-pointer shadow-[0_0_0_4px_rgba(0,0,0,0.8),0_0_20px_rgba(139,92,246,0.5),inset_0_2px_10px_rgba(255,255,255,0.2)] z-20 flex items-center justify-center transition-all duration-300 hover:-translate-x-1/2 hover:-translate-y-1/2 hover:scale-105 hover:bg-[radial-gradient(circle_at_30%_30%,#6d28d9,#000)] hover:shadow-[0_0_0_4px_rgba(0,0,0,0.8),0_0_40px_var(--neon-primary),inset_0_2px_20px_rgba(255,255,255,0.4)] active:scale-95 active:shadow-[0_0_10px_var(--neon-primary)] after:content-[''] after:absolute after:-inset-[5px] after:rounded-full after:border-2 after:border-neon-primary after:opacity-0 after:animate-[pulse-ring_2s_infinite]"
                                >
                                    SPIN
                                </button>
                            </div>
                        ) : (
                            <div className="text-text-muted my-12 text-center text-base leading-relaxed">
                                <p>No genres available yet.</p>
                                <p>Click "+ Add Movie" to populate the wheel.</p>
                            </div>
                        )}
                    </section>
                )}

                {phase === 'movies' && (
                    <section className="fixed inset-0 w-full h-full pointer-events-none flex flex-col items-center justify-end z-0">
                         {/* Header for this phase - positioned absolutely at top or just floating */}
                         <div className="absolute top-[15%] w-full text-center pointer-events-auto z-10 animate-fadeScaleIn">
                             <h2 className="font-normal text-4xl text-text-main">
                                <span className="text-neon-primary font-bold drop-shadow-[0_0_10px_rgba(217,70,239,0.6)]">{selectedGenre}</span> Movies
                             </h2>
                             <p className="text-text-muted mt-2">Spin for your destiny</p>
                         </div>

                        {/* GIANT WHEEL CONTAINER */}
                        {/* 
                            We want a huge wheel that slides up from the bottom.
                            Let's make it 85vw width (max 1000px) but square aspect ratio 
                            Actually, let's fix pixels for consistent "giantness" regardless of screen.
                            1500px is good.
                            Position: center of wheel = slightly below bottom of screen?
                            User said "exposing only the top half". So center should be AT the bottom edge.
                        */}
                        <div className="animate-slideUpFixed relative pointer-events-auto mb-[-600px]"> 
                             {/* Spin Button floating above the wheel */}
                            <button 
                                onClick={handleSpin} 
                                className="absolute -top-[120px] left-1/2 -translate-x-1/2 w-[110px] h-[110px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#4c1d95,#000)] border-4 border-white/20 text-white font-extrabold text-2xl tracking-widest cursor-pointer shadow-[0_0_0_6px_rgba(0,0,0,0.8),0_0_30px_rgba(139,92,246,0.6),inset_0_2px_15px_rgba(255,255,255,0.2)] z-30 flex items-center justify-center transition-all duration-300 hover:-translate-x-1/2 hover:scale-110 hover:bg-[radial-gradient(circle_at_30%_30%,#6d28d9,#000)] hover:shadow-[0_0_0_6px_rgba(0,0,0,0.8),0_0_50px_var(--neon-primary),inset_0_2px_25px_rgba(255,255,255,0.4)] active:scale-95 active:shadow-[0_0_20px_var(--neon-primary)]"
                            >
                                SPIN
                            </button>

                             {/* Pointer */}
                             <div className="pointer-events-none absolute -top-[25px] left-1/2 -translate-x-1/2 w-[60px] h-[70px] z-20 drop-shadow-xl before:content-[''] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:w-[6px] before:h-full before:bg-gradient-to-b before:from-neon-accent before:to-white before:rounded-sm before:shadow-[0_0_15px_var(--neon-accent)] after:content-[''] after:absolute after:top-0 after:left-1/2 after:-translate-x-1/2 after:rotate-45 after:w-[30px] after:h-[30px] after:bg-bg-dark after:border-2 after:border-neon-accent after:rounded-md after:shadow-[0_0_15px_var(--neon-accent)]"></div>

                            <WheelCanvas 
                                items={effectiveMovieItems} 
                                onSpinEnd={(item) => onMovieSpinEnd({ title: item })}
                                spinTrigger={spinTrigger}
                                width={1200}
                                height={1200}
                            />
                        </div>
                    </section>
                )}

                {phase === 'result' && (
                    <div className="fixed inset-0 w-screen h-screen bg-[#050511]/70 backdrop-blur-md flex items-center justify-center z-[100] animate-[fadeIn_0.3s_ease]">
                        <div className="bg-slate-800/70 p-12 rounded-3xl text-center shadow-glass border border-glass-border max-w-[500px] w-[90%] animate-slideUp relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-neon-primary before:to-transparent">
                            <h3 className="text-base uppercase tracking-[3px] text-text-muted mb-2">You're watching:</h3>
                            {selectedMovie?.poster_path && (
                                <img 
                                    src={`https://image.tmdb.org/t/p/w500${selectedMovie.poster_path}`} 
                                    alt={selectedMovie.title} 
                                    className="w-[200px] rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] mb-6 border-2 border-glass-border mx-auto"
                                />
                            )}
                            <h1 className="text-5xl mb-10 leading-tight text-white drop-shadow-[0_0_20px_var(--neon-secondary)]">{selectedMovie?.title}</h1>
                            <div className="flex gap-4 justify-center">
                                <button onClick={markAsWatched} className="secondary-btn bg-neon-primary text-white border-none hover:bg-neon-primary hover:shadow-[0_0_20px_rgba(217,70,239,0.5)]">
                                    Mark Watched
                                </button>
                                <button onClick={reset} className="secondary-btn">
                                    Spin Again
                                </button>
                            </div>
                        </div>
                    </div>
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
