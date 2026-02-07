import { useMemo } from 'react';

const useMovieFiltering = (movies, filter, sortBy, viewMode) => {
    return useMemo(() => {
        // 0. Filter by View Mode (Queue vs Watched)
        let result = movies.filter(m => {
            if (viewMode === 'watched') {
                return m.status === 'watched';
            } else {
                return !m.status || m.status === 'queued';
            }
        });

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
    }, [movies, filter, sortBy, viewMode]);
};

export default useMovieFiltering;
