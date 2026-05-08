import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { PartyManager } from './party-manager.js';
import { GAME_CONFIG } from './config.js';
import { cloneStats } from './utils.js';
import type { GameState } from './types.js';

export const partyManager = new PartyManager(4);

export const useGameStore = create<GameState>()(devtools((set, get) => ({
  phase: 'main_menu',
  creation: {
    className: "Warrior",
    baseStats: cloneStats(GAME_CONFIG.classes.Warrior.baseStats),
    allocatedStats: cloneStats(GAME_CONFIG.classes.Warrior.baseStats),
    pointsRemaining: GAME_CONFIG.pointBuy.pool
  },
  gold: 130,
  bossesDefeated: 0,
  monstersDefeatedSinceBoss: 0,
  encounterRateMultiplier: 1,
  distanceSinceEncounter: 0,
  battle: null,
  roamingEnemies: []
}), { name: 'game-store' }));