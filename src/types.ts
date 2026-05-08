export interface Stats {
  strength: number;
  agility: number;
  dexterity: number;
  vitality: number;
  intelligence: number;
}

export interface Weapon {
  id: string;
  name: string;
  bonuses: Partial<Stats>;
}

export interface Spell {
  id: string;
  name: string;
  mpCost: number;
  type: 'heal' | 'damage';
  power: number;
  requiresInt: number;
}

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

export type GamePhase = typeof GamePhase[keyof typeof GamePhase];

export interface CreationState {
  className: string;
  baseStats: Stats;
  allocatedStats: Stats;
  pointsRemaining: number;
}

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

export interface RoamingEnemy {
  id: string;
  enemy: Enemy;
  position: { x: number; z: number };
  velocity: { x: number; z: number };
  lastDirectionChange: number;
  spawnTime: number;
}

export type BattleResult = "escape" | "victory" | "monster_win" | "boss_win" | "party_defeat";

export interface BattleState {
  enemy: Enemy;
  round: number;
  log: string[];
}

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