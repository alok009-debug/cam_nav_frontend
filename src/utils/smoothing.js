/**
 * Low-pass filter to smooth compass heading.
 * Retains 90% of previous value + 10% new reading → smooth but responsive.
 */
export function smoothAngle(previous, current, factor = 0.15) {
    if (previous === null || previous === undefined) return current;

    // Handle 360-degree wrap-around
    let diff = current - previous;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    const smoothed = previous + diff * factor;

    // Normalize to 0-360
    return (smoothed + 360) % 360;
}