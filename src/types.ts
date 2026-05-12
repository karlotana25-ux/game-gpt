/**
 * @fileoverview Type definitions for the game, including stats, characters, enemies, and game state.
 */

/** Interface for character stats (strength, agility, dexterity, vitality, intelligence). */
export interface Stats {
  strength: number;
  agility: number;
  dexterity: number;
  vitality: number;
  intelligence: number;
}

/** Interface for weapon items with stat bonuses. */
export interface Weapon {
  id: string;
  name: string;
  bonuses: Partial<Stats>;
}

/** Interface for spells with MP cost, type, power, and intelligence requirement. */
export interface Spell {
  id: string;
  name: string;
  mpCost: number;
  type: 'heal' | 'damage';
  power: number;
  requiresInt: number;
}

/** Interface for party members, including stats, equipment, spells, and combat state. */
export interface PartyMember {
  id: string;
  name: string;
  className: string;
  level: number;
  xp: number;
  baseStats: Stats;
  stats: Stats;
  maxHp: number;
  maxMp: number;
  hp: number;
  mp: number;
  equipment: { weapon: Weapon | null };
  spells: Spell[];
  guard: boolean;
}

/** Game phase constants for different screens/states in the game. */
export const GamePhase = {
  MAIN_MENU: 'main_menu',
  CHARACTER_CREATION: 'character_creation',
  LOAD: 'load',
  HUB: 'hub',
  EXPLORATION: 'exploration',
  BATTLE: 'battle',
  SHOP: 'shop',
  SETTINGS: 'settings',
  ENDING: 'ending',
  TAVERN: 'tavern'
} as const;

/** Type for game phases, derived from GamePhase object. */
export type GamePhase = typeof GamePhase[keyof typeof GamePhase];

/** Interface for character creation state, tracking class, stats allocation. */
export interface CreationState {
  className: string;
  baseStats: Stats;
  allocatedStats: Stats;
  pointsRemaining: number;
}

/** Interface for enemies, including stats, HP, rewards, and combat bonuses. */
export interface Enemy {
  id: string;
  name: string;
  isBoss: boolean;
  level: number;
  stats: Stats;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  goldReward: number;
  critBonus: number;
  accuracyBonus: number;
  guard: boolean;
  spriteKey?: string;
}

/** Interface for roaming enemies in exploration, with position, velocity, and timing. */
export interface RoamingEnemy {
  id: string;
  enemy: Enemy;
  position: { x: number; z: number };
  velocity: { x: number; z: number };
  lastDirectionChange: number;
  spawnTime: number;
}

/** Type for possible battle outcomes. */
export type BattleResult = "escape" | "victory" | "monster_win" | "boss_win" | "party_defeat";

/** Interface for battle state, tracking current enemy, round, and combat log. */
export interface BattleState {
  enemy: Enemy;
  round: number;
  log: string[];
}

/** Interface for the overall game state, used in Zustand store. */
export interface GameState {
  phase: GamePhase;
  creation: CreationState;
  gold: number;
  bossesDefeated: number;
  monstersDefeatedSinceBoss: number;
  encounterRateMultiplier: number;
  distanceSinceEncounter: number;
  battle: BattleState | null;
  roamingEnemies: RoamingEnemy[];
}