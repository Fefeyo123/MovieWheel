import React from 'react';
import { motion } from 'framer-motion';

const Header = ({ 
    selectedUser, 
    onUserChange, 
    users, 
    onAddMovie, 
    onShowQueue, 
    queueCount, 
    isGenrePhase, 
    selectedGenre, 
    hasAvailableGenres 
}) => {
    return (
        <header className="mb-4 sm:mb-8 w-full z-50 relative px-4">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6 sm:mb-6 w-full animate-[fadeIn_0.5s_ease-out]">
                <motion.div 
                    className="relative group w-full sm:w-auto"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                    <select 
                        value={selectedUser} 
                        onChange={onUserChange}
                        className="appearance-none w-full sm:w-auto pl-6 pr-12 py-3 bg-white/5 text-neon-secondary border border-neon-secondary/30 rounded-full text-sm font-bold uppercase tracking-wider backdrop-blur-md transition-all duration-300 cursor-pointer outline-none hover:bg-neon-secondary/10 hover:border-neon-secondary hover:shadow-[0_0_20px_rgba(139,92,246,0.2)] focus:bg-neon-secondary/10 focus:border-neon-secondary"
                    >
                        <option value="">Who are you?</option>
                        {users.map(user => <option key={user} value={user}>{user}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neon-secondary transition-transform duration-300 group-hover:translate-x-1">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </motion.div>
                
                <div className="flex gap-4 w-full sm:w-auto justify-center">
                    <motion.button 
                        className="secondary-btn flex-1 sm:flex-none flex items-center justify-center gap-2 group" 
                        onClick={onAddMovie}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                        <span className="text-lg leading-none group-hover:scale-125 transition-transform duration-300">+</span> Add Movie
                    </motion.button>
                    <motion.button 
                        className="secondary-btn flex-1 sm:flex-none flex items-center justify-center gap-2" 
                        onClick={onShowQueue}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                        <span className="material-symbols-outlined text-[18px]">list</span>
                        Queue ({queueCount})
                    </motion.button>
                </div>
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-extrabold bg-gradient-to-br from-[#e879f9] via-neon-secondary to-[#22d3ee] bg-clip-text text-transparent mb-2 tracking-tighter drop-shadow-[0_0_15px_rgba(139,92,246,0.4)]">
                NextUp
            </h1>
            <p className="text-text-muted text-base sm:text-lg font-light tracking-wide">
                Spin to decide your movie night.
            </p>
            
            {/* Header Text Transition */}
            <div className={`transition-all duration-500 mt-4 sm:mt-8 ${!isGenrePhase ? 'opacity-0 translate-y-[-20px] pointer-events-none absolute w-full' : 'opacity-100 translate-y-0 relative'}`}>
                 <h2 className="font-normal text-2xl sm:text-3xl text-text-main">
                    {hasAvailableGenres ? "Pick a Genre" : "Add movies to start!"}
                </h2>
            </div>

            <div className={`transition-all duration-500 mt-2 ${isGenrePhase ? 'opacity-0 translate-y-[20px] pointer-events-none absolute w-full' : 'opacity-100 translate-y-0 relative'}`}>
                  <h2 className="font-normal text-3xl sm:text-4xl text-text-main">
                    <span className="text-neon-primary font-bold drop-shadow-[0_0_10px_rgba(217,70,239,0.6)]">{selectedGenre}</span> Movies
                 </h2>
            </div>
        </header>
    );
};

export default Header;
