export const THE_BOIS = ["Foo", "Lex", "Yan", "Jer", "Brt", "Gustav"];

export const GENRE_COLORS = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#84CC16', // Lime
    '#10B981', // Emerald
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
    '#8B5CF6', // Violet
    '#D946EF', // Fuchsia
    '#F43F5E', // Rose
];

export const WHEEL_COLORS = [
    '#d946ef', // Neon Fuchsia
    '#8b5cf6', // Neon Violet
    '#06b6d4', // Neon Cyan
    '#f43f5e', // Neon Rose
    '#3b82f6', // Bright Blue
    '#10b981', // Emerald
    '#ec4899', // Pink
    '#f59e0b', // Amber
];

/* Animation & Timing */
export const ANIMATION = {
    DURATION: {
        DEFAULT: 0.3, // 300ms
        WHEEL_ENTRY: 0.8, // 800ms
        SPIN_BUTTON_TRANSITION: 1000, 
    },
    DELAY: {
        WHEEL_IMAGE_PRELOAD: 800, // 800ms
        RESULT_REVEAL: 1000,      // 1000ms
    },
    EASING: {
        WHEEL_ENTRY: [0.2, 0.8, 0.2, 1],
        DEFAULT: [0.4, 0, 0.2, 1],
    }
};

/* Wheel Configuration */
export const WHEEL_CONFIG = {
    DEFAULT_SIZE: 1500,
    REFERENCE_SIZE: 1200, // Used for scaling calculations
    FONT_SIZE: {
        GENRE: 70,
        MOVIE: 24,
        CENTER_LABEL: 40,
    },
    PHYSICS: {
        FRICTION: 0.985,
        STOP_VELOCITY: 0.002,
        BASE_VELOCITY: 0.4,
        RANDOM_VELOCITY_FACTOR: 0.2, // Adds 0-0.2
    },
    DIMENSIONS: {
        OUTER_RIM_OFFSET: 15,
        INNER_RADIUS_OFFSET: 20,
        DONUT_INNER_MIN: 50,
        DONUT_INNER_DEFAULT: 80,
        POSTER_ASPECT_RATIO: 1.5,
        STROKE_WIDTH: 2,
        SHADOW_BLUR: 4,
        SHADOW_OFFSET_X: 1,
        SHADOW_OFFSET_Y: 1,
        CENTER_LABEL_PADDING: 5,
        LINE_HEIGHT_OFFSET: 4,
        INNER_RING_SIZE: 80,
    },
    COLORS: {
        OUTER_RIM_START: '#1e1b4b',
        OUTER_RIM_MID: '#4c1d95',
        OUTER_RIM_END: '#000',
        CENTER_BG: '#050511',
        STROKE: 'rgba(139, 92, 246, 0.5)',
        TEXT_SHADOW: "rgba(0,0,0,0.9)",
        SHINE_START: 'rgba(255,255,255,0.05)',
        SHINE_MID: 'rgba(255,255,255,0)',
        SHINE_END: 'rgba(255,255,255,0.02)',
        INNER_RING_FILL: 'rgba(0,0,0,0.3)',
        STROKE_LIGHT: 'rgba(255,255,255,0.1)',
        STROKE_DARK: 'rgba(0,0,0,0.5)',
    },
    COLOR_ADJUSTMENT: {
        DARKEN_AMOUNT: -40,
    }
};

/* TMDB API Settings */
export const TMDB_CONFIG = {
    IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/',
    POSTER_SIZE: 'w780',
};
