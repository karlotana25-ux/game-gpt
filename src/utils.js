export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function cloneStats(stats) {
  return {
    strength: Number(stats.strength) || 0,
    agility: Number(stats.agility) || 0,
    dexterity: Number(stats.dexterity) || 0,
    vitality: Number(stats.vitality) || 0,
    intelligence: Number(stats.intelligence) || 0
  };
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
