export const parseGenre = (genreData) => {
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
        return [genreData];
    }
    return [];
};

export const adjustColorBrightness = (col, amt) => {
    let usePound = false;
    if (col[0] === "#") {
        col = col.slice(1);
        usePound = true;
    }
    let num = parseInt(col, 16);
    let r = (num >> 16) + amt;
    if (r > 255) r = 255; else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt;
    if (b > 255) b = 255; else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt;
    if (g > 255) g = 255; else if (g < 0) g = 0;
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);
};

export const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(' ');
    let line = '';
    const lines = [];

    for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);

    let startY = y - ((lines.length - 1) * lineHeight) / 2;

    for(let k = 0; k < lines.length; k++) {
        ctx.fillText(lines[k], x, startY + (k * lineHeight));
    }
};

export const getIndexAtTop = (currentAngle, totalItems) => {
    const arc = (2 * Math.PI) / totalItems;
    let pointerAngle = (1.5 * Math.PI - currentAngle) % (2 * Math.PI);
    if (pointerAngle < 0) pointerAngle += 2 * Math.PI;

    return Math.floor(pointerAngle / arc);
};
