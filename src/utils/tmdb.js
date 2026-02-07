const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export const searchMovies = async (query) => {
    if (!query) return [];
    
    // Pass query directly to allow specific matches (like hyphenated titles)
    // specific fixes should handle edge cases before calling this function
    const sanitizedQuery = query;

    try {
        const response = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(sanitizedQuery)}&include_adult=false&language=en-US&page=1`);
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error("TMDB Search Error:", error);
        return [];
    }
};

export const getGenres = async () => {
    try {
        const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
        const data = await response.json();
        // Convert to map for easy lookup if needed { id: 'Name' }
        return data.genres || [];
    } catch (error) {
        console.error("TMDB Genre Error:", error);
        return [];
    }
};

export const getMovieDetails = async (id) => {
    try {
        const response = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`);
        return await response.json();
    } catch (error) {
        console.error("TMDB Details Error:", error);
        return null;
    }
};

export const getCollectionDetails = async (id) => {
    try {
        const response = await fetch(`${BASE_URL}/collection/${id}?api_key=${API_KEY}`);
        return await response.json();
    } catch (error) {
        console.error("TMDB Collection Error:", error);
        return null;
    }
};

export const normalizeTmdbMovie = (movie, genresMap) => {
    // Map genre_ids to strings using the provided map
    const genres = (movie.genre_ids || []).map(id => genresMap[id]).filter(Boolean);
    
    return {
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        release_date: movie.release_date,
        genre: genres, // Array of strings
        original_language: movie.original_language,
        overview: movie.overview,
        vote_average: movie.vote_average,
        // Keep original IDs for reference if needed
        genre_ids: movie.genre_ids,
        popularity: movie.popularity
    };
};
