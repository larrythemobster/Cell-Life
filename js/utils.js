/** Clamps a value between a min and max. */
export function clamp(value, min, max) {
    if (typeof max === 'undefined') {
        return Math.max(min, value);
    }
    return Math.max(min, Math.min(value, max));
}

/** Generates a random number with a normal distribution (Box-Muller transform). */
export function randNorm(stdDev) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    return num * (stdDev || 1);
}

/** Shuffles an array in place (Fisher-Yates). */
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/** Calculates the squared distance between two points (faster than regular distance). */
export function getDistanceSq(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy;
}

/** Converts a color string (hsl or hex) to an rgba string. */
export function colorToRgba(colorString, alpha = 1) {
    if (colorString.startsWith('hsl')) {
        return colorString.replace(')', `, ${alpha})`).replace('hsl', 'hsla');
    }
    if (colorString.startsWith('#')) {
        let r = 0, g = 0, b = 0;
        if (colorString.length == 4) {
            r = "0x" + colorString[1] + colorString[1];
            g = "0x" + colorString[2] + colorString[2];
            b = "0x" + colorString[3] + colorString[3];
        } else if (colorString.length == 7) {
            r = "0x" + colorString[1] + colorString[2];
            g = "0x" + colorString[3] + colorString[4];
            b = "0x" + colorString[5] + colorString[6];
        }
        return `rgba(${+r},${+g},${+b},${alpha})`;
    }
    return colorString;
}