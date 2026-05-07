import { useGameStore, partyManager } from './state.js';
import { GAME_CONFIG, FINAL_BOSS_COUNT } from './config.js';
import { clamp, pickRandom, cloneStats } from './utils.js';
import { CombatEngine } from './combat-engine.js';
import { createEnemyMesh, clearEnemyMesh } from './scene.js';
import { switchPhase, showToast, showBanner } from './ui.js';
import { appendBattleLog, renderBattlePanel } from './battle.js';
import { dom } from './dom.js';
import { GamePhase, Enemy } from './types.js';

export function triggerEncounterIfNeeded() {
  const state = useGameStore.getState();
  if (state.phase !== GamePhase.EXPLORATION || state.battle) {
    return;
  }
  const threshold = GAME_CONFIG.world.encounterDistance / state.encounterRateMultiplier;
  if (state.distanceSinceEncounter < threshold) {
    return;
  }
  useGameStore.setState({ distanceSinceEncounter: 0 });

  const baseChance = GAME_CONFIG.encounters.baseChance + state.bossesDefeated * GAME_CONFIG.encounters.scalePerBoss;
  const rolled = Math.random() < clamp(baseChance * state.encounterRateMultiplier, 0.07, 0.95);
  if (!rolled) {
    // updateExplorationHud(); call from ui
    return;
  }

  const enemy = buildEnemy(shouldSpawnBoss());
  startBattle(enemy);
}

export function buildEnemy(isBoss: boolean): Enemy {
  const state = useGameStore.getState();
  const difficultyBase = 1 + state.bossesDefeated * 2;
  const level = difficultyBase + randomInt(0, 2) + (isBoss ? 2 : 0);

  const name = isBoss
    ? GAME_CONFIG.enemies.bosses[Math.min(state.bossesDefeated, GAME_CONFIG.enemies.bosses.length - 1)]
    : pickRandom(GAME_CONFIG.enemies.regular);

  const stats = {
    strength: 5 + level * 2 + (isBoss ? 3 : 0),
    agility: 4 + level + (isBoss ? 2 : 0),
    dexterity: 4 + level + (isBoss ? 2 : 0),
    vitality: 5 + level * 2 + (isBoss ? 5 : 0),
    intelligence: 4 + level + (isBoss ? 4 : 0)
  };

  const maxHp = stats.vitality * 10 + stats.strength * 2 + (isBoss ? 40 : 12);
  const maxMp = stats.intelligence * 5 + (isBoss ? 16 : 0);

  return {
    id: `enemy-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name,
    isBoss,
    level,
    stats,
    hp: maxHp,
    maxHp,
    mp: maxMp,
    maxMp,
    goldReward: 18 + level * (isBoss ? 12 : 5),
    critBonus: isBoss ? 4 : 0,
    accuracyBonus: isBoss ? 8 : 0,
    guard: false
  };
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shouldSpawnBoss(): boolean {
  const state = useGameStore.getState();
  if (state.bossesDefeated >= FINAL_BOSS_COUNT) {
    return false;
  }
  const requiredMonsterWins = Math.max(2, 4 - state.bossesDefeated);
  if (state.monstersDefeatedSinceBoss >= requiredMonsterWins) {
    return true;
  }
  const randomBossChance = 0.05 + state.bossesDefeated * 0.03;
  return Math.random() < randomBossChance;
}

export function startBattle(enemy: Enemy) {
  const battle = {
    enemy,
    round: 1,
    log: [] as string[]
  };
  useGameStore.setState({ battle });
  createEnemyMesh(enemy.isBoss);
  switchPhase(GamePhase.BATTLE);
  appendBattleLog(`A ${enemy.isBoss ? "Boss" : "Monster"} appears: ${enemy.name}!`);
  appendBattleLog("Choose your action.");
  renderBattlePanel();
}

export function finishBattle(reason: string) {
  const state = useGameStore.getState();
  useGameStore.setState({ battle: null });
  clearEnemyMesh();

  if (reason === "escape") {
    switchPhase(GamePhase.EXPLORATION);
    showToast("You escaped.");
    return;
  }

  if (reason === "victory") {
    const leader = partyManager.getLeader();
    dom.endingTitle.textContent = "Final Boss Defeated";
    dom.endingSummary.textContent = `${leader ? leader.name : "Your party"} cleared the final boss with a full 4-member team. The realm is free.`;
    showBanner("The final seal breaks. Peace returns.");
    switchPhase(GamePhase.ENDING);
    return;
  }

  if (reason === "monster_win") {
    switchPhase(GamePhase.EXPLORATION);
    showToast("Victory. Continue exploring.");
    return;
  }

  if (reason === "boss_win") {
    switchPhase(GamePhase.HUB);
    showBanner("Boss defeated. A new hero has been freed.");
    return;
  }

  if (reason === "party_defeat") {
    switchPhase(GamePhase.HUB);
    showToast("Defeat. The tavern patched your wounds.");
    return;
  }
}

export function unlockFreedHero() {
  if (partyManager.members.length >= partyManager.maxMembers) {
    return null;
  }

  const currentClasses = new Set(partyManager.getClassNames());
  const missingClasses = Object.keys(GAME_CONFIG.classes).filter((className) => !currentClasses.has(className));
  if (!missingClasses.length) {
    return null;
  }

  const className = pickRandom(missingClasses);
  const baseStats = cloneStats(GAME_CONFIG.classes[className].baseStats);
  let pointsToSpend = GAME_CONFIG.pointBuy.pool;
  let safety = 120;
  while (pointsToSpend > 0 && safety > 0) {
    safety -= 1;
    const stat = pickRandom(Object.keys(GAME_CONFIG.classes.Warrior.baseStats) as (keyof typeof GAME_CONFIG.classes.Warrior.baseStats)[]);
    if (baseStats[stat] >= GAME_CONFIG.pointBuy.max) {
      continue;
    }
    baseStats[stat] += 1;
    pointsToSpend -= 1;
  }

  const randomName = pickRandom(GAME_CONFIG.heroNames);
  const heroName = `${randomName} the ${className}`;
  const newHero = partyManager.createMember(heroName, className, baseStats);
  const added = partyManager.addMember(newHero);
  if (!added) {
    return null;
  }
  showBanner(`Hero Freed: ${heroName}`);
  return newHero;
}

