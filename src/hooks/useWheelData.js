import { useMemo } from 'react';

const useWheelData = (movies, selectedGenre) => {
    // Filter movies that are in the queue (not watched)
    const queuedMovies = useMemo(() => {
        return movies.filter(m => !m.status || m.status === 'queued');
    }, [movies]);

    // Derive available genres from queued movies
    const availableGenres = useMemo(() => {
        if (queuedMovies.length > 0) {
            const dbGenres = new Set();
            queuedMovies.forEach(m => {
                if (Array.isArray(m.genre)) {
                     m.genre.forEach(g => dbGenres.add(g));
                }
            });
            return Array.from(dbGenres);
        } 
        return []; // Return empty array if no queued movies
    }, [queuedMovies]);

    // Grouping Logic for Wheel (Movies + Collections)
    const { moviesInGenre, wheelItemsSet } = useMemo(() => {
        const filtered = queuedMovies.filter(m => m.genre.includes(selectedGenre));

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
    }, [queuedMovies, selectedGenre]);

    // Generate Final Wheel Items
    const effectiveMovieItems = useMemo(() => {
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

    return {
        queuedMovies,
        availableGenres,
        moviesInGenre,
        effectiveMovieItems
    };
};

export default useWheelData;
