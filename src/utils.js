/**
 * @fileoverview Utility functions for common operations like clamping, cloning stats, random numbers, etc.
 */

/**
 * Clamps a value between min and max.
 * @param {number} value - The value to clamp.
 * @param {number} min - The minimum value.
 * @param {number} max - The maximum value.
 * @returns {number} The clamped value, ensuring it is within [min, max].
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Creates a deep copy of stats object, ensuring all values are numbers.
 * Defaults to 0 if value is missing or invalid.
 * @param {Object} stats - The stats object to clone, with properties strength, agility, dexterity, vitality, intelligence.
 * @returns {Object} A new stats object with numeric values.
 */
export function cloneStats(stats) {
  return {
    strength: Number(stats.strength) || 0,
    agility: Number(stats.agility) || 0,
    dexterity: Number(stats.dexterity) || 0,
    vitality: Number(stats.vitality) || 0,
    intelligence: Number(stats.intelligence) || 0
  };
}

/**
 * Generates a random integer between min and max inclusive.
 * Assumes min <= max; if not, behavior is undefined.
 * @param {number} min - The minimum value (inclusive).
 * @param {number} max - The maximum value (inclusive).
 * @returns {number} A random integer in [min, max].
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Picks a random element from an array.
 * Assumes arr is non-empty; if empty, returns undefined.
 * @param {Array} arr - The array to pick from.
 * @returns {*} A random element from the array, or undefined if array is empty.
 */
export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
