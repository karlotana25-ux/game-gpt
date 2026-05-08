import { useGameStore, partyManager } from './state.js';
import { GAME_CONFIG, FINAL_BOSS_COUNT } from './config.js';
import { clamp, pickRandom, cloneStats } from './utils.js';
import { CombatEngine } from './combat-engine.js';
import { createRoamingEnemyMesh, removeRoamingEnemyMesh, playerMesh } from './scene.js';
import { switchPhase, showToast, showBanner } from './ui.js';
import { appendBattleLog, renderBattlePanel } from './battle.js';
import { dom } from './dom.js';
import { GamePhase, Enemy, RoamingEnemy, BattleResult } from './types.js';

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
    vitality: 5 + level * 3 + (isBoss ? 10 : 0), // Higher for slimes
    intelligence: 2 + level + (isBoss ? 2 : 0)
  };

  const maxHp = stats.vitality * 12 + (isBoss ? 100 : 20);
  const maxMp = stats.intelligence * 5;

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
    goldReward: 15 + level * (isBoss ? 20 : 5),
    critBonus: isBoss ? 4 : 0,
    accuracyBonus: isBoss ? 8 : 0,
    guard: false,
    spriteKey: name.includes('Slime') ? 'slime' : undefined
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

export function spawnRoamingEnemies() {
  const state = useGameStore.getState();
  const config = GAME_CONFIG.world.roamingEnemies;
  const toSpawn = config.maxCount - state.roamingEnemies.length;
  if (toSpawn <= 0) return;

  const newEnemies: RoamingEnemy[] = [];
  for (let i = 0; i < toSpawn; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * config.spawnRadius;
    const position = {
      x: Math.cos(angle) * distance,
      z: Math.sin(angle) * distance
    };
    const enemy = buildEnemy(shouldSpawnBoss());
    const roamingEnemy: RoamingEnemy = {
      id: enemy.id,
      enemy,
      position,
      velocity: { x: 0, z: 0 },
      lastDirectionChange: Date.now(),
      spawnTime: Date.now()
    };
    newEnemies.push(roamingEnemy);
    createRoamingEnemyMesh(roamingEnemy);
  }
  useGameStore.setState({ roamingEnemies: [...state.roamingEnemies, ...newEnemies] });
}

export function updateRoamingEnemies(delta: number) {
  const state = useGameStore.getState();
  const config = GAME_CONFIG.world.roamingEnemies;
  const updatedEnemies = state.roamingEnemies.map(roaming => {
    let { position, velocity, lastDirectionChange } = roaming;
    const now = Date.now();
    if (now - lastDirectionChange > config.directionChangeInterval) {
      const angle = Math.random() * Math.PI * 2;
      velocity = {
        x: Math.cos(angle) * config.moveSpeed,
        z: Math.sin(angle) * config.moveSpeed
      };
      lastDirectionChange = now;
    }
    position.x += velocity.x * delta;
    position.z += velocity.z * delta;
    position.x = clamp(position.x, -GAME_CONFIG.world.mapHalfExtent + 1, GAME_CONFIG.world.mapHalfExtent - 1);
    position.z = clamp(position.z, -GAME_CONFIG.world.mapHalfExtent + 1, GAME_CONFIG.world.mapHalfExtent - 1);
    return { ...roaming, position, velocity, lastDirectionChange };
  });
  useGameStore.setState({ roamingEnemies: updatedEnemies });
}

export function checkRoamingEncounter() {
  const state = useGameStore.getState();
  if (state.phase !== GamePhase.EXPLORATION || state.battle) return;

  const playerPos = { x: playerMesh.position.x, z: playerMesh.position.z };
  for (const roaming of state.roamingEnemies) {
    const dist = Math.hypot(roaming.position.x - playerPos.x, roaming.position.z - playerPos.z);
    if (dist <= GAME_CONFIG.world.roamingEnemies.triggerDistance) {
      startBattle(roaming.enemy);
      removeRoamingEnemyMesh(roaming.id);
      useGameStore.setState({
        roamingEnemies: state.roamingEnemies.filter(e => e.id !== roaming.id)
      });
      break;
    }
  }
}

export function startBattle(enemy: Enemy) {
  const battle = {
    enemy,
    round: 1,
    log: [] as string[]
  };
  useGameStore.setState({ battle });
  // No mesh creation here; roaming enemy is already rendered
  switchPhase(GamePhase.BATTLE);
  appendBattleLog(`A ${enemy.isBoss ? "Boss" : "Monster"} appears: ${enemy.name}!`);
  appendBattleLog("Choose your action.");
  renderBattlePanel();
}

export function finishBattle(reason: BattleResult) {
  const state = useGameStore.getState();
  useGameStore.setState({ battle: null });
  // No mesh clearing; roaming enemy already removed

  const outcomes: Record<BattleResult, () => void> = {
    escape: () => {
      switchPhase(GamePhase.EXPLORATION);
      showToast("You escaped into the shadows.");
    },
    victory: () => {
      const leader = partyManager.getLeader();
      dom.endingTitle.textContent = "Slime Crisis Averted";
      dom.endingSummary.textContent = `${leader?.name || "The Party"} dissolved the slime core. The realm is safe.`;
      showBanner("The final seal breaks. Peace returns.");
      switchPhase(GamePhase.ENDING);
    },
    monster_win: () => {
      useGameStore.setState(s => ({ monstersDefeatedSinceBoss: s.monstersDefeatedSinceBoss + 1 }));
      switchPhase(GamePhase.EXPLORATION);
      showToast("The slime melts away.");
    },
    boss_win: () => {
      useGameStore.setState(s => ({
        bossesDefeated: s.bossesDefeated + 1,
        monstersDefeatedSinceBoss: 0
      }));
      unlockFreedHero();
      switchPhase(GamePhase.HUB);
    },
    party_defeat: () => {
      switchPhase(GamePhase.HUB);
      showToast("The party was engulfed! You wake up at the tavern.");
    }
  };

  outcomes[reason]?.();
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

